"""
==============================================================================
02_VULNERABLE_ECOMMERCE_PY — Vulnerable E-Commerce & Product Inventory API
==============================================================================
Framework: Flask (Python 3.10+)
Status: 🔴 HIGHLY VULNERABLE (CRITICAL & MAJOR FINDINGS)
Purpose: Designed for testing ThreatLens live vulnerability scanning & penetration testing modules.

CATALOG OF INJECTED VULNERABILITIES:
1. [CRITICAL] SQL Injection (CWE-89) — /api/products/search & /api/auth/login
2. [CRITICAL] OS Command Injection / RCE (CWE-78) — /api/tools/ping & /api/tools/traceroute
3. [CRITICAL] Insecure Deserialization via Pickle (CWE-502) — /api/cart/restore-session
4. [HIGH] Hardcoded Secrets & Cloud Keys (CWE-798) — Leaked AWS, Stripe, & JWT Secrets
5. [MEDIUM] Exposed Debug & Configuration Endpoints (CWE-215 / CWE-552) — /debug, /__debug__, /.env
6. [LOW] Missing Security Headers & Verbose Stack Trace Disclosure (CWE-693 / CWE-209)
==============================================================================
"""

import base64
import os
import pickle
import sqlite3
import subprocess
import traceback
from flask import Flask, jsonify, make_response, render_template_string, request

app = Flask(__name__)

# ==============================================================================
# 🚨 VULNERABILITY #4 [HIGH]: Hardcoded Cloud API Keys & Production Secrets
# ------------------------------------------------------------------------------
# • CWE: CWE-798 (Use of Hard-coded Credentials)
# • OWASP: A07:2021 - Identification and Authentication Failures
# • Description: Critical cloud provider tokens, payment gateway secrets, and
#   database credentials are embedded directly in source code instead of secure KMS/vaults.
# • Exploit Vector: Git analysis or memory extraction exposes live cloud infrastructure.
# • Remediation: Read secrets exclusively from OS environment variables or AWS Secrets Manager.
# ==============================================================================
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
STRIPE_SECRET_KEY = "sk_mock_live_51M000000000000000000000000"
JWT_STATIC_SECRET = "supersecret123"
DATABASE_URL = "postgres://admin:Password_12345!@production-db.internal:5432/ecommerce_db"

