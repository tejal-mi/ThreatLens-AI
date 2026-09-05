# 🛡️ ThreatLens — by CodeSena

<div align="center">

```
  ████████╗██╗  ██╗██████╗ ███████╗ █████╗ ████████╗██╗     ███████╗███╗   ██╗███████╗  ██████╗  ██████╗ 
  ╚══██╔══╝██║  ██║██╔══██╗██╔════╝██╔══██╗╚══██╔══╝██║     ██╔════╝████╗  ██║██╔════╝ ██╔════╝ ██╔═══██╗
     ██║   ███████║██████╔╝█████╗  ███████║   ██║   ██║     █████╗  ██╔██╗ ██║███████╗ ██║  ███╗██║   ██║
     ██║   ██╔══██║██╔══██╗██╔══╝  ██╔══██║   ██║   ██║     ██╔══╝  ██║╚██╗██║╚════██║ ██║   ██║██║   ██║
     ██║   ██║  ██║██║  ██║███████╗██║  ██║   ██║   ███████╗███████╗██║ ╚████║███████║ ╚██████╔╝╚██████╔╝
     ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝╚══════╝╚═╝  ╚═══╝╚══════╝  ╚═════╝  ╚═════╝ 
```

**Next-Generation Offensive Security, Threat Intelligence & Automated Vulnerability Assessment Platform**

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue?logo=react)](https://reactjs.org/)
[![Ink](https://img.shields.io/badge/Ink-v5-purple?logo=terminal)](https://github.com/vadimdemedes/ink)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-ISC-brightgreen)](./LICENSE)

---

</div>

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Project Directory Structure](#-project-directory-structure)
- [ThreatLensGo TUI (Terminal Interface)](#-threatlensgo-tui-terminal-interface)
  - [Authentication Options](#authentication-options)
  - [Interactive Security Modules](#interactive-security-modules)
  - [Live Simulation Engine](#live-simulation-engine)
- [Security Test Engine (`sectest`)](#-security-test-engine-sectest)
- [Backend Services (`backend` & `cli-backend`)](#-backend-services)
- [Getting Started & Installation](#-getting-started--installation)
  - [Prerequisites](#prerequisites)
  - [1. Setting up ThreatLensGo TUI](#1-setting-up-threatlensgo-tui)
  - [2. Setting up Backend & Auth Engine](#2-setting-up-backend--auth-engine)
  - [3. Running Security Test Engine (`sectest`)](#3-running-security-test-engine-sectest)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [Security Notice & Disclaimer](#-security-notice--disclaimer)
- [Credits & Team](#-credits--team)

---

## 🚀 Overview

**ThreatLens** (engineered by **CodeSena**) is a unified offensive security audit platform designed for DevSecOps engineers, penetration testers, and security auditors. It provides deep repository secret scanning, dynamic vulnerability probing, load stress testing, and real-time telemetry assessment through an OpenCode-inspired animated Terminal User Interface (TUI) and high-performance Python microservices.

---

## ⚡ Key Features

| Category | Capability | Description |
|---|---|---|
| **🎨 TUI Interface** | **OpenCode-Inspired Aesthetics** | Cyberpunk neon aesthetics, dynamic ANSI color waves, smooth braille spinners, and full-terminal responsive frame scaling. |
| **🔐 Authentication** | **OAuth 2.0 & Device Code Flow** | Fast browser verification via **GitHub OAuth**, **Google OAuth**, and standard operator credentials. |
| **🔍 Git Audit** | **Repository Vulnerability Scan** | Clone and audit public/private repositories for hardcoded API keys, leaked credentials, and known CVE dependencies. |
| **💥 DDoS Stress Testing** | **Traffic Concurrency Simulation** | Emulates **Flood**, **Slowloris-style socket exhaustion**, and **Burst-spike** traffic load profiles with custom duration controls. |
| **💉 SQL Injection (SQLi)** | **Database Exploitation Probing** | Multi-category fuzzing for **Error-based**, **Union-based**, and **Blind (boolean/time-based)** injection vulnerabilities. |
| **🛡️ Cross-Site Scripting (XSS)** | **Script Injection Analysis** | Probes query parameters, forms, and headers against **Reflected**, **Stored**, and **DOM-based** script injection sinks. |
| **📤 Data Exfiltration** | **Sensitive Disclosure Auditing** | Scans for API response leakages, unhandled debug endpoints (`/actuator`, `/debug`), and verbose error stack traces. |
| **🚦 Rate Limiting & Proxy** | **Traffic Throttle & Interception** | Validates HTTP 429 threshold enforcement and inspects/repeats proxied HTTP requests. |
| **📊 Live Telemetry** | **Simulated Execution Engine** | Live stepping progress bars, real-time probe status checkmarks, and structured telemetry reports. |

---

## 🏗 Architecture & Tech Stack

```mermaid
graph TD
    A[ThreatLensGo TUI (React 18 + Ink + TypeScript)] -->|Interactive Wizard| B(Navigation & Session State)
    A -->|OAuth Flow| C[Auth Service (FastAPI + tc_auth)]
    A -->|Live Simulation Runner| D[Telemetry & Progress Engine]
    
    E[sectest Engine (Python)] -->|Dynamic Probing| F[Target Web Application / API]
    E --> G[Injection Module]
    E --> H[Auth & Session Module]
    E --> I[Exposure & Leakage Module]
    E --> J[Rate Limit Module]
    E --> K[Security Headers Module]
    
    C -->|JWT / OAuth 2.0| L[(PostgreSQL Database)]
    M[Git Analysis Engine] -->|Secret & CVE Scans| N[Public Git Repositories]
```

### Technology Highlights:
- **TUI (Terminal User Interface)**: React 18, Ink 5, `ink-select-input`, `ink-text-input`, `ink-spinner`, TypeScript 5.5, `tsx`.
- **Backend & Auth Engine**: Python 3.10+, FastAPI, SQLAlchemy, PostgreSQL, `tc_auth`, Authlib, PyJWT, Uvicorn.
- **Security Engine (`sectest`)**: Python HTTPX, Requests, Socket probes, Regex threat matchers.
- **Frontend Web Dashboard**: React, Vite, Tailwind CSS, Lucide Icons, Shadcn UI.

---

## 📁 Project Directory Structure

```
ThreatLens/
├── tui/                         # ThreatLensGo Terminal User Interface
│   ├── src/
│   │   ├── components/          # Reusable UI & Animation components
│   │   │   ├── AnimatedLogo.tsx      # Smooth neon color-wave title banner
│   │   │   ├── AnimatedTip.tsx       # Rotating security tips carousel
│   │   │   ├── MultiSelect.tsx       # Reusable checkbox multi-select component
│   │   │   ├── ProgressBar.tsx       # Stepping live execution progress bar
│   │   │   ├── Select.tsx            # Custom styled keyboard selection menu
│   │   │   ├── SimulationRunner.tsx  # Live test execution & telemetry runner
│   │   │   └── TerminalLayout.tsx    # Master responsive terminal layout frame
│   │   ├── hooks/
│   │   │   └── useTerminalSize.ts    # Dynamic terminal columns/rows resize hook
│   │   ├── screens/             # Interactive screen wizards
│   │   │   ├── security/             # Penetration test wizards
│   │   │   │   ├── DdosScreen.tsx        # DDoS load simulation wizard
│   │   │   │   ├── ExfilScreen.tsx       # Data exfiltration scan wizard
│   │   │   │   ├── SecurityMenu.tsx      # Central security testing suite
│   │   │   │   ├── SqliScreen.tsx        # SQL injection assessment wizard
│   │   │   │   ├── TargetUrlScreen.tsx   # Target URL configuration screen
│   │   │   │   └── XssScreen.tsx         # Cross-site scripting scan wizard
│   │   │   ├── GitAnalysisScreen.tsx # Git repository audit screen
│   │   │   ├── LoginScreen.tsx       # OAuth (GitHub/Google) & Credential login
│   │   │   ├── MainMenu.tsx          # OpenCode-style prompt & command palette
│   │   │   ├── ProxyScreen.tsx       # Proxy interception & tampering module
│   │   │   └── RateLimitScreen.tsx   # Rate limiting threshold test module
│   │   ├── state/
│   │   │   ├── navigation.tsx        # Screen-stack router & navigation context
│   │   │   └── securitySession.tsx   # Shared target URL & test session context
│   │   ├── App.tsx              # Main TUI router wrapper
│   │   └── index.tsx            # TUI entry point
│   ├── package.json
│   └── tsconfig.json
├── sectest/                     # Python-based Security Testing Suite
│   ├── modules/                 # Modular vulnerability scan modules
│   │   ├── auth.py                  # Authentication & session flaw testing
│   │   ├── exposure.py              # Sensitive information disclosure probes
│   │   ├── headers.py               # Security response headers analyzer
│   │   ├── injection.py             # SQLi & command injection fuzzing
│   │   └── ratelimit.py             # Rate limit stress tester
│   ├── report/                  # JSON & Markdown report generators
│   └── cli.py                   # Sectest CLI runner
├── backend/                     # FastAPI core backend service
├── cli-backend/                 # Microservice API endpoints & analysis handlers
├── frontend/                    # Web application dashboard
├── config.py                    # Global backend environment configuration
└── main.py                      # FastAPI server bootstrap with OAuth routes
```

---

## 🖥 ThreatLensGo TUI (Terminal Interface)

### Authentication Options
When launching `ThreatLensGo`, operators can authenticate via:
1. **GitHub OAuth**: Fast device-code flow (`https://github.com/login/device` with code verification).
2. **Google OAuth**: Browser-based Single Sign-On (SSO) login.
3. **Operator Credentials**: Username & Password credentials with masked input.

### Interactive Security Modules
The OpenCode-style command palette allows rapid navigation via hotkeys (`/`, `Tab`, `↑↓`, `Enter`, `Esc`):
- **`/git` — Git Repository Analysis**: Audits repository commits and file trees for exposed private keys, tokens, and CVE dependencies.
- **`/target` — Target URL Setup**: Configures the active endpoint for the testing session (persisted across sub-modules).
- **`/ddos` — DDoS Simulation**: 4-step wizard selecting Attack Pattern, Concurrency Intensity, and Duration with custom duration overrides.
- **`/sqli` — SQL Injection**: Configures HTTP method (`GET`/`POST`), auto-discovery vs. custom param name, and injection categories (`Error-based`, `Union-based`, `Blind boolean/time`).
- **`/xss` — Cross-Site Scripting**: Multi-selects XSS categories (`Reflected`, `Stored`, `DOM-based`) and primary injection vectors.
- **`/exfil` — Data Exfiltration**: Scans API response disclosure, error leakage, debug endpoints (`/metrics`, `/env`), and header leaks.
- **`/ratelimit` — Rate Limiting**: Stress tests 429 Too Many Requests thresholds.
- **`/proxy` — Proxy Analysis**: Intercepts, inspects, and re-dispatches custom HTTP requests.

### Live Simulation Engine
Upon confirming test execution, ThreatLensGo initiates a live animated execution runner:
```
  ⚡ EXECUTING SQL INJECTION ASSESSMENT
  Target: https://staging.threatlens.io

  [████████████████████████░░░░░░░░░░] 68%
  › Dispatching payload matrix & inspecting responses...

  Live Telemetry Probes:
  ✔ Target endpoint handshake resolved (200 OK)
  ✔ Query string fuzzing completed (18 payloads)
  ✔ Response latency differentials analyzed
```

---

## 🔧 Getting Started & Installation

### Prerequisites
- **Node.js** (v18.0.0 or higher) & `npm`
- **Python** (v3.10 or higher) & `pip`
- **PostgreSQL** (optional, for backend session persistence)

---

### 1. Setting up ThreatLensGo TUI

```bash
# Navigate to the TUI directory
cd tui

# Install dependencies
npm install

# Build TypeScript
npm run build

# Start the interactive TUI application
npm start
```

For live development with auto-recompilation on save:
```bash
npm run dev
```

---

### 2. Setting up Backend & Auth Engine

```bash
# Navigate to project root
cd ..

# Install Python dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary tc_auth python-dotenv httpx pydantic

# Create .env file with your credentials (see Configuration section)
# Start the FastAPI authentication server
python main.py
```

---

### 3. Running Security Test Engine (`sectest`)

```bash
# Run security test suite against a target URL
python sectest/cli.py --target https://example.com --all

# Run specific vulnerability modules
python sectest/cli.py --target https://example.com --module injection
python sectest/cli.py --target https://example.com --module headers
python sectest/cli.py --target https://example.com --module ratelimit
```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the project root:

```env
# ======================================================
# JWT & Session Configuration
# ======================================================
JWT_SECRET_KEY="your-super-secret-jwt-key-change-this"
JWT_ALGORITHM="HS256"
JWT_SESSION_DURATION_DAYS="7"

# ======================================================
# OAuth 2.0 Configuration
# ======================================================
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:8000/auth/google/callback"

GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_REDIRECT_URI="http://localhost:8000/auth/github/callback"

# ======================================================
# SMTP Email Configuration
# ======================================================
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USERNAME="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_SENDER="ThreatLens Security <no-reply@threatlens.io>"
EMAIL_USE_TLS="true"
```

---

## ⚠️ Security Notice & Disclaimer

> [!IMPORTANT]
> **ThreatLensGo** is engineered strictly for authorized security auditing, penetration testing, educational research, and defensive hardening. Testing endpoints or repositories without explicit authorization from the asset owner is illegal and strictly prohibited. The authors and **CodeSena** assume no liability for misuse of this tool.

---

## 👥 Credits & Team

Engineered with ❤️ by **CodeSena** for the Hackathon Security Challenge.

- **Lead Developer**: Dev Sharma ([@dev47929](https://github.com/dev47929))
- **Team**: **CodeSena**
- **Repository**: [dev47929/ThreatLens](https://github.com/dev47929/ThreatLens)
