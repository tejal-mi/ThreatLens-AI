# SecTest — CLI Security Testing Engine: How to Run

**SecTest** is a standalone, dynamic application security testing (DAST) CLI tool designed for locally hosted servers and microservices. It features local-only safety guards, 5 dynamic vulnerability fuzzing modules, AI-powered triage and AST remediation guidance (via Groq / OpenRouter LLMs), and an interactive local HTTP report server.

---

## 📋 Table of Contents

1. [Prerequisites & Installation](#1-prerequisites--installation)
2. [Environment Configuration](#2-environment-configuration)
3. [Quick Start Commands](#3-quick-start-commands)
4. [Available Security Modules](#4-available-security-modules)
5. [Command-Line Options & Flags](#5-command-line-options--flags)
6. [Advanced Input Configurations](#6-advanced-input-configurations)
7. [Running with ThreatLens Dashboard](#7-running-with-threatlens-dashboard)
8. [Testing Against Sample Vulnerable Backends](#8-testing-against-sample-vulnerable-backends)
9. [Troubleshooting & Safety Guard](#9-troubleshooting--safety-guard)

---

## 1. Prerequisites & Installation

Ensure you have **Python 3.10+** installed.

### Install Dependencies
From the repository root or your active Python virtual environment, install the required packages:

```bash
pip install typer rich httpx python-dotenv pydantic
```

---

## 2. Environment Configuration

SecTest uses LLMs (Groq / OpenRouter) to evaluate vulnerability severity (`critical`, `high`, `medium`, `low`, `info`), generate root cause explanations, and produce precise AST patch deltas.

Create or update a `.env` file in the project root:

```env
# LLM Provider: "groq" (default) or "openrouter"
LLM_PROVIDER=groq

# Groq API Key (Free, ultra-fast inference)
GROQ_API_KEY=gsk_your_groq_api_key_here
LLM_MODEL=llama-3.3-70b-versatile

# Alternatively, using OpenRouter:
# LLM_PROVIDER=openrouter
# OPENROUTER_API_KEY=sk-or-v1-your-key-here
# LLM_MODEL=meta-llama/llama-3.3-70b-instruct
```

> **Note**: If you do not have an LLM API key, you can pass `--no-llm` to run all security probes without AI enrichment.

---

## 3. Quick Start Commands

Run all SecTest commands from the workspace root directory using `python -m sectest.cli`:

### 1. List Available Security Modules
```bash
python -m sectest.cli list-checks
```

### 2. Basic Security Scan (Terminal Output)
```bash
python -m sectest.cli scan --target http://localhost:8000
```

### 3. Scan & Automatically Host Interactive Report Server
```bash
python -m sectest.cli scan --target http://localhost:8000 --serve
```
*Hosts the animated HTML report and JSON API on `http://127.0.0.1:8765` and opens your default browser.*

### 4. Scan and Export to JSON File
```bash
python -m sectest.cli scan --target http://localhost:8000 --out report.json
```

### 5. Scan and Export to Standalone HTML File
```bash
python -m sectest.cli scan --target http://localhost:8000 --html --out sectest_report.html
```

### 6. Scan Without LLM (Offline / Air-Gapped Mode)
```bash
python -m sectest.cli scan --target http://localhost:8000 --no-llm
```

### 7. Host a Previously Generated HTML Report
```bash
python -m sectest.cli serve sectest_report.html --port 8765
```

---

## 4. Available Security Modules

| Module Name | Type | Description |
|---|---|---|
| `headers` | Active | Checks for missing security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, CORS wildcard policies). |
| `exposure` | Active | Probes for exposed sensitive routes, stack traces, `.env`, `.git`, `/openapi.json`, `/docs`, `/admin`, and debug endpoints. |
| `auth` | Active | Tests protected routes for unauthenticated access, JWT signature verification bypass, and token tampering. |
| `injection` | Active | Probes query and body parameters for SQL Injection (SQLi), Cross-Site Scripting (XSS), and Command Injection vectors. |
| `ratelimit` | Opt-in | High-concurrency load testing (100 rapid requests) to verify HTTP 429 rate limiting on authentication routes. |

### Running Specific Checks Only:
Use the `-c` or `--checks` flag with comma-separated module names:
```bash
# Scan only headers and sensitive route exposures:
python -m sectest.cli scan -t http://localhost:8000 -c headers,exposure

# Scan only injection and auth modules:
python -m sectest.cli scan -t http://localhost:8000 -c injection,auth
```

---

## 5. Command-Line Options & Flags

### `scan` Command Flags

| Flag | Short | Default | Description |
|---|---|---|---|
| `--target` | `-t` | *(Required)* | Target base URL (e.g. `http://localhost:8000`, `http://127.0.0.1:3000`). |
| `--checks` | `-c` | `all` | Comma-separated module names to execute, or `all`. |
| `--out` | `-o` | `None` | Output report destination (`.json` or `.html`). |
| `--html` | | `False` | Generate an HTML report (`sectest_report.html`). |
| `--serve` | `-s` | `False` | Spin up local HTTP server to host report after scan. |
| `--port` | `-p` | `8765` | Port for the local report server. |
| `--open / --no-open` | | `--open` | Automatically open default browser when hosting. |
| `--auth-header` | | `None` | Custom Authorization header (e.g. `Bearer <jwt_token>`). |
| `--endpoints` | | `None` | Path to JSON file specifying custom routes to fuzz for injection. |
| `--auth-endpoint` | | `None` | Path to JSON file specifying login route for rate-limit testing. |
| `--no-llm` | | `False` | Skip LLM enrichment (sets all raw findings to `info`). |

---

## 6. Advanced Input Configurations

### Custom Endpoints Probing (`--endpoints`)
To instruct the `injection` module to fuzz specific application endpoints, create an `endpoints.json` file:

```json
[
  {
    "path": "/api/v1/users/search",
    "method": "GET",
    "params": ["query", "filter", "sort"]
  },
  {
    "path": "/api/v1/products",
    "method": "POST",
    "params": {
      "name": "string",
      "category_id": 1
    }
  }
]
```

Execute scan with custom endpoints:
```bash
python -m sectest.cli scan -t http://localhost:8000 --endpoints endpoints.json
```

### Rate Limit Target Specification (`--auth-endpoint`)
To test brute-force protection and rate limiting on a custom login route, create an `auth_endpoint.json` file:

```json
{
  "path": "/tc-auth/login/password",
  "method": "POST",
  "username_field": "email",
  "password_field": "password"
}
```

Execute scan with rate limiting probe:
```bash
python -m sectest.cli scan -t http://localhost:8000 -c ratelimit --auth-endpoint auth_endpoint.json
```

---

## 7. Running with ThreatLens Dashboard

The **ThreatLens Frontend Dashboard** (`http://localhost:3000/dashboard`) connects to SecTest's report server at `http://localhost:8765/report.json` and `http://localhost:8765/api/findings`.

To provide live vulnerability telemetry to your dashboard:

```bash
# 1. Run the scan and host the report on port 8765:
python -m sectest.cli scan --target http://localhost:8000 --out report.json --serve --port 8765
```

The ThreatLens SOC Dashboard will detect the live report server and display real-time vulnerability graphs, CWE distribution, and AST remediation diffs.

---

## 8. Testing Against Sample Vulnerable Backends

ThreatLens includes sample target backends under `test_backends/`:

### Step 1: Start a Vulnerable Target Backend
In a separate terminal, launch one of the sample test backends:
```bash
# Example: Vulnerable E-Commerce Backend (Port 5001)
python -m uvicorn test_backends.02_vulnerable_ecommerce_py.main:app --port 5001
```

### Step 2: Run SecTest Against the Target
```bash
python -m sectest.cli scan --target http://localhost:5001 --serve
```

SecTest will probe the server, detect SQL injection vectors, missing security headers, unauthenticated routes, and launch the interactive report.

---

## 9. Troubleshooting & Safety Guard

### ⛔ "Safety Guard Violation: Target Disallowed"
- **Reason**: SecTest has an automated safety guard that restricts scanning **strictly to localhost (`127.0.0.1`) and private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)**.
- **Fix**: Ensure your target URL begins with `http://localhost:<port>` or an internal private IP address. Public domains (e.g., `https://google.com`) are rejected to prevent unauthorized network scanning.

### ⚠️ "LLM API Key Missing"
- If you see a warning that `GROQ_API_KEY` is not found in `.env`, SecTest will fall back to rule-based severity assignment. Add your key to `.env` or use `--no-llm`.

### ⚠️ Port `8765` Already in Use
- SecTest automatically detects occupied ports and will bind to the next available port (e.g. `8766`). You can also specify `--port <number>` manually.
