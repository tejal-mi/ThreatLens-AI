/**
 * ==============================================================================
 * 04_VULNERABLE_SOCIAL_NODE — Vulnerable Social Media & Post Feed Backend
 * ==============================================================================
 * Runtime: Node.js (v18+ / v20+ / v22+) & Express
 * Status: 🔴 HIGHLY VULNERABLE (CRITICAL / HIGH SEVERITY FINDINGS)
 * Purpose: Used to validate ThreatLens JWT audit, XSS detection, Prototype Pollution,
 *          and JavaScript Code Injection probes during live judge assessment.
 * 
 * CATALOG OF INJECTED VULNERABILITIES:
 * 1. [CRITICAL] JWT "None" Algorithm & Weak Secret Bypass (CWE-287 / CWE-347) — /api/auth/profile
 * 2. [CRITICAL] Remote Code Execution via Dynamic eval() (CWE-95) — /api/feed/calculate-rank
 * 3. [HIGH] Cross-Site Scripting (Reflected & Stored XSS) (CWE-79) — /api/feed/search & /api/comments
 * 4. [HIGH] Object Prototype Pollution (CWE-1321) — /api/user/preferences
 * 5. [MEDIUM] SQL / Tag Injection (CWE-89) — /api/posts/filter
 * 6. [LOW] Information Disclosure & Missing Security Headers (CWE-693 / CWE-209)
 * ==============================================================================
 */

const express = require('express');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 8004;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Insecure CORS & Missing Security Headers
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('X-Powered-By', 'Express/4.19.2 (Node.js/v20.11.0)');
    next();
});

// Mock In-Memory Databases
const USERS = {
    "admin": { id: 1, username: "admin", role: "superadmin", email: "admin@social-lens.internal" },
    "bob_creator": { id: 2, username: "bob_creator", role: "creator", email: "bob@social-lens.internal" }
};

const POSTS = [
    { id: 1, author: "admin", content: "Welcome to ThreatLens Social Network!", tag: "announcements", likes: 1420 },
    { id: 2, author: "bob_creator", content: "Cybersecurity live demo is starting soon! 🚀", tag: "security", likes: 89 }
];

const COMMENTS = [
    { id: 1, postId: 1, author: "alice", text: "Great platform! Excited for the live demo." }
];

// ==============================================================================
// 🚨 VULNERABILITY #1 [CRITICAL]: Broken JWT Verification (None Algorithm & Weak Secret)
// ------------------------------------------------------------------------------
// • CWE: CWE-287 (Improper Authentication)
// • CWE: CWE-347 (Improper Verification of Cryptographic Signature)
// • OWASP: A07:2021 - Identification and Authentication Failures
// • Description: Accepts JWT tokens with `"alg": "none"` and skips signature checking entirely.
//   Also defaults to a weak dictionary secret `"secret"`.
// • Probed by ThreatLens: Sectest `AuthModule` specifically creates a test token with
//   `"alg": "none"` to verify token acceptance.
// • Exploit Vector:
//   An attacker can forge any payload `{"username": "admin", "role": "superadmin"}` with
//   header `{"alg": "none", "typ": "JWT"}` and sign with empty string to achieve full admin takeover.
// ==============================================================================
const JWT_WEAK_SECRET = "secret123";

function parseBase64Url(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    return JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
}

function verifyJwtInsecure(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error("Invalid token format");
    }

    const header = parseBase64Url(parts[0]);
    const payload = parseBase64Url(parts[1]);

    // VULNERABLE LOGIC: If algorithm is 'none' or missing, signature verification is bypassed!
    if (!header.alg || header.alg.toLowerCase() === 'none') {
        return payload; // Authentication bypassed!
    }

    // Verify HS256 with weak secret
    if (header.alg === 'HS256') {
        const expectedSig = crypto
            .createHmac('sha256', JWT_WEAK_SECRET)
            .update(`${parts[0]}.${parts[1]}`)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        if (parts[2] !== expectedSig) {
            throw new Error("Signature verification failed");
        }
        return payload;
    }

    throw new Error(`Unsupported algorithm: ${header.alg}`);
}

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.substring(7);
    try {
        req.user = verifyJwtInsecure(token);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Authentication failed", details: err.message });
    }
};


// ==============================================================================
// 🚨 VULNERABILITY #2 [CRITICAL]: Remote Code Execution via Dynamic eval()
// ------------------------------------------------------------------------------
// • CWE: CWE-95 (Improper Neutralization of Directives in Dynamically Evaluated Code)
// • OWASP: A03:2021 - Injection
// • Description: Passes untrusted user formula string directly to JavaScript `eval()`.
// • Exploit Vector:
//   `POST /api/feed/calculate-rank` with JSON `{"formula": "process.mainModule.require('child_process').execSync('whoami').toString()"}`
// • Remediation: Use safe expression parser (e.g. mathjs with sandboxing) or strictly hardcoded math logic.
// ==============================================================================
app.post('/api/feed/calculate-rank', (req, res) => {
    const { views = 100, likes = 50, formula = "likes * 2 + views" } = req.body;

    try {
        // VULNERABLE CODE: eval() executes arbitrary JavaScript inside Node process
        // eslint-disable-next-line no-eval
        const calculatedScore = eval(formula);
        return res.json({ success: true, formula, result: calculatedScore });
    } catch (err) {
        return res.status(400).json({ success: false, error: err.message, stack: err.stack });
    }
});


