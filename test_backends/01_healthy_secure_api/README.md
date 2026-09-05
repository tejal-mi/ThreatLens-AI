# 🛡️ 01 - Healthy Secure API (FastAPI Baseline)

**Target Port**: `http://localhost:8001`  
**Security Status**: 🟢 **100% HEALTHY / ZERO FINDINGS**

---

## 📋 Overview
This backend serves as the **Golden Reference Standard** for the ThreatLens live judge demonstration. It implements full enterprise-grade defense-in-depth protections against all OWASP Top 10 categories.

---

## 🔒 Security Implementations

| Control | Implementation | Threat Defense |
|---|---|---|
| **SQLi Defense** | Parameterized SQLite queries (`?` bindings) | Complete immunity against SQL Injection |
| **Authentication** | Cryptographically strong HS256 JWT + Expiry + PBKDF2 hashing | Prevents JWT forgery and dictionary attacks |
| **Security Headers** | Strict HSTS, CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff | Prevents Clickjacking, MIME sniffing, and XSS |
| **Rate Limiting** | Sliding window memory throttle (30 req/min) | Thwarts brute-force and Layer-7 flood DoS |
| **Path Traversal** | Canonical path validation (`os.path.abspath` prefix match) | Prevents arbitrary file retrieval |
| **Error Handling** | Sanitized generic JSON error responses | Prevents stack trace disclosure and reconnaissance |

---

## 🚀 How to Run
```bash
cd test_backends/01_healthy_secure_api
pip install -r requirements.txt
python app.py
```
*Accessible at: `http://localhost:8001/docs` or `http://localhost:8001/health`*
