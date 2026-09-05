import { Bug, Zap, Lock, Globe, FileCode, ShieldAlert, Cpu } from "lucide-react";

export const USER_REPOSITORIES = [
  {
    id: "threatlens-core",
    name: "ThreatLens-Core",
    fullName: "ThreatLens / ThreatLens-Core",
    description: "Core AST scanner, consensus engine, and polygon blockchain attestation layer",
    defaultBranch: "main",
    language: "Python / FastAPI",
    primaryColor: "#3b82f6",
    languages: [
      { name: "Python", pct: 58, color: "#3572A5" },
      { name: "JavaScript", pct: 24, color: "#f1e05a" },
      { name: "TypeScript", pct: 12, color: "#2b7489" },
      { name: "CSS", pct: 6, color: "#563d7c" },
    ],
    commitCount: 1428,
    fileCount: 342,
    size: "18.4 MB",
    securityScore: 98.4,
    grade: "A+",
    status: "healthy",
    vulnerabilitiesSummary: { critical: 0, high: 0, medium: 1, low: 1, total: 2 },
    lastScanDate: "10 mins ago",
    proofBlock: "#48,192",
    findings: [
      {
        id: "SEC-8044",
        module: "headers",
        title: "Missing Strict-Transport-Security (HSTS) Header",
        severity: "medium",
        status: "verified",
        sharing: "Public",
        size: "4 KB",
        date: "Today",
        icon: Globe,
        explanation: "The HTTP response does not enforce HTTPS connections via HSTS, making clients vulnerable to SSL stripping.",
        remediation: "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to response headers.",
        evidence: "Strict-Transport-Security header missing from response.",
        diffSnippet: "+ res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');",
        meta: { endpoint: "GET /tc-auth/config/pulse", cwe: "CWE-319", proof_hash: "0x1a88cf02931084ef77609a019488b710" }
      },
      {
        id: "SEC-8045",
        module: "exposure",
        title: "Exposed Sensitive Route: /openapi.json",
        severity: "low",
        status: "verified",
        sharing: "Public",
        size: "14 KB",
        date: "Yesterday",
        icon: FileCode,
        explanation: "Publicly accessible OpenAPI schema exposes internal endpoint schemas and parameter data types.",
        remediation: "Restrict OpenAPI and Swagger UI access to authenticated administrators in production.",
        evidence: "HTTP 200 OK received at /openapi.json.",
        diffSnippet: "- app = FastAPI(docs_url='/docs', openapi_url='/openapi.json')\n+ app = FastAPI(docs_url=None if IS_PROD else '/docs')",
        meta: { endpoint: "GET /openapi.json", cwe: "CWE-200", proof_hash: "0x66de1209871029384729102837461928" }
      }
    ],
    commits: [
      {
        hash: '7b19df33501a2ce08914efb900234acb7712aa90',
        shortHash: '7b19df3',
        author: 'Sarah Chen',
        authorEmail: 'sarah@threatlens.io',
        date: 'Yesterday',
        branch: 'security/jwt-rotation',
        message: 'refactor(jwt): implement RS256 asymmetric token signing with key rotation support',
        insertions: 38,
        deletions: 19,
        diff: `diff --git a/backend/utils/tokens.py b/backend/utils/tokens.py\n--- a/backend/utils/tokens.py\n+++ b/backend/utils/tokens.py\n@@ -10,7 +10,12 @@ def generate_jwt(user_id: str):\n-    return jwt.encode({"sub": user_id}, JWT_SECRET, algorithm="HS256")\n+    headers = {"kid": CURRENT_KEY_ID}\n+    return jwt.encode({"sub": user_id, "iss": "threatlens.io"}, PRIVATE_KEY, algorithm="RS256", headers=headers)`
      }
    ]
  },
  {
    id: "auth-module",
    name: "Auth-Identity-Service",
    fullName: "ThreatLens / Auth-Identity-Service",
    description: "OAuth 2.0, OTP email verification, session tokens, and RBAC authorization API",
    defaultBranch: "main",
    language: "Python / SQLAlchemy",
    primaryColor: "#06b6d4",
    languages: [
      { name: "Python", pct: 82, color: "#3572A5" },
      { name: "SQL", pct: 12, color: "#e38c00" },
      { name: "Shell", pct: 6, color: "#89e051" },
    ],
    commitCount: 640,
    fileCount: 128,
    size: "7.2 MB",
    securityScore: 82.0,
    grade: "B",
    status: "vulnerable",
    vulnerabilitiesSummary: { critical: 1, high: 1, medium: 0, low: 0, total: 2 },
    lastScanDate: "25 mins ago",
    proofBlock: "#48,190",
    findings: [
      {
        id: "SEC-8041",
        module: "injection",
        title: "SQL Injection Vector in User Query Filter",
        severity: "critical",
        status: "active",
        sharing: "Public",
        size: "150 rows",
        date: "Today",
        icon: Bug,
        explanation: "Unsanitized user input string was concatenated directly into PostgreSQL query builder clause allowing arbitrary database dump.",
        remediation: "Replace raw string template with parameterized prepared statement binding.",
        evidence: "Payload: ' OR '1'='1 returned HTTP 200 with 150 rows instead of 1.",
        diffSnippet: "- const query = `SELECT * FROM users WHERE org_id = '${req.body.orgId}'`;\n+ const query = `SELECT * FROM users WHERE org_id = $1`;",
        meta: { endpoint: "POST /api/v1/users/search", cwe: "CWE-89", proof_hash: "0x9f4a7c2e88b13904a0ef1982bca48192a0e" }
      },
      {
        id: "SEC-8042",
        module: "ratelimit",
        title: "Lack of Rate Limiting on Login Endpoint",
        severity: "high",
        status: "mitigated",
        sharing: "Public",
        size: "100 req/s",
        date: "Yesterday",
        icon: Zap,
        explanation: "Endpoint allowed 100 consecutive requests in 3 seconds without returning HTTP 429.",
        remediation: "Implement sliding window IP rate limiter (5 attempts / 60 seconds) with Redis or memory store.",
        evidence: "100/100 requests returned status 401 instead of 429.",
        diffSnippet: "+ app.use('/tc-auth/login', rateLimiter({ max: 5, windowMs: 60000 }));",
        meta: { endpoint: "POST /tc-auth/login/password", cwe: "CWE-307", proof_hash: "0x4e21a8d011f592cb1475e330a8901f44" }
      }
    ],
    commits: [
      {
        hash: '96e2a871b53c19d4902187f0bca711832049e211',
        shortHash: '96e2a87',
        author: 'Alex Vance',
        authorEmail: 'alex@threatlens.io',
        date: '10 minutes ago',
        branch: 'main',
        message: 'fix(auth): sanitize user input and replace raw string query in user login endpoint',
        insertions: 14,
        deletions: 8,
        diff: `diff --git a/backend/routes/auth.py b/backend/routes/auth.py\n--- a/backend/routes/auth.py\n+++ b/backend/routes/auth.py\n@@ -42,8 +42,14 @@ def login_handler(request: LoginRequest):\n-    query = f"SELECT * FROM users WHERE email = '{request.email}' AND password = '{request.password}'"\n-    user = db.execute(query).fetchone()\n+    query = "SELECT id, email, password_hash, role FROM users WHERE email = :email LIMIT 1"\n+    user = db.execute(text(query), {"email": request.email}).mappings().fetchone()`
      }
    ]
  },
  {
    id: "payment-gateway",
    name: "Payment-Billing-Gateway",
    fullName: "ThreatLens / Payment-Billing-Gateway",
    description: "Stripe and Paddle webhook verifiers, crypto payments, and billing audit logs",
    defaultBranch: "main",
    language: "Node.js / Express",
    primaryColor: "#a855f7",
    languages: [
      { name: "TypeScript", pct: 75, color: "#2b7489" },
      { name: "JavaScript", pct: 20, color: "#f1e05a" },
      { name: "JSON", pct: 5, color: "#292929" },
    ],
    commitCount: 380,
    fileCount: 84,
    size: "4.8 MB",
    securityScore: 94.2,
    grade: "A",
    status: "healthy",
    vulnerabilitiesSummary: { critical: 0, high: 1, medium: 0, low: 0, total: 1 },
    lastScanDate: "2 hours ago",
    proofBlock: "#48,188",
    findings: [
      {
        id: "SEC-8043",
        module: "auth",
        title: "Stripe Webhook Signature Bypass Vulnerability",
        severity: "high",
        status: "active",
        sharing: "Internal",
        size: "1 webhook",
        date: "Yesterday",
        icon: Lock,
        explanation: "Webhook handler accepted payload without validating stripe-signature HMAC-SHA256 header against secret.",
        remediation: "Wrap endpoint with stripe.webhooks.constructEvent using the raw request buffer before parsing JSON.",
        evidence: "POST /api/v1/billing/webhook accepted simulated payload with invalid signature header.",
        diffSnippet: "- const event = req.body;\n+ const event = stripe.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], STRIPE_SECRET);",
        meta: { endpoint: "POST /api/v1/billing/webhook", cwe: "CWE-347", proof_hash: "0x4e21a8d011f592cb1475e330a8901f44" }
      }
    ],
    commits: [
      {
        hash: '4e21a8d011f592cb1475e330a8901f443810c512',
        shortHash: '4e21a8d',
        author: 'Elena Rostov',
        authorEmail: 'elena@threatlens.io',
        date: '2 hours ago',
        branch: 'main',
        message: 'feat(billing): verify stripe webhook signature before processing checkout payload',
        insertions: 9,
        deletions: 2,
        diff: `diff --git a/backend/routes/billing.py b/backend/routes/billing.py\n--- a/backend/routes/billing.py\n+++ b/backend/routes/billing.py\n@@ -18,6 +18,13 @@ async def stripe_webhook(request: Request):\n+    payload = await request.body()\n+    sig_header = request.headers.get("stripe-signature")\n+    try:\n+        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)\n+    except stripe.error.SignatureVerificationError:\n+        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")`
      }
    ]
  },
  {
    id: "sectest-cli",
    name: "SecTest-Offensive-CLI",
    fullName: "ThreatLens / SecTest-Offensive-CLI",
    description: "Automated penetration testing CLI and high-concurrency vulnerability prober",
    defaultBranch: "main",
    language: "Go / Microservices",
    primaryColor: "#22c55e",
    languages: [
      { name: "Go", pct: 88, color: "#00ADD8" },
      { name: "Shell", pct: 12, color: "#89e051" },
    ],
    commitCount: 512,
    fileCount: 96,
    size: "6.1 MB",
    securityScore: 99.1,
    grade: "A+",
    status: "healthy",
    vulnerabilitiesSummary: { critical: 0, high: 0, medium: 0, low: 0, total: 0 },
    lastScanDate: "1 hour ago",
    proofBlock: "#48,191",
    findings: [],
    commits: [
      {
        hash: '1a88cf02931084ef77609a019488b710493811ef',
        shortHash: '1a88cf0',
        author: 'DevOps Lead',
        authorEmail: 'ops@threatlens.io',
        date: '3 days ago',
        branch: 'main',
        message: 'feat(proxy): configure token-bucket rate limiting (100 req/min/IP) on public API routes',
        insertions: 22,
        deletions: 4,
        diff: `diff --git a/nginx/nginx.conf b/nginx/nginx.conf\n--- a/nginx/nginx.conf\n+++ b/nginx/nginx.conf\n@@ -34,6 +34,10 @@ http {\n+    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;\n+    limit_conn_zone $binary_remote_addr zone=addr_limit:10m;`
      }
    ]
  },
  {
    id: "cloud-infra-k8s",
    name: "Cloud-Infra-K8s",
    fullName: "ThreatLens / Cloud-Infra-K8s",
    description: "Kubernetes helm charts, Terraform manifests, and zero-trust network policies",
    defaultBranch: "production",
    language: "HCL / YAML",
    primaryColor: "#f59e0b",
    languages: [
      { name: "HCL", pct: 60, color: "#844FBA" },
      { name: "YAML", pct: 35, color: "#cb171e" },
      { name: "Dockerfile", pct: 5, color: "#384d54" },
    ],
    commitCount: 210,
    fileCount: 62,
    size: "3.2 MB",
    securityScore: 91.5,
    grade: "A",
    status: "healthy",
    vulnerabilitiesSummary: { critical: 0, high: 0, medium: 1, low: 0, total: 1 },
    lastScanDate: "Yesterday",
    proofBlock: "#48,185",
    findings: [
      {
        id: "SEC-8046",
        module: "headers",
        title: "Permissive Wildcard CORS in Ingress Manifest",
        severity: "medium",
        status: "active",
        sharing: "Public",
        size: "1 ingress",
        date: "Yesterday",
        icon: Globe,
        explanation: "Ingress controller permitted wildcard '*' Origin while allow-credentials was set to true.",
        remediation: "Restrict allowed origins to explicit trusted subdomain list in helm values.yaml.",
        evidence: "ingress.annotations['cors-allow-origin'] = '*'",
        diffSnippet: "- cors-allow-origin: '*'\n+ cors-allow-origin: 'https://app.threatlens.io'",
        meta: { endpoint: "Ingress /api/*", cwe: "CWE-942", proof_hash: "0x66de1209ff44" }
      }
    ],
    commits: []
  }
];