// ==============================================================================
// 🚨 VULNERABILITY #3 [HIGH]: Cross-Site Scripting (Reflected & Stored XSS)
// ------------------------------------------------------------------------------
// • CWE: CWE-79 (Improper Neutralization of Input During Web Page Generation)
// • OWASP: A03:2021 - Injection
// • Description: Reflects raw user input without HTML escaping, and serves stored comments.
// • Probed by ThreatLens: Sectest `InjectionModule` sends `<sectest-xss-probe>` in query params.
// • Exploit Vector:
//   `GET /api/feed/search?q=<script>alert(document.cookie)</script>` or `<sectest-xss-probe>`
// ==============================================================================
app.get('/api/feed/search', (req, res) => {
    const query = req.query.q || '';

    // VULNERABLE CODE: Directly returning unescaped query parameter in HTML response
    const htmlResponse = `
        <!DOCTYPE html>
        <html>
        <head><title>Search Results</title></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #fff; padding: 20px;">
            <h2>Search Results for: ${query}</h2>
            <div id="results">
                <p>Found 2 posts matching: <strong>${query}</strong></p>
            </div>
        </body>
        </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    return res.send(htmlResponse);
});

app.post('/api/comments', (req, res) => {
    const { postId, author = "anonymous", text } = req.body;
    if (!text) {
        return res.status(400).json({ error: "Missing comment text" });
    }

    // VULNERABLE: Storing unescaped user HTML script payload
    const newComment = { id: COMMENTS.length + 1, postId: Number(postId) || 1, author, text };
    COMMENTS.push(newComment);
    return res.json({ success: true, comment: newComment });
});

app.get('/api/comments', (req, res) => {
    return res.json({ success: true, comments: COMMENTS });
});


// ==============================================================================
// 🚨 VULNERABILITY #4 [HIGH]: Object Prototype Pollution
// ------------------------------------------------------------------------------
// • CWE: CWE-1321 (Improperly Controlled Modification of Object Prototype Attributes)
// • OWASP: A08:2021 - Software and Data Integrity Failures
// • Description: Unsafe recursive object merge function modifies `Object.prototype`
//   when keys like `__proto__` or `constructor` are supplied in JSON payloads.
// • Exploit Vector:
//   `POST /api/user/preferences` with `{"__proto__": {"isAdmin": true, "polluted": "yes"}}`
//   Pollutes every object across the entire Node.js runtime!
// ==============================================================================
function unsafeDeepMerge(target, source) {
    for (let key in source) {
        if (source[key] && typeof source[key] === 'object') {
            if (!target[key]) target[key] = {};
            // VULNERABLE: Does not sanitize __proto__, prototype, constructor
            unsafeDeepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

app.post('/api/user/preferences', (req, res) => {
    const userSettings = { theme: 'dark', notifications: true };
    const merged = unsafeDeepMerge(userSettings, req.body);

    const testObj = {};
    return res.json({
        success: true,
        message: "Preferences updated",
        settings: merged,
        prototypeCheck: {
            isAdmin: testObj.isAdmin || false,
            polluted: testObj.polluted || "clean"
        }
    });
});


// ==============================================================================
// 🚨 VULNERABILITY #5 [MEDIUM]: Mock SQL / Tag Query Injection
// ------------------------------------------------------------------------------
// • CWE: CWE-89 (SQL Injection)
// • Description: Unescaped string filtering vulnerable to injection probes.
// ==============================================================================
app.get('/api/posts/filter', (req, res) => {
    const tag = req.query.tag || '';
    const rawSqlEquivalent = `SELECT * FROM posts WHERE tag = '${tag}'`;

    // Filter logic simulating SQL WHERE evaluation
    if (tag.includes("' OR '1'='1") || tag.includes("' or '1'='1")) {
        // Simulating SQLi bypass returning all records
        return res.json({ success: true, executedQuery: rawSqlEquivalent, posts: POSTS });
    }

    const filtered = POSTS.filter(p => p.tag === tag);
    return res.json({ success: true, executedQuery: rawSqlEquivalent, posts: filtered });
});


// --- Auth & Profile Routes ---
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (USERS[username] && password === "password123") {
        // Generate JWT with weak secret
        const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString('base64url');
        const payload = Buffer.from(JSON.stringify(USERS[username])).toString('base64url');
        const sig = crypto.createHmac('sha256', JWT_WEAK_SECRET).update(`${header}.${payload}`).digest('base64url');
        return res.json({ token: `${header}.${payload}.${sig}`, user: USERS[username] });
    }
    return res.status(401).json({ error: "Invalid credentials" });
});

app.get('/api/auth/profile', authMiddleware, (req, res) => {
    return res.json({
        success: true,
        message: "Protected profile accessed",
        user: req.user
    });
});

app.get('/health', (req, res) => {
    res.json({ status: "vulnerable_demo_active", runtime: "node", port: PORT });
});

// Error handling leaking stack traces
app.use((err, req, res, next) => {
    res.status(500).json({ error: err.message, stack: err.stack });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[04_vulnerable_social_node] Listening on http://localhost:${PORT}`);
});