DB_PATH = "ecommerce.db"


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            email TEXT,
            is_admin INTEGER DEFAULT 0
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            category TEXT,
            price REAL,
            stock INTEGER
        )
    """)
    conn.commit()

    # Seed mock data
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO users (username, password, email, is_admin) VALUES ('admin', 'adminpassword123', 'admin@threatlens-shop.local', 1)")
        cursor.execute("INSERT INTO users (username, password, email, is_admin) VALUES ('john_doe', 'password123', 'john@gmail.com', 0)")
        cursor.execute("INSERT INTO products (name, category, price, stock) VALUES ('Cyberpunk Hoodie', 'Apparel', 79.99, 50)")
        cursor.execute("INSERT INTO products (name, category, price, stock) VALUES ('Mechanical Keyboard Pro', 'Hardware', 149.99, 20)")
        cursor.execute("INSERT INTO products (name, category, price, stock) VALUES ('Security USB Hardware Token', 'Security', 45.00, 100)")
        cursor.execute("INSERT INTO products (name, category, price, stock) VALUES ('ThreatLens Operator Cap', 'Apparel', 25.00, 75)")
        conn.commit()
    conn.close()


init_db()


# ==============================================================================
# 🚨 VULNERABILITY #6 [LOW]: Missing Security Headers & Information Leakage
# ------------------------------------------------------------------------------
# • CWE: CWE-693 (Protection Mechanism Failure)
# • Description: Missing CSP, HSTS, X-Frame-Options (Clickjacking vulnerability),
#   and X-Content-Type-Options.
# ==============================================================================
@app.after_request
def add_vulnerable_headers(response):
    # Missing Strict-Transport-Security, Content-Security-Policy, X-Frame-Options
    response.headers["Server"] = "Werkzeug/2.3.8 Python/3.10.12 (Ubuntu Linux)"
    response.headers["Access-Control-Allow-Origin"] = "*"  # Insecure CORS wildcard
    return response


# ==============================================================================
# 🚨 VULNERABILITY #1 [CRITICAL]: SQL Injection (SQLi)
# ------------------------------------------------------------------------------
# • CWE: CWE-89 (Improper Neutralization of Special Elements used in an SQL Command)
# • OWASP: A03:2021 - Injection
# • Description: Directly interpolates raw, untrusted user strings into SQLite query.
# • Exploit Vector:
#   1) Search Bypass: `GET /api/products/search?q=' OR '1'='1` (dumps all products)
#   2) Union Extraction: `GET /api/products/search?q=' UNION SELECT 1,username,password,id,is_admin FROM users--`
#   3) Auth Bypass: `POST /api/auth/login` with username: `admin' --` (logs in without password)
# • Remediation: Use parameterized queries: `cursor.execute("SELECT * FROM products WHERE name LIKE ?", (f"%{q}%",))`
# ==============================================================================
@app.route("/api/products/search", methods=["GET"])
def search_products():
    search_query = request.args.get("q", "")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # VULNERABLE CODE: Direct string concatenation in SQL statement
    raw_sql = f"SELECT id, name, category, price, stock FROM products WHERE name LIKE '%{search_query}%'"
    try:
        cursor.execute(raw_sql)
        rows = cursor.fetchall()
        products = [{"id": r[0], "name": r[1], "category": r[2], "price": r[3], "stock": r[4]} for r in rows]
        conn.close()
        return jsonify({"success": True, "query": search_query, "results": products, "executed_sql": raw_sql})
    except Exception as e:
        conn.close()
        # VULNERABILITY: Verbose SQL error message returned to attacker (error-based SQLi vector)
        return jsonify({"success": False, "error": str(e), "executed_sql": raw_sql}), 500


@app.route("/api/auth/login", methods=["POST"])
def vulnerable_login():
    data = request.get_json(silent=True) or request.form
    username = data.get("username", "")
    password = data.get("password", "")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # VULNERABLE CODE: SQL Injection in authentication query allows bypassing credentials
    raw_sql = f"SELECT id, username, email, is_admin FROM users WHERE username = '{username}' AND password = '{password}'"
    try:
        cursor.execute(raw_sql)
        user = cursor.fetchone()
        conn.close()

        if user:
            return jsonify({
                "success": True,
                "message": "Login successful",
                "user": {"id": user[0], "username": user[1], "email": user[2], "is_admin": bool(user[3])},
                "token": f"mock-token-for-{user[1]}"
            })
        return jsonify({"success": False, "message": "Invalid username or password"}), 401
    except Exception as e:
        conn.close()
        # Returns verbose operational error
        return jsonify({"success": False, "error": f"sqlite3.OperationalError: {str(e)}"}), 500


# ==============================================================================
# 🚨 VULNERABILITY #2 [CRITICAL]: OS Command Injection / Remote Code Execution (RCE)
# ------------------------------------------------------------------------------
# • CWE: CWE-78 (Improper Neutralization of Special Elements used in an OS Command)
# • OWASP: A03:2021 - Injection
# • Description: Passes unsanitized user query parameter directly to `subprocess.check_output`
#   with `shell=True`.
# • Exploit Vector:
#   `POST /api/tools/ping` with JSON `{"host": "127.0.0.1; whoami; cat /etc/passwd"}`
#   or `{"host": "127.0.0.1 && dir"}`
# • Remediation: Use `subprocess.run(["ping", "-c", "2", host], shell=False)` after strict IP validation.
# ==============================================================================
@app.route("/api/tools/ping", methods=["POST", "GET"])
def network_ping_tool():
    if request.method == "POST":
        data = request.get_json(silent=True) or request.form
        host = data.get("host", "127.0.0.1")
    else:
        host = request.args.get("host", "127.0.0.1")

    # VULNERABLE CODE: OS Command Injection via shell=True string concatenation
    cmd = f"ping -n 1 {host}" if os.name == "nt" else f"ping -c 1 {host}"
    try:
        output = subprocess.check_output(cmd, shell=True, stderr=subprocess.STDOUT, timeout=5).decode(errors="replace")
        return jsonify({"success": True, "command": cmd, "output": output})
    except subprocess.CalledProcessError as e:
        return jsonify({"success": False, "command": cmd, "output": e.output.decode(errors="replace")}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ==============================================================================
# 🚨 VULNERABILITY #3 [CRITICAL]: Insecure Deserialization via Python Pickle
# ------------------------------------------------------------------------------
# • CWE: CWE-502 (Deserialization of Untrusted Data)
# • OWASP: A08:2021 - Software and Data Integrity Failures
# • Description: Accepts Base64 encoded byte payloads from client and runs `pickle.loads()`.
# • Exploit Vector:
#   An attacker crafts an exploit class with `__reduce__` method returning `os.system("calc.exe")`
#   or reverse shell. Deserializing instantly executes arbitrary python code inside the server process.
# • Remediation: Use safe serialization formats like JSON, MessagePack, or Protocol Buffers.
# ==============================================================================
@app.route("/api/cart/restore-session", methods=["POST"])
def restore_cart_session():
    data = request.get_json(silent=True) or {}
    session_payload = data.get("session_data", "")

    if not session_payload:
        return jsonify({"success": False, "message": "Missing 'session_data' base64 payload"}), 400

    try:
        # VULNERABLE CODE: Untrusted pickle deserialization executes arbitrary code
        raw_bytes = base64.b64decode(session_payload)
        deserialized_cart = pickle.loads(raw_bytes)
        return jsonify({
            "success": True,
            "message": "Cart session restored successfully",
            "cart": str(deserialized_cart)
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Deserialization error: {str(e)}"}), 500


# ==============================================================================
# 🚨 VULNERABILITY #5 [MEDIUM]: Exposed Debug & Server Configuration Endpoints
# ------------------------------------------------------------------------------
# • CWE: CWE-215 (Insertion of Sensitive Information into Debugging Code)
# • CWE: CWE-552 (Files or Directories Accessible to External Parties)
# • Description: Production endpoints exposing internal environment variables,
#   server memory tables, and configuration secrets to unauthorized callers.
# • Probed by ThreatLens: Sectest ExposureModule directly flags `/debug`, `/__debug__`, `/.env`.
# ==============================================================================
@app.route("/debug", methods=["GET"])
@app.route("/__debug__", methods=["GET"])
def exposed_debug_dashboard():
    debug_info = {
        "server_status": "DEBUG_ACTIVE",
        "environment": "development",
        "database": DATABASE_URL,
        "aws_credentials": {
            "AWS_ACCESS_KEY_ID": AWS_ACCESS_KEY_ID,
            "AWS_SECRET_ACCESS_KEY": AWS_SECRET_ACCESS_KEY[:8] + "****************"
        },
        "stripe_key": STRIPE_SECRET_KEY,
        "loaded_modules": list(os.environ.keys())[:10]
    }
    return jsonify(debug_info)


@app.route("/.env", methods=["GET"])
def exposed_dotenv_file():
    # Directly simulates leaked .env configuration file on root
    content = (
        "APP_ENV=production\n"
        "DEBUG=true\n"
        f"DATABASE_URL={DATABASE_URL}\n"
        f"AWS_ACCESS_KEY_ID={AWS_ACCESS_KEY_ID}\n"
        f"AWS_SECRET_ACCESS_KEY={AWS_SECRET_ACCESS_KEY}\n"
        f"STRIPE_SECRET_KEY={STRIPE_SECRET_KEY}\n"
        f"JWT_SECRET={JWT_STATIC_SECRET}\n"
    )
    resp = make_response(content, 200)
    resp.mimetype = "text/plain"
    return resp


# ==============================================================================
# 🚨 VULNERABILITY #6 (Cont.): Verbose Global Exception Traceback Disclosure
# ------------------------------------------------------------------------------
# • CWE: CWE-209 (Generation of Error Message Containing Sensitive Information)
# • Description: Unhandled exceptions leak full Python stack traces and file paths.
# ==============================================================================
@app.errorhandler(500)
def handle_internal_error(e):
    return jsonify({
        "status": "error",
        "error_type": type(e).__name__,
        "traceback": traceback.format_exc()
    }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8002, debug=False)
