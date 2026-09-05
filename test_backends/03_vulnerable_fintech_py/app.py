"""
==============================================================================
03_VULNERABLE_FINTECH_PY — Vulnerable Digital Wallet & Banking API
==============================================================================
Framework: FastAPI (Python 3.10+)
Status: 🟠 VULNERABLE (HIGH & MEDIUM RISKS)
Purpose: Tests SSRF, Path Traversal, IDOR, and Rate-Limiting bypass capabilities of ThreatLens.

CATALOG OF INJECTED VULNERABILITIES:
1. [HIGH] Server-Side Request Forgery (SSRF) (CWE-918) — /api/v1/webhook/test & /api/v1/fetch-avatar
2. [HIGH] Path Traversal / Arbitrary File Read (CWE-22) — /api/v1/statements/download
3. [HIGH] Insecure Direct Object References (IDOR) (CWE-639) — /api/v1/accounts/{account_id}/balance
4. [MEDIUM] Missing Rate Limiting on Financial Operations (CWE-307 / CWE-799) — /api/v1/transfer & /api/v1/auth/pin-login
5. [MEDIUM] Verbose Exception Stack Trace Disclosure (CWE-209)
6. [LOW] Overly Permissive CORS Policy (CWE-942)
==============================================================================
"""

import os
import sqlite3
import traceback
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel

DB_PATH = "fintech.db"
STORAGE_DIR = os.path.abspath("statements_storage")

