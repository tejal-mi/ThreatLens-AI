# 🏥 05 - Vulnerable Hospital Portal Backend (Node.js)

**Target Port**: `http://localhost:8005`  
**Security Status**: 🔴 **HIGHLY VULNERABLE (CRITICAL / HIGH RISKS)**

---

## 📋 Overview
This Node.js/Express service simulates a healthcare patient portal and electronic medical records (EMR) system with critical Arbitrary File Uploads, IDOR on Protected Health Information (PHI), exposed SQL backup dumps, and missing authentication rate limits.

---

## 🚨 Catalog of Injected Vulnerabilities

| Severity | Vulnerability | Endpoint / Vector | CWE / OWASP |
|---|---|---|---|
| 🔴 **CRITICAL** | **Arbitrary File Upload** | `POST /api/medical-records/upload` | CWE-434 / A04:2021 |
| 🟠 **HIGH** | **IDOR on Medical Records (PHI)** | `GET /api/patients/:id/records` | CWE-639 / A01:2021 |
| 🟠 **HIGH** | **Exposed SQL Dumps & Configs** | `GET /backup.sql`, `GET /config.json` | CWE-552 / A05:2021 |
| 🟡 **MEDIUM** | **Insecure Session Cookie** | Missing `HttpOnly` and `Secure` | CWE-1004 / CWE-614 |
| 🟡 **MEDIUM** | **Missing Rate Limiting on OTP** | `POST /api/auth/verify-otp` | CWE-307 |
| 🔵 **LOW** | **Missing Security Headers** | Clickjacking / MIME Sniffing | CWE-1021 / CWE-693 |

---

## 🎯 ThreatLens Demo Attack Probes

### 1. Arbitrary File Upload Probe
```bash
# Upload a simulated webshell payload encoded in Base64
curl -X POST http://localhost:8005/api/medical-records/upload \
  -H "Content-Type: application/json" \
  -d '{"filename": "shell.js", "fileContentBase64": "Y29uc29sZS5sb2coJ1BXTkVEJyk7"}'

# Access the uploaded file directly
curl http://localhost:8005/uploads/shell.js
```

### 2. IDOR on Sensitive Patient Records (VIP Extraction)
```bash
curl http://localhost:8005/api/patients/103/records
```

### 3. Exposure Scanner Probe
```bash
curl http://localhost:8005/backup.sql
curl http://localhost:8005/config.json
```

---

## 🚀 How to Run
```bash
cd test_backends/05_vulnerable_hospital_node
npm install
npm start
```
