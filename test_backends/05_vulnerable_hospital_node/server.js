/**
 * ==============================================================================
 * 05_VULNERABLE_HOSPITAL_NODE — Healthcare Patient Portal & Medical Records System
 * ==============================================================================
 * Runtime: Node.js (v18+ / v20+ / v22+) & Express
 * Status: 🔴 HIGHLY VULNERABLE (CRITICAL & MAJOR FINDINGS)
 * Purpose: Tests ThreatLens File Upload Security, IDOR, Sensitive File Exposure,
 *          Insecure Cookies, and Brute-Force Rate Limiting capabilities.
 * 
 * CATALOG OF INJECTED VULNERABILITIES:
 * 1. [CRITICAL] Arbitrary File Upload without Extension / MIME Validation (CWE-434) — /api/medical-records/upload
 * 2. [HIGH] Insecure Direct Object References (IDOR) on Patient Records (CWE-639) — /api/patients/:id/records
 * 3. [HIGH] Exposed Database Backup & Config Files (CWE-552) — /backup.sql, /config.json, /debug
 * 4. [MEDIUM] Insecure Cookie Attributes (Missing HttpOnly & Secure) (CWE-1004 / CWE-614)
 * 5. [MEDIUM] Missing Rate Limiting on MFA / OTP Authentication (CWE-307) — /api/auth/verify-otp
 * 6. [LOW] Missing Security Headers (Clickjacking / MIME Sniffing) (CWE-1021 / CWE-693)
 * ==============================================================================
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8005;

const UPLOADS_DIR = path.join(__dirname, 'public_uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (allowing execution or direct retrieval of uploaded payloads)
app.use('/uploads', express.static(UPLOADS_DIR));

// Insecure CORS & Headers
app.use((req, res, next) => {
    // VULNERABILITY: Permissive CORS with credentials allowed
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.header('Server', 'ThreatLens-MedPortal/1.0.4 (Express/Node.js)');
    next();
});

// Mock Patient Medical Database (HIPAA Protected Health Information)
const PATIENTS = {
    "101": {
        id: 101,
        name: "John Doe",
        dob: "1984-05-12",
        bloodGroup: "O+",
        diagnosis: "Stage 2 Hypertension",
        ssn: "000-12-3456",
        prescriptions: ["Lisinopril 10mg", "Amlodipine 5mg"],
        notes: "Patient advised to reduce sodium intake."
    },
    "102": {
        id: 102,
        name: "Jane Smith",
        dob: "1992-11-23",
        bloodGroup: "A+",
        diagnosis: "Chronic Asthma",
        ssn: "111-22-3333",
        prescriptions: ["Albuterol Inhaler", "Montelukast 10mg"],
        notes: "Routine allergy follow-up scheduled."
    },
    "103": {
        id: 103,
        name: "VIP Senator Robert Vance",
        dob: "1960-03-15",
        bloodGroup: "AB-",
        diagnosis: "Confidential Cardiology Treatment & Pacemaker",
        ssn: "999-00-8888",
        prescriptions: ["Atorvastatin 40mg", "Metoprolol 50mg"],
        notes: "HIGH CONFIDENTIALITY — Executive VIP Ward"
    }
};

const ACTIVE_OTPS = {
    "101": "1234",
    "102": "5678",
    "103": "9999"
};


// ==============================================================================
// 🚨 VULNERABILITY #1 [CRITICAL]: Unrestricted Arbitrary File Upload
// ------------------------------------------------------------------------------
// • CWE: CWE-434 (Unrestricted Upload of File with Dangerous Type)
// • OWASP: A04:2021 - Insecure Design / Injection
// • Description: Accepts arbitrary file uploads via Base64 with zero extension validation,
//   zero MIME checking, and user-specified filenames.
// • Exploit Vector:
//   An attacker uploads a file named `webshell.js` or `exploit.html` with malicious code,
//   which is stored directly in `/public_uploads` and instantly accessible via `/uploads/webshell.js`.
// • Remediation: Enforce strict file extension whitelists (e.g. `.png`, `.jpg`, `.pdf`),
//   re-encode images, generate random server filenames (UUIDs), and store outside public web root.
// ==============================================================================
app.post('/api/medical-records/upload', (req, res) => {
    const { filename, fileContentBase64 } = req.body;

    if (!filename || !fileContentBase64) {
        return res.status(400).json({ error: "Missing 'filename' or 'fileContentBase64'" });
    }

    try {
        // VULNERABLE CODE: Directly using untrusted user filename & saving to web-accessible folder
        const targetPath = path.join(UPLOADS_DIR, filename);
        const fileBuffer = Buffer.from(fileContentBase64, 'base64');

        fs.writeFileSync(targetPath, fileBuffer);

        return res.json({
            success: true,
            message: "Medical report uploaded successfully",
            filename: filename,
            fileUrl: `/uploads/${filename}`,
            sizeBytes: fileBuffer.length
        });
    } catch (err) {
        return res.status(500).json({ error: "Upload failed", details: err.message });
    }
});


// ==============================================================================
// 🚨 VULNERABILITY #2 [HIGH]: Insecure Direct Object References (IDOR) on Patient Records
// ------------------------------------------------------------------------------
// • CWE: CWE-639 (Authorization Bypass Through User-Controlled Key)
// • OWASP: A01:2021 - Broken Access Control
// • Description: Any authenticated user or unauthenticated request can view full
//   medical histories, diagnoses, SSNs, and prescriptions simply by modifying the `:id` URL parameter.
// • Exploit Vector:
//   Standard patient accessing `GET /api/patients/103/records` exfiltrates Senator Vance's VIP medical files.
// ==============================================================================
app.get('/api/patients/:id/records', (req, res) => {
    const patientId = req.params.id;
    const record = PATIENTS[patientId];

    if (!record) {
        return res.status(404).json({ error: "Patient record not found" });
    }

    // VULNERABILITY: No session validation or ownership check
    return res.json({
        success: true,
        patientRecord: record
    });
});


// ==============================================================================
// 🚨 VULNERABILITY #3 [HIGH]: Sensitive Database Backup & System Files Exposure
// ------------------------------------------------------------------------------
// • CWE: CWE-552 (Files or Directories Accessible to External Parties)
// • OWASP: A05:2021 - Security Misconfiguration
// • Description: Unprotected routes exposing SQL database dumps, credentials, and debug endpoints.
// • Probed by ThreatLens: Sectest ExposureModule directly queries `/backup.sql`, `/dump.sql`, `/.env`, `/config.json`.
// ==============================================================================
app.get('/backup.sql', (req, res) => {
    const mockBackup = `
-- ThreatLens Hospital Database Dump
-- Host: internal-med-db.threatlens.local Database: hospital_production
-- Dump Date: 2026-08-18

DROP TABLE IF EXISTS "staff";
CREATE TABLE "staff" ("id" int, "username" varchar(50), "password_hash" varchar(255), "role" varchar(20));
INSERT INTO "staff" VALUES (1, 'chief_doctor', 'md5_5f4dcc3b5aa765d61d8327deb882cf99', 'admin');
INSERT INTO "staff" VALUES (2, 'nurse_mary', 'md5_e10adc3949ba59abbe56e057f20f883e', 'nurse');

DROP TABLE IF EXISTS "api_credentials";
CREATE TABLE "api_credentials" ("service" varchar(50), "api_key" varchar(255));
INSERT INTO "api_credentials" VALUES ('EPIC_EMR_INTEGRATION', 'epic_live_sec_key_998877665544332211');
    `;
    res.setHeader('Content-Type', 'application/sql');
    return res.send(mockBackup);
});

app.get('/config.json', (req, res) => {
    return res.json({
        app_name: "ThreatLens Hospital Portal",
        environment: "production",
        db_connection: "postgres://med_admin:MedP@ssw0rd2026@10.0.1.50:5432/med_db",
        encryption_key: "hospital-insecure-static-key-321"
    });
});

app.get('/debug', (req, res) => {
    return res.json({
        debug_mode: true,
        active_sessions: Object.keys(PATIENTS).length,
        memory_usage: process.memoryUsage(),
        env_sample: {
            NODE_ENV: process.env.NODE_ENV || "development",
            PORT: PORT
        }
    });
});


// ==============================================================================
// 🚨 VULNERABILITY #4 & #5 [MEDIUM]: Insecure Cookies & Missing Rate Limiting on OTP
// ------------------------------------------------------------------------------
// • CWE: CWE-1004 (Sensitive Cookie Without 'HttpOnly' Flag)
// • CWE: CWE-307 (Improper Restriction of Excessive Authentication Attempts)
// • Description:
//   1) Sets session cookie without HttpOnly or Secure flags.
//   2) Login/OTP endpoint has no lockout or rate limiting, allowing rapid brute-forcing of 4-digit OTP.
// ==============================================================================
app.post('/api/auth/patient-login', (req, res) => {
    const { patientId } = req.body;
    if (!PATIENTS[patientId]) {
        return res.status(404).json({ error: "Invalid patient identifier" });
    }

    // VULNERABLE: Insecure Cookie setup (Readable by JavaScript XSS, transmitted over HTTP)
    res.setHeader('Set-Cookie', `session_token=med_session_${patientId}_xyz; Path=/; SameSite=None`);
    return res.json({
        success: true,
        message: "OTP sent to registered mobile number (Simulated OTP: check demo docs)"
    });
});

app.post('/api/auth/verify-otp', (req, res) => {
    const { patientId, otp } = req.body;

    // VULNERABLE: Unlimited brute-force attempts without rate limiting
    if (ACTIVE_OTPS[patientId] && ACTIVE_OTPS[patientId] === otp) {
        return res.json({
            success: true,
            message: "Authentication verified",
            patient: PATIENTS[patientId]
        });
    }

    return res.status(401).json({ success: false, message: "Invalid OTP code" });
});


app.get('/health', (req, res) => {
    res.json({ status: "vulnerable_hospital_active", runtime: "node", port: PORT });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[05_vulnerable_hospital_node] Listening on http://localhost:${PORT}`);
});