os.makedirs(STORAGE_DIR, exist_ok=True)
with open(os.path.join(STORAGE_DIR, "statement_2026_q1.txt"), "w", encoding="utf-8") as f:
    f.write("Account #1001 Q1 Statement: Starting Balance $50,000 | Ending Balance $58,200\n")


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY,
            account_number TEXT UNIQUE,
            owner_name TEXT,
            pin TEXT,
            balance REAL,
            ssn TEXT
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            from_account TEXT,
            to_account TEXT,
            amount REAL,
            status TEXT
        )
    """)
    conn.commit()

    cursor.execute("SELECT COUNT(*) FROM accounts")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO accounts VALUES (1001, 'ACC-1001', 'Alice Johnson', '1234', 58200.0, '987-65-4321')")
        cursor.execute("INSERT INTO accounts VALUES (1002, 'ACC-1002', 'Bob Smith', '5678', 1250.0, '123-45-6789')")
        cursor.execute("INSERT INTO accounts VALUES (1003, 'ACC-1003', 'VIP Enterprise Corp', '9999', 9500000.0, '555-00-1111')")
        conn.commit()
    conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="ThreatLens Vulnerable Fintech Microservice",
    description="Simulates financial API with SSRF, IDOR, Path Traversal, and Rate Limiting defects.",
    version="1.0.0",
    lifespan=lifespan
)


# ==============================================================================
# 🚨 VULNERABILITY #6 [LOW]: Overly Permissive CORS Policy
# ------------------------------------------------------------------------------
# • CWE: CWE-942 (Permissive Cross-origin Resource Sharing Policy)
# • OWASP: A05:2021 - Security Misconfiguration
# • Description: Wildcard origin with credential sharing enabled allows external
#   malicious websites to read authenticated financial responses via browser requests.
# ==============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # VULNERABLE: Wildcard origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# 🚨 VULNERABILITY #5 [MEDIUM]: Verbose Exception & Stack Trace Disclosure
# ------------------------------------------------------------------------------
# • CWE: CWE-209 (Generation of Error Message Containing Sensitive Information)
# • Description: Global exception handler dumps internal traceback and source code paths.
# ==============================================================================
@app.exception_handler(Exception)
async def verbose_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Unhandled internal fintech exception",
            "type": type(exc).__name__,
            "details": str(exc),
            "traceback": traceback.format_exc().splitlines()  # VULNERABILITY: Full stack leak
        }
    )


# --- Request Models ---
class PinLoginRequest(BaseModel):
    account_number: str
    pin: str


class TransferRequest(BaseModel):
    from_account: str
    to_account: str
    amount: float


class WebhookTestRequest(BaseModel):
    webhook_url: str


# ==============================================================================
# 🚨 VULNERABILITY #4 [MEDIUM]: Missing Rate Limiting on PIN Authentication & Transfers
# ------------------------------------------------------------------------------
# • CWE: CWE-307 (Improper Restriction of Excessive Authentication Attempts)
# • CWE: CWE-799 (Improper Control of Interaction Frequency)
# • Description: Endpoints lack request throttling, captcha, or account lockout.
# • Exploit Vector:
#   An automated script can brute-force the 4-digit PIN (0000-9999) in under 30 seconds
#   or flood the transfer queue with micro-transactions.
# • Remediation: Implement IP & account based rate limiting returning HTTP 429.
# ==============================================================================
@app.post("/api/v1/auth/pin-login", summary="Vulnerable PIN Login (No Rate Limiting)")
async def pin_login(data: PinLoginRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, owner_name, pin, balance FROM accounts WHERE account_number = ?", (data.account_number,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account number not found")

    acc_id, owner, correct_pin, balance = row
    if data.pin != correct_pin:
        # No counter, no lockout, no delay
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid PIN code")

    return {
        "success": True,
        "message": "Authentication successful",
        "account_id": acc_id,
        "owner": owner,
        "session_token": f"fintech-token-{acc_id}-xyz"
    }


# ==============================================================================
# 🚨 VULNERABILITY #3 [HIGH]: Insecure Direct Object Reference (IDOR)
# ------------------------------------------------------------------------------
# • CWE: CWE-639 (Authorization Bypass Through User-Controlled Key)
# • OWASP: A01:2021 - Broken Access Control
# • Description: Directly queries and returns account balances and sensitive SSNs
#   based solely on user-supplied `account_id` integer with zero authorization checks.
# • Exploit Vector:
#   Logged-in user with `account_id=1001` changes URL to `/api/v1/accounts/1003/balance`
#   to view VIP Enterprise Corp's multi-million dollar balance and SSN.
# • Remediation: Enforce RBAC/ABAC verifying `request.user.id == account_id`.
# ==============================================================================
@app.get("/api/v1/accounts/{account_id}/balance", summary="Get Account Details (IDOR Vulnerable)")
async def get_account_balance(account_id: int):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # VULNERABLE CODE: IDOR — No token check or owner authorization
    cursor.execute("SELECT id, account_number, owner_name, balance, ssn FROM accounts WHERE id = ?", (account_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")

    return {
        "account_id": row[0],
        "account_number": row[1],
        "owner_name": row[2],
        "balance": row[3],
        "ssn": row[4]  # SENSITIVE DATA EXPOSURE (PII)
    }


# ==============================================================================
# 🚨 VULNERABILITY #1 [HIGH]: Server-Side Request Forgery (SSRF)
# ------------------------------------------------------------------------------
# • CWE: CWE-918 (Server-Side Request Forgery)
# • OWASP: A10:2021 - Server-Side Request Forgery (SSRF)
# • Description: The application accepts arbitrary user URLs and executes backend
#   HTTP requests without restricting private subnets (127.0.0.1, 169.254.169.254, 10.0.0.0/8).
# • Exploit Vector:
#   1) Cloud Metadata: `POST /api/v1/webhook/test` with `{"webhook_url": "http://169.254.169.254/latest/meta-data/"}`
#   2) Internal Port Scan: `POST /api/v1/webhook/test` with `{"webhook_url": "http://127.0.0.1:8001/api/account/profile"}`
# • Remediation: Validate IP against a strict allowlist and reject loopback/private ranges.
# ==============================================================================
@app.post("/api/v1/webhook/test", summary="Test Webhook URL (SSRF Vulnerable)")
async def test_webhook(data: WebhookTestRequest):
    target_url = data.webhook_url

    try:
        # VULNERABLE CODE: Fetching arbitrary user-controlled URL without IP filtering
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            resp = await client.get(target_url)

        return {
            "success": True,
            "target_url": target_url,
            "status_code": resp.status_code,
            "response_headers": dict(resp.headers),
            "response_body_preview": resp.text[:500]
        }
    except Exception as e:
        return {
            "success": False,
            "target_url": target_url,
            "error": f"SSRF Request Failed: {str(e)}"
        }


# ==============================================================================
# 🚨 VULNERABILITY #2 [HIGH]: Path Traversal / Arbitrary File Inclusion (LFI)
# ------------------------------------------------------------------------------
# • CWE: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory)
# • OWASP: A01:2021 - Broken Access Control
# • Description: Directly joins user input `file` parameter without normalizing or
#   verifying base folder boundaries.
# • Exploit Vector:
#   `GET /api/v1/statements/download?file=../../../../Windows/win.ini`
#   or `GET /api/v1/statements/download?file=../../app.py`
# • Remediation: Strip path separators or check `os.path.commonpath([base_dir, target_file]) == base_dir`.
# ==============================================================================
@app.get("/api/v1/statements/download", summary="Download Statement (Path Traversal Vulnerable)")
async def download_statement(file: str = Query(..., description="Statement file name")):
    # VULNERABLE CODE: Path concatenation without sanitizing "../"
    file_path = os.path.join(STORAGE_DIR, file)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File not found at: {file_path}")

    try:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        return PlainTextResponse(content=content, media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/api/v1/transfer", summary="Execute Wallet Transfer")
async def execute_transfer(data: TransferRequest):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute("SELECT balance FROM accounts WHERE account_number = ?", (data.from_account,))
    sender = cursor.fetchone()
    if not sender or sender[0] < data.amount:
        conn.close()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient balance")

    cursor.execute("UPDATE accounts SET balance = balance - ? WHERE account_number = ?", (data.amount, data.from_account))
    cursor.execute("UPDATE accounts SET balance = balance + ? WHERE account_number = ?", (data.amount, data.to_account))
    cursor.execute("INSERT INTO transactions (from_account, to_account, amount, status) VALUES (?, ?, ?, 'COMPLETED')",
                   (data.from_account, data.to_account, data.amount))
    conn.commit()
    conn.close()

    return {"success": True, "message": f"Transferred ${data.amount} from {data.from_account} to {data.to_account}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
