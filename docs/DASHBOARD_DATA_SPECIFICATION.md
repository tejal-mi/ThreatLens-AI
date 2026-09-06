# ThreatLens — Frontend Dashboard Data Specification & Backend Integration Guide

This document is the authoritative, field-by-field specification of all backend APIs, data models, request payloads, response payloads, and visual/interactive components for the **ThreatLens Frontend Dashboard**. Written from live source code as of 2026-08-18.

---

## Table of Contents

1. [Executive Overview & Architecture](#1-executive-overview--architecture)
2. [User Profile & Admin API (`/tc-auth/*`)](#2-user-profile--admin-api-tc-auth)
3. [Git & Commit Security Engine (`/repo/*`)](#3-git--commit-security-engine-repo)
4. [CLI-Backend Data Schemas](#4-cli-backend-data-schemas)
5. [SecTest Scanner Schema](#5-sectest-scanner-schema)
6. [Frontend Dashboard Views](#6-frontend-dashboard-views)
7. [Backend Parameter → Frontend UI Mapping Matrix](#7-backend-parameter--frontend-ui-mapping-matrix)
8. [Integration Notes & Resilience Guidelines](#8-integration-notes--resilience-guidelines)

---

## 1. Executive Overview & Architecture

ThreatLens is powered by three backend systems:

1. **Identity & Admin Backend** (`backend/AUTH_MODULE/tc_auth`): FastAPI + SQLAlchemy on port `8000`. Manages user profile, RBAC, sessions, OTP audit, and runtime config. All routes prefixed `/tc-auth`.

2. **Git & Commit Security Engine**:
   - **`cli-backend`** (local): Clones repos, runs `RepositoryAnalyzer` + `CommitAnalyzer`, pushes data via `POST /repo` and `POST /repo/{id}/commits`.
   - **`backend/GIT_MODULE`** (remote, port 8000): Stores repo/commit data in PostgreSQL, serves it to the frontend, and exposes an AI enrichment endpoint.

3. **SecTest Dynamic Scanner** (`sectest/`): HTTPX/socket vulnerability prober. Serves findings at `http://localhost:8765/report.json`.

```mermaid
graph TD
    CLI[cli-backend] -->|POST /repo, POST /repo/{id}/commits| GitAPI[GIT_MODULE :8000]
    UI[Frontend] -->|GET /tc-auth/*| AuthAPI[Identity & Admin Backend :8000]
    UI -->|GET /repo, GET /repo/{id}/commits| GitAPI
    UI -->|POST /repo/commit/analysis| GitAPI
    UI -->|GET /report.json| SecTest[SecTest :8765]
    GitAPI --> PG[(PostgreSQL)]
    AuthAPI --> PG
    GitAPI -->|AI call| LLM[AI Provider]
```

---

## 2. User Profile & Admin API (`/tc-auth/*`)

**Base URL**: `http://localhost:8000/tc-auth`
**Auth header**: `Authorization: Bearer <access_token>`

---

### 2.1 User Profile & Account Self-Service

#### `GET /tc-auth/me` — Current user & session info
```json
{
  "account": {
    "id": 1, "uid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "name": "Jane Doe", "handle": "janedoe", "email": "jane@example.com",
    "phone": "+1234567890", "avatar_url": "https://avatars.githubusercontent.com/u/1",
    "role": "superadmin", "status": "active",
    "created_at": "2026-08-18T10:00:00", "updated_at": "2026-08-18T12:00:00"
  },
  "session": {
    "id": 12, "account_id": 1,
    "token_hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
    "ip_address": "127.0.0.1",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "expires_at": "2026-08-25T12:00:00", "created_at": "2026-08-18T12:00:00"
  },
  "payload": { "aid": 1, "sid": 12, "token": "dG9rZW4tc2VjcmV0...", "exp": 1787659200 }
}
```

| JWT Payload Field | Description |
|---|---|
| `aid` | Account ID |
| `sid` | Session ID |
| `token` | Raw session token |
| `exp` | UNIX expiration timestamp |

#### `PATCH /tc-auth/me` — Update profile
- Body: `{ "name": "...", "email": "...", "handle": "...", "avatar_url": "...", "phone": "..." }`
- Response: Updated `account` object.

#### `PUT /tc-auth/update/password` — Change password
- Body: `{ "password": "brand-new-password-123" }`
- Response: `null`

---

### 2.2 Dashboard Config Routes (Superadmin only)

#### `GET /tc-auth/config/pulse` — Health check (public)
```json
{ "system_time": "2026-08-18T12:00:00.000000", "response": "Hello", "status": "healthy", "state": "active" }
```

#### `GET /tc-auth/config/counts` — Resource counts
```json
{ "accounts": 48, "oauth": 19, "sessions": 104, "otp": 6 }
```

#### `GET /tc-auth/config/load/` — Load runtime config
```json
{
  "email": { "host": "smtp.gmail.com", "port": 587, "username": "mailer@threatlens.io",
             "password": "app-password", "sender": "no-reply@threatlens.io",
             "sender_name": "ThreatLens Security", "use_tls": true },
  "github": { "client_id": "Iv1.8749129841298", "client_secret": "...",
               "redirect_uri": "http://localhost:8000/tc-auth/github/callback" },
  "google": { "client_id": "129837198237-apps.googleusercontent.com", "client_secret": "...",
               "redirect_uri": "http://localhost:8000/tc-auth/google/callback" },
  "jwt": { "secret_key": "jwt-signing-secret", "algorithm": "HS256", "session_duration_days": 7 }
}
```

#### `POST /tc-auth/config/email` — Update SMTP
Body: `{ "host": "...", "port": 587, "username": "...", "password": "...", "sender": "...", "sender_name": "...", "use_tls": true }`
Response: `null`

#### `POST /tc-auth/config/github` — Update GitHub OAuth
Body: `{ "client_id": "...", "client_secret": "...", "redirect_uri": "..." }`
Response: `null`

#### `POST /tc-auth/config/google` — Update Google OAuth
Body: `{ "client_id": "...", "client_secret": "...", "redirect_uri": "..." }`
Response: `null`

#### `POST /tc-auth/config/jwt` — Update JWT config
Body: `{ "secret_key": "...", "algorithm": "HS256", "session_duration_days": 14 }`
Response: `null`

---

### 2.3 Dashboard Account CRUD (Superadmin only, `/tc-auth/account`)

| Route | Method | Description |
|---|---|---|
| `/tc-auth/account/?page=1&limit=10` | GET | List accounts (paginated) |
| `/tc-auth/account/query?field=email&value=jane` | GET | Query by `id`, `uid`, `email`, `handle`, `phone`, `name` |
| `/tc-auth/account/` | POST | Create user |
| `/tc-auth/account/` | PATCH | Update user (body includes `account_id`) |
| `/tc-auth/account/` | DELETE | Delete user: `{ "account_id": 4 }` |

**Account object**:
```json
{
  "id": 1, "uid": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "name": "Jane Doe", "handle": "janedoe", "email": "jane@example.com",
  "phone": "+15555550100", "avatar_url": "https://avatar.url/jane.png",
  "role": "superadmin", "status": "active",
  "created_at": "2026-08-18T10:00:00", "updated_at": "2026-08-18T12:00:00"
}
```

**Create body**: `{ "name": "...", "email": "...", "handle": "...", "avatar_url": null, "phone": null, "role": "analyst", "status": "active", "password": "..." }`
**Update body**: includes `account_id` field alongside all updatable fields.
**Delete response**: `null` (cascades to sessions and OAuth links).

---

### 2.4 Dashboard OAuth Admin (Superadmin only, `/tc-auth/oauth`)

| Route | Method | Description |
|---|---|---|
| `/tc-auth/oauth/?page=1&limit=10` | GET | List all OAuth links |
| `/tc-auth/oauth/query?field=account_id&value=1` | GET | Query (`field`: `id`, `provider_id`, `account_id`) |
| `/tc-auth/oauth/` | POST | Manual link: `{ "account_id": 1, "provider": "github", "provider_user_id": "12345" }` |
| `/tc-auth/oauth/` | DELETE | Unlink: `{ "account_id": 1, "provider": "github" }` |

**OAuth object**:
```json
{ "id": 1, "account_id": 1, "provider": "github", "provider_user_id": "7821948", "created_at": "2026-08-18T10:00:00" }
```

---

### 2.5 Dashboard OTP Admin (Superadmin only, `/tc-auth/otp`)

| Route | Method | Description |
|---|---|---|
| `/tc-auth/otp/?page=1&limit=10` | GET | List all OTPs |
| `/tc-auth/otp/query?identifier=jane@example.com` | GET | Query by identifier |
| `/tc-auth/otp/` | POST | Create: `{ "identifier": "...", "purpose": "reset", "expiry": 300 }` → `{ "otp": "948210", "expires_at": 1787054700 }` |
| `/tc-auth/otp/` | DELETE | Revoke: `{ "identifier": "...", "purpose": "login" }` |
| `/tc-auth/otp/cleanup` | DELETE | Purge expired |
| `/tc-auth/otp/clear` | DELETE | Purge ALL |

**OTP object**:
```json
{ "id": 1, "identifier": "jane@example.com", "purpose": "login", "code_hash": "2c6a4e0...", "attempts": 0, "expires_at": "2026-08-18T12:05:00", "created_at": "2026-08-18T12:00:00" }
```

---

### 2.6 Dashboard Session Admin (Superadmin only, `/tc-auth/session`)

| Route | Method | Description |
|---|---|---|
| `/tc-auth/session/?page=1&limit=10` | GET | List all sessions |
| `/tc-auth/session/query?field=id&value=1` | GET | Query (`field`: `id`=account_id, `sid`=session_id, `token`, `ip`) |
| `/tc-auth/session/` | DELETE | Destroy session: `{ "session_id": 12 }` |
| `/tc-auth/session/all` | DELETE | Destroy all for user: `{ "account_id": 1 }` |
| `/tc-auth/session/cleanup` | DELETE | Cleanup expired |
| `/tc-auth/session/clear` | DELETE | Clear ALL |

**Session object**:
```json
{ "id": 12, "account_id": 1, "token_hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e", "ip_address": "192.168.1.100", "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "expires_at": "2026-08-25T12:00:00", "created_at": "2026-08-18T12:00:00" }
```

---

## 3. Git & Commit Security Engine (`/repo/*`)

**Base URL**: `http://localhost:8000/repo`
**Auth**: Required (`Authorization: Bearer <access_token>`) for all routes **except** `POST /repo/commit/analysis`.

The `cli-backend` runs locally, pushes data to the backend. The **frontend only reads** pre-stored data from the backend.

---

### 3.1 Repository Upsert — `POST /repo` (CLI → Backend)

```json
// Request body
{
  "data": {
    "repository": {
      "url": "https://github.com/fastapi/fastapi.git",
      "username": "fastapi",
      "name": "fastapi",
      "default_branch": "master",
      "branches": ["master"],
      "remote_branches": ["master"],
      "commit_count": 13250
    },
    "files": {
      "total": 420,
      "by_extension": { ".py": 300, ".md": 45, ".toml": 3, "<no extension>": 5 },
      "total_size": 9243340,
      "largest_files": [{ "path": "README.md", "size": 6800 }]
    },
    "languages": {
      "files": 330,
      "extensions": { "Python": 300, "JavaScript": 18, "TypeScript": 12 }
    },
    "tags": [
      { "name": "v0.115.0", "sha": "7f8a92b1d3e...", "short_sha": "7f8a92b" }
    ]
  }
}
```

> **IMPORTANT**: `data.languages.extensions` keys are **language names** (`"Python"`, `"JavaScript"`), NOT file extensions. This is the output of `RepositoryAnalyzer._analyze_languages()` via `LANGUAGE_MAP`.

> **IMPORTANT**: `data.tags` is a list of objects from `Repository.info_tags()` — each has `name`, `sha` (full hex), `short_sha` (first 7 chars).

```json
// Response — possible status values: "created" | "updated" | "already_up_to_date"
{ "status": "created", "repo_id": 12 }
```

---

### 3.2 Repository List — `GET /repo` (Frontend ← Backend)

```json
// Response: list[RepositoryResponse]
[
  {
    "id": 12,
    "account_id": 4,
    "url": "https://github.com/fastapi/fastapi.git",
    "username": "fastapi",
    "name": "fastapi",
    "default_branch": "master",
    "branches": ["master"],
    "remote_branches": ["master"],
    "commit_count": 13250,
    "files_total": 420,
    "files_by_extension": { ".py": 300, ".md": 45, ".toml": 3 },
    "total_size": 9243340,
    "largest_files": [{ "path": "README.md", "size": 6800 }],
    "language_files": 330,
    "languages": { "Python": 300, "JavaScript": 18, "TypeScript": 12 },
    "tags": [{ "name": "v0.115.0", "sha": "7f8a92b...", "short_sha": "7f8a92b" }],
    "created_at": "2026-08-18T09:11:40.247351+00:00",
    "updated_at": "2026-08-18T09:11:40.247351+00:00"
  }
]
```

**DB model fields** (`repositories` table):

| Column | Type | Description |
|---|---|---|
| `id` | `Integer` PK | Auto-incremented |
| `account_id` | `Integer` | FK to accounts |
| `url` | `Text` UNIQUE | HTTPS repo URL |
| `username` | `Text` | GitHub owner |
| `name` | `Text` | Repo name |
| `default_branch` | `Text` | e.g. `"main"` or `"master"` |
| `branches` | `JSONB` | Local branch names |
| `remote_branches` | `JSONB` | Remote branches (no `origin/` prefix) |
| `commit_count` | `Integer` | Total commits (all branches) |
| `files_total` | `Integer` | Total tracked files |
| `files_by_extension` | `JSONB` | `{ ".py": 300 }` — raw extensions |
| `total_size` | `Integer` | Total size in bytes |
| `largest_files` | `JSONB` | Top 10: `[{ "path": "...", "size": N }]` |
| `language_files` | `Integer` | Count of files in known languages |
| `languages` | `JSONB` | `{ "Python": 300 }` — language names |
| `tags` | `JSONB` | `[{ "name": "v1.0", "sha": "...", "short_sha": "..." }]` |
| `created_at` | `DateTime(tz)` | First insert |
| `updated_at` | `DateTime(tz)` | Last update |

---

### 3.3 Store Commit Analysis — `POST /repo/{repo_id}/commits` (CLI → Backend)

```json
// Request body — each element is full CommitAnalyzer.analyze(sha) output
{
  "data": [
    {
      "commit": {
        "sha": "8b4f7a668a7de34693bb25d6f66abfcb4f7b095e",
        "short_sha": "8b4f7a6",
        "author_name": "Alex Vance",
        "author_email": "alex@threatlens.io",
        "committer_name": "Alex Vance",
        "committer_email": "alex@threatlens.io",
        "authored_at": "2026-08-18T11:45:00+00:00",
        "committed_at": "2026-08-18T11:45:00+00:00",
        "message": "fix(auth): parameterize login query",
        "parents": ["4e21a8d011f592cb1475e330a8901f443810c512"]
      },
      "summary": {
        "risk_score": 28,
        "risk_level": "medium",
        "files_changed": 2,
        "findings": 2,
        "critical": 0,
        "high": 1,
        "medium": 1,
        "low": 0
      },
      "findings": [
        {
          "category": "security_code",
          "severity": "high",
          "title": "SQL injection risk",
          "description": "A security-sensitive coding pattern was introduced or modified by the commit.",
          "path": "backend/routes/auth.py",
          "evidence": "execute(f'SELECT...' + inp..."
        }
      ]
    }
  ]
}

// Response
{ "status": "stored", "count": 1 }
```

> Stored verbatim as JSONB per row. Unique constraint on `(repo_id, commit_sha)`.

---

### 3.4 List Commit Analysis — `GET /repo/{repo_id}/commits` (Frontend ← Backend)

- **Path param**: `repo_id` (int)
- **Query params**: `page` (int, default 1, min 1), `limit` (int, default 10, min 1, max 100)

```json
{
  "page": 1,
  "limit": 10,
  "data": [
    {
      "commit": {
        "sha": "8b4f7a668a7de34693bb25d6f66abfcb4f7b095e",
        "short_sha": "8b4f7a6",
        "author_name": "Alex Vance",
        "author_email": "alex@threatlens.io",
        "committer_name": "Alex Vance",
        "committer_email": "alex@threatlens.io",
        "authored_at": "2026-08-18T11:45:00+00:00",
        "committed_at": "2026-08-18T11:45:00+00:00",
        "message": "fix(auth): parameterize login query",
        "parents": ["4e21a8d011f592cb1475e330a8901f443810c512"]
      },
      "summary": {
        "risk_score": 28,
        "risk_level": "medium",
        "files_changed": 2,
        "findings": 2,
        "critical": 0,
        "high": 1,
        "medium": 1,
        "low": 0
      },
      "findings": [
        {
          "category": "security_code",
          "severity": "high",
          "title": "SQL injection risk",
          "description": "A security-sensitive coding pattern was introduced or modified by the commit.",
          "path": "backend/routes/auth.py",
          "evidence": "execute(f'SELECT...' + inp..."
        }
      ]
    }
  ]
}
```

> Ordered by `commits.created_at DESC` (DB insert order, NOT git commit timestamp).

---

### 3.5 AI Commit Analysis — `POST /repo/commit/analysis` (On-Demand)

- **Auth**: NOT required (no auth dependency in current implementation)
- **Backend action**: Clones repo freshly, fetches diff for SHA, calls AI.

```json
// Request body
{
  "url": "https://github.com/example-org/example-repo.git",
  "analysis": {
    "commit": { "sha": "8b4f7a668a7de34693bb25d6f66abfcb4f7b095e", "short_sha": "8b4f7a6", ... },
    "summary": { "risk_score": 28, "risk_level": "medium", ... },
    "findings": [{ "category": "security_code", "severity": "high", "title": "SQL injection risk", ... }]
  }
}
```

Required: `url` and `analysis.commit.sha`.

```json
// Response
{
  "diff": [
    {
      "change_type": "M",
      "old_path": "backend/routes/auth.py",
      "new_path": "backend/routes/auth.py",
      "old_mode": "100644",
      "new_mode": "100644",
      "diff": "@@ -42,8 +42,14 @@ def login_handler(...):\n- query = f\"SELECT...\"\n+ query = \"SELECT... :email\""
    }
  ],
  "ai_response": {
    "summary": "This commit remediates a SQL injection vulnerability.",
    "overview": "The change replaces an f-string SQL query with parameterized binding...",
    "changes": ["Replaced unsafe f-string query", "Added SQLAlchemy text() bind"],
    "findings": [
      {
        "severity": "high",
        "category": "security_code",
        "title": "SQL injection risk",
        "description": "The original code concatenated user input into SQL...",
        "path": "backend/routes/auth.py",
        "evidence": "execute(f'SELECT...' + inp...",
        "impact": "Attacker could extract all database rows.",
        "explanation": "The scanner flagged string concatenation in execute(). The new code uses parameterized queries."
      }
    ],
    "recommendations": [
      "Always use parameterized queries or an ORM abstraction.",
      "Add SAST scanning to CI/CD pipeline."
    ],
    "security_assessment": "The commit improves security posture by fixing a high-severity injection vector."
  }
}
```

> The AI **preserves** all findings from raw analysis. It does NOT modify `severity`, `category`, `path`, `risk_score`, or `risk_level`. It adds `description`, `impact`, and `explanation`.

---

## 4. CLI-Backend Data Schemas

The `cli-backend` runs locally. The frontend never calls it directly.

---

### 4.1 Repository Metadata — `Repository.info_repo()`

```json
{
  "url": "https://github.com/fastapi/fastapi.git",
  "username": "fastapi",
  "name": "fastapi",
  "default_branch": "master",
  "branches": ["master", "dev"],
  "remote_branches": ["master", "dev", "feat/auth-v2"],
  "commit_count": 13250
}
```

> `remote_branches`: stripped of `origin/` prefix via `.removeprefix("origin/")`.

---

### 4.2 Repository Analysis — `RepositoryAnalyzer.analyze().to_dict()`

This is the `data` field sent to `POST /repo`:

```json
{
  "repository": {
    "url": "https://github.com/fastapi/fastapi.git",
    "username": "fastapi",
    "name": "fastapi",
    "default_branch": "master",
    "branches": ["master"],
    "remote_branches": ["master"],
    "commit_count": 13250
  },
  "files": {
    "total": 420,
    "by_extension": { ".py": 300, ".md": 45, ".toml": 3, "<no extension>": 5 },
    "total_size": 9243340,
    "largest_files": [
      { "path": "README.md", "size": 6800 },
      { "path": "docs/advanced/index.md", "size": 5200 }
    ]
  },
  "languages": {
    "files": 330,
    "extensions": { "Python": 300, "JavaScript": 18, "TypeScript": 12 }
  },
  "tags": [
    { "name": "v0.115.0", "sha": "7f8a92b1d3e...", "short_sha": "7f8a92b" },
    { "name": "v0.114.2", "sha": "4e21a8d01f...", "short_sha": "4e21a8d" }
  ]
}
```

**Key notes**:
- `files.largest_files`: Top 10 only. Each entry: `{ "path": "...", "size": N_bytes }`.
- `files.by_extension`: Files without extension get key `"<no extension>"`.
- `languages.extensions`: Human-readable names from `LANGUAGE_MAP` (Python, JavaScript, TypeScript, Go, Rust, Shell, SQL, HTML, CSS, etc.)
- `tags`: Objects from `Repository.info_tags()` — `{ name, sha, short_sha }`.

---

### 4.3 Commit Info — `Repository.info_commit(sha)` / `list_commits()`

```json
{
  "sha": "96e2a871b53c19d4902187f0bca711832049e211",
  "short_sha": "96e2a87",
  "author_name": "Alex Vance",
  "author_email": "alex@threatlens.io",
  "committer_name": "Alex Vance",
  "committer_email": "alex@threatlens.io",
  "authored_at": "2026-08-18T11:45:00+00:00",
  "committed_at": "2026-08-18T11:45:00+00:00",
  "message": "fix(auth): sanitize user input",
  "parents": ["4e21a8d011f592cb1475e330a8901f443810c512"]
}
```

> `parents`: Full SHAs. Root commit → `[]`. Merge commit → 2+ items.

---

### 4.4 Commit Diff — `Repository.diff(sha)`

```json
[
  {
    "change_type": "M",
    "old_path": "backend/routes/auth.py",
    "new_path": "backend/routes/auth.py",
    "old_mode": "100644",
    "new_mode": "100644",
    "diff": "@@ -42,8 +42,14 @@ def login_handler(...):\n-    query = f\"SELECT * FROM users WHERE email = '{request.email}'\""
  }
]
```

`change_type` values: `A` (Added), `M` (Modified), `D` (Deleted), `R` (Renamed).

> Root commit: diff against empty tree. Merge commit: diff against first parent only.

---

### 4.5 Commit Security Analysis — `CommitAnalyzer.analyze(sha)`

This is the structure stored per commit and returned by `GET /repo/{repo_id}/commits`.

```json
{
  "commit": { ... },
  "summary": {
    "risk_score": 28,
    "risk_level": "medium",
    "files_changed": 2,
    "findings": 2,
    "critical": 0,
    "high": 1,
    "medium": 1,
    "low": 0
  },
  "findings": [
    {
      "category": "security_code",
      "severity": "high",
      "title": "SQL injection risk",
      "description": "A security-sensitive coding pattern was introduced or modified by the commit.",
      "path": "backend/routes/auth.py",
      "evidence": "execute(f'SELECT...' + inp..."
    }
  ]
}
```

**`summary` fields**:

| Field | Type | Description |
|---|---|---|
| `risk_score` | `int` 0–100 | Weighted severity sum, capped at 100 |
| `risk_level` | `string` | `critical` ≥80, `high` ≥50, `medium` ≥20, `low` <20 |
| `files_changed` | `int` | Unique file paths touched |
| `findings` | `int` | Total findings count |
| `critical` | `int` | Critical severity count |
| `high` | `int` | High severity count |
| `medium` | `int` | Medium severity count |
| `low` | `int` | Low severity count |

**Risk score weights** (summed, capped at 100):

| Severity | Weight |
|---|---|
| `critical` | 40 |
| `high` | 20 |
| `medium` | 8 |
| `low` | 2 |

---

### 4.6 All Finding Categories & Severity Levels

Each `Finding` has: `category`, `severity`, `title`, `description`, `path` (nullable), `evidence` (nullable).

| Category | Severity | Title | Trigger |
|---|---|---|---|
| `author_committer_mismatch` | `medium` | "Author and committer differ" | Author name/email ≠ committer |
| `merge_analysis` | `low` | "Merge commit" | Commit has 2+ parents |
| `sensitive_file` | `high` | "Sensitive file changed" | `.env`, `id_rsa`, `*.pem`, `*.key`, `credentials*`, `secrets*`, `service-account*` |
| `permission_analysis` | `medium` | "File became executable" | Mode gained executable bits |
| `permission_analysis` | `high` | "World-writable permission" | New mode has `& 0o002` |
| `secret_detection` | `critical` | "Possible AWS access key" | `AKIA[0-9A-Z]{16}` |
| `secret_detection` | `critical` | "Possible GitHub token" | `gh[pousr]_[A-Za-z0-9_]{20,}` |
| `secret_detection` | `critical` | "Possible Private key" | `-----BEGIN ... PRIVATE KEY-----` |
| `secret_detection` | `critical` | "Possible Generic secret assignment" | `api_key = "..."` / `secret = "..."` |
| `secret_detection` | `critical` | "Possible Bearer token" | `Bearer [A-Za-z0-9._~+/=-]{20,}` |
| `security_code` | `high` | "SQL injection risk" | `execute(f"...")` or `cursor(f"...")` with format |
| `security_code` | `high` | "Command injection risk" | `os.system(input)`, `subprocess.run(input)` |
| `security_code` | `high` | "Unsafe deserialization" | `pickle.loads()`, `yaml.load()` |
| `security_code` | `high` | "Dynamic code execution" | `eval(...)`, `exec(...)` |
| `security_code` | `high` | "Weak hashing" | `md5(...)`, `sha1(...)` |
| `security_code` | `high` | "TLS verification disabled" | `verify=False`, `CERT_NONE` |
| `security_code` | `high` | "Debug mode enabled" | `debug: True`, `DEBUG = True` |
| `security_code` | `high` | "Wildcard CORS" | `allow_origins=["*"]` |
| `security_code` | `high` | "Hard-coded authorization" | `is_admin == 'admin'`, `role == 'admin'` |
| `dependency_change` | `medium` | "Dependency file changed" | `requirements.txt`, `package.json`, `go.mod`, etc. — Added/Modified |
| `dependency_change` | `low` | "Dependency file changed" | Dependency file — Deleted |
| `cicd_security` | `medium` | "CI/CD configuration changed" | `.github/workflows/*.yml`, `.gitlab-ci.yml`, `Jenkinsfile`, etc. |
| `cicd_security` | `high` | "Unpinned GitHub Action" | `uses: action@main` / `@master` / `@latest` |
| `cicd_security` | `high` | "Broad workflow permissions" | `permissions: write-all` |
| `cicd_security` | `high` | "Potential secret exposure" | `echo ${{ secrets.NAME }}` in workflow |
| `docker_security` | `medium` | "Docker configuration changed" | `Dockerfile`, `docker-compose.yml`, `compose.yml` |
| `docker_security` | `high` | "Docker runs as root" | `USER root` in Dockerfile |
| `docker_security` | `high` | "Privileged container" | `privileged: true` in compose |
| `docker_security` | `high` | "Host filesystem mount" | `/var/run/docker.sock`, `/etc:`, `/root:` |
| `kubernetes_security` | `medium` | "Kubernetes configuration changed" | `k8s/`, `kubernetes/`, `helm/`, `charts/`, `*.yaml` |
| `kubernetes_security` | `high` | "Privileged Kubernetes container" | `privileged: true` |
| `kubernetes_security` | `high` | "Host network enabled" | `hostNetwork: true` |
| `kubernetes_security` | `high` | "Host PID enabled" | `hostPID: true` |
| `kubernetes_security` | `high` | "Host path mount" | `hostPath:` |
| `kubernetes_security` | `high` | "Cluster-admin RBAC" | `cluster-admin` |
| `commit_risk` | `medium` | "Large commit" | ≥20 files changed |
| `commit_risk` | `low` | "Many files added" | ≥10 files with `change_type=A` |
| `commit_risk` | `medium` | "Many files deleted" | ≥10 files with `change_type=D` |
| `commit_risk` | `low` | "Many files renamed" | ≥10 files with `change_type=R` |
| `commit_risk` | `medium` | "Empty commit message" | `message.strip() == ""` |
| `suspicious_commit_pattern` | `low` | "WIP commit" | Message matches `^wip` / `work in progress` |
| `suspicious_commit_pattern` | `low` | "Temporary/debug commit" | Message contains `temporary`, `temp`, `debug`, `test only` |
| `suspicious_commit_pattern` | `low` | "Force-related commit" | Message contains `force`, `forced`, `bypass` |
| `suspicious_commit_pattern` | `low` | "Security-sensitive bypass wording" | Message: `disable security`, `skip auth`, `bypass auth`, `disable verification` |
| `suspicious_commit_pattern` | `high` | "Authentication bypass pattern" | Patch contains `skip/disable/bypass...auth` |
| `suspicious_commit_pattern` | `high` | "TLS verification bypass" | Patch contains `verify=False` or `CERT_NONE` |

> **Evidence redaction**: Values ≤12 chars → `"[REDACTED]"`. Values >12 chars → `"first6...last4"`.

---

### 4.7 AI Analysis Response Schema

Returned as `ai_response` from `POST /repo/commit/analysis`:

```json
{
  "summary": "Brief high-level explanation of the commit and its security relevance.",
  "overview": "Detailed technical explanation of what the commit does.",
  "changes": ["Replaced f-string SQL query with parameterized binding", "Added SQLAlchemy text() bind"],
  "findings": [
    {
      "severity": "high",
      "category": "security_code",
      "title": "SQL injection risk",
      "description": "What was detected and what the changed code is doing.",
      "path": "backend/routes/auth.py",
      "evidence": "execute(f'SELECT...' + inp...",
      "impact": "Attacker could extract all database rows.",
      "explanation": "The scanner flagged concatenation. The diff confirms the new code uses bind params."
    }
  ],
  "recommendations": ["Always use parameterized queries.", "Add SAST to CI/CD."],
  "security_assessment": "Overall security assessment based on supplied analysis and diff."
}
```

AI-only fields (added over raw `CommitAnalyzer` output): `description`, `impact`, `explanation`, `overview`, `changes`, `recommendations`, `security_assessment`.

---

## 5. SecTest Scanner Schema

**Base URL**: `http://localhost:8765`
**JSON endpoint**: `GET /report.json`
**HTML report**: `GET /` or `GET /index.html`

```json
{
  "scanned_at": "2026-08-18T12:30:00.000000+00:00",
  "summary": {
    "total": 5,
    "by_severity": { "critical": 1, "high": 2, "medium": 1, "low": 1, "info": 0 }
  },
  "findings": [
    {
      "module": "injection",
      "title": "SQL Injection Vector in User Query Filter",
      "severity": "critical",
      "explanation": "Unsanitized user input was concatenated into a PostgreSQL query...",
      "remediation": "Use parameterized prepared statement binding.",
      "evidence": "Payload: ' OR '1'='1 returned HTTP 200 with 150 rows instead of 1.",
      "meta": { "endpoint": "POST /api/v1/users/search", "cwe": "CWE-89", "proof_hash": "0x9f4a7c2e88b13904a0ef1982bca48192a0e" }
    },
    {
      "module": "headers",
      "title": "Missing Strict-Transport-Security (HSTS) Header",
      "severity": "medium",
      "explanation": "HTTP response does not enforce HTTPS via HSTS.",
      "remediation": "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload'.",
      "evidence": "HSTS header absent from response.",
      "meta": { "endpoint": "GET /tc-auth/config/pulse", "cwe": "CWE-319" }
    },
    {
      "module": "exposure",
      "title": "Exposed Sensitive Route: /openapi.json",
      "severity": "low",
      "explanation": "Publicly accessible OpenAPI schema exposes internal endpoint schemas.",
      "remediation": "Restrict OpenAPI/Swagger UI to authenticated admins in production.",
      "evidence": "HTTP 200 OK at /openapi.json.",
      "meta": { "endpoint": "GET /openapi.json", "cwe": "CWE-200" }
    },
    {
      "module": "ratelimit",
      "title": "Lack of Rate Limiting on Login Endpoint",
      "severity": "high",
      "explanation": "Endpoint allowed 100 requests in 3 seconds without HTTP 429.",
      "remediation": "Implement sliding window rate limiter (5 attempts/60 seconds).",
      "evidence": "100/100 requests returned 401 instead of 429.",
      "meta": { "endpoint": "POST /tc-auth/login/password", "cwe": "CWE-307" }
    },
    {
      "module": "auth",
      "title": "Unauthenticated Access to Debug Endpoint",
      "severity": "high",
      "explanation": "Endpoint returned system metrics without validating Bearer token.",
      "remediation": "Add AuthDeps dependency injection to require a valid session token.",
      "evidence": "HTTP 200 OK without Authorization header.",
      "meta": { "endpoint": "GET /api/internal/debug", "cwe": "CWE-306" }
    }
  ],
  "errors": []
}
```

**Modules**: `injection` | `headers` | `exposure` | `ratelimit` | `auth`
**Severity values**: `critical` | `high` | `medium` | `low` | `info`

---

## 6. Frontend Dashboard Views

### 6.1 SOC Overview

**Data sources**:
- Health status → `GET /tc-auth/config/pulse`
- KPI counts → `GET /tc-auth/config/counts`
- Config details → `GET /tc-auth/config/load/`
- Vulnerability stream → `GET http://localhost:8765/report.json`

**UI elements**:
- Health status pill (green glow when `status=healthy`, `state=active`)
- KPI cards: Accounts, Sessions, OAuth Links, Active OTPs
- System info: SMTP host, OAuth providers configured, JWT algorithm & duration
- Vulnerability stream: sorted by severity, each showing module, title, CWE

---

### 6.2 Git Repository & Commit Risk Analyzer

**Data sources**:
- Repo list → `GET /repo`
- Commits + findings → `GET /repo/{repo_id}/commits?page=N&limit=N`
- AI enrichment → `POST /repo/commit/analysis`

**UI elements**:
- Repo selector (from list)
- Repo header: `username/name`, default branch, commit count, tags, file count, total size
- Language distribution bar (from `repo.languages` — language names)
- Largest files table (from `repo.largest_files`)
- Commit feed: SHA badge, message, author, `authored_at` (displayed as relative), risk score dial, risk level badge, finding counts
- Commit diff viewer (from `ai_response.diff` after AI call)
- Findings list per commit with category, severity, path, evidence
- AI panel: summary, overview, AI-enriched findings with impact & explanation, recommendations

---

### 6.3 SecTest Dynamic Vulnerability Scanner

**Data source**: `GET http://localhost:8765/report.json`

**UI elements**:
- Summary stats: total, by_severity breakdown
- Module filter tabs: All, Injection, Headers, Exposure, Auth, Rate Limit
- Severity badges: CRITICAL (pulsing red), HIGH (amber), MEDIUM (yellow), LOW (sky blue), INFO (slate)
- Finding cards: title, severity, module, endpoint, CWE, evidence, remediation
- Proof hash copy button (`meta.proof_hash`)
- Export JSON button, Open HTML report button

---

### 6.4 User Profile & Session Management

**Data sources**:
- Profile → `GET /tc-auth/me`
- OAuth links → `GET /tc-auth/oauth/query?field=account_id&value={id}`
- Sessions → `GET /tc-auth/session/query?field=id&value={account_id}`

**UI elements**:
- Avatar with fallback initials, name, handle, email, phone, UID, role pill, status pill
- Edit profile modal → `PATCH /tc-auth/me`
- Change password modal → `PUT /tc-auth/update/password`
- OAuth providers section (GitHub, Google) with link/unlink buttons
- Sessions table: IP, user-agent (parsed), created, expires, terminate button
- Logout / Logout all buttons

---

### 6.5 Superadmin Control Center

*(Visible only when `account.role === "superadmin"`)*

**Data sources**: All `/tc-auth/config/*`, `/tc-auth/account/*`, `/tc-auth/otp/*`, `/tc-auth/session/*`

**UI elements**:
- Runtime config editors (SMTP, GitHub OAuth, Google OAuth, JWT) — load from `GET /tc-auth/config/load/`, save via `POST /tc-auth/config/{email|github|google|jwt}`
- User accounts table with CRUD (Create, Edit, Delete)
- Search/filter/paginate users
- OTP audit panel with Revoke, Purge Expired, Clear All
- Session audit panel with Terminate, Cleanup, Clear All

---

### 6.6 Vulnerability Deep-Dive Drawer

Slide-over drawer opened when clicking any finding (SecTest or Git).

**For SecTest findings**:
- Title, severity badge, module, CWE pill
- Target endpoint
- Proof hash with copy
- `explanation` (root cause)
- `evidence` (probe trace)
- `remediation` (code fix / steps)

**For Git findings** (raw `CommitAnalyzer`):
- Title, severity, category, path
- `evidence` (code snippet)
- `description` (what was detected)
- Commit: SHA, message, author

**For AI-enriched Git findings** (after `POST /repo/commit/analysis`):
- All above plus: `impact`, `explanation`, `recommendations`

---

## 7. Backend Parameter → Frontend UI Mapping Matrix

| Backend Field | Source | Type | UI Component | Display |
|---|---|---|---|---|
| `status`, `state` | `GET /tc-auth/config/pulse` | string | Top Nav Health Pill | Green glow: `HEALTHY · ACTIVE` |
| `system_time` | `GET /tc-auth/config/pulse` | ISO string | System Clock | `HH:MM:SS UTC` |
| `accounts` | `GET /tc-auth/config/counts` | int | KPI Card | `48` |
| `sessions` | `GET /tc-auth/config/counts` | int | KPI Card | `104` |
| `oauth` | `GET /tc-auth/config/counts` | int | KPI Card | `19` |
| `otp` | `GET /tc-auth/config/counts` | int | KPI Card | `6` |
| `account.name` | `GET /tc-auth/me` | string | Avatar greeting | `Jane Doe` |
| `account.handle` | `GET /tc-auth/me` | string | Handle badge | `@janedoe` |
| `account.email` | `GET /tc-auth/me` | string | Email field | `mailto:` link |
| `account.role` | `GET /tc-auth/me` | string | RBAC pill | `SUPERADMIN` (purple) / `USER` (slate) |
| `account.status` | `GET /tc-auth/me` | string\|null | Status pill | `ACTIVE` (green) / `SUSPENDED` (red) |
| `account.avatar_url` | `GET /tc-auth/me` | string\|null | Topbar avatar | Image or initials fallback |
| `account.uid` | `GET /tc-auth/me` | UUID string | Profile detail | Truncated + copy button |
| `session.ip_address` | `GET /tc-auth/me` | string | Session item | IP with geo flag |
| `session.user_agent` | `GET /tc-auth/me` | string | Device item | Browser + OS icons |
| `session.expires_at` | `GET /tc-auth/me` | ISO string | Expiry pill | `Expires in 7 days` |
| `payload.exp` | `GET /tc-auth/me` | UNIX ts | Token monitor | Auto-redirect on expire |
| `email.host`, `port` | `GET /tc-auth/config/load/` | string, int | SMTP form | Input fields |
| `jwt.session_duration_days` | `GET /tc-auth/config/load/` | int | JWT form | Number input |
| `repo.id` | `GET /repo` | int | Repo selector | ID for API calls |
| `repo.name`, `username` | `GET /repo` | string | Repo header | `fastapi / fastapi` |
| `repo.default_branch` | `GET /repo` | string | Branch pill | `main` icon |
| `repo.branches` | `GET /repo` | list[str] | Branch dropdown | Selectable list |
| `repo.commit_count` | `GET /repo` | int | Stats badge | `13,250 commits` |
| `repo.files_total` | `GET /repo` | int | Stats card | `420 files` |
| `repo.total_size` | `GET /repo` | int (bytes) | Stats card | `9.24 MB` |
| `repo.largest_files` | `GET /repo` | list[{path, size}] | Largest files table | Ranked rows |
| `repo.languages` | `GET /repo` | dict[lang, int] | Language bar | Multi-color proportion |
| `repo.tags` | `GET /repo` | list[{name, sha, short_sha}] | Tag badges | Version labels |
| `repo.files_by_extension` | `GET /repo` | dict[ext, int] | Extension breakdown | Secondary stats |
| `commit.sha` | `GET /repo/{id}/commits` | string (40 hex) | SHA badge | `8b4f7a6` + copy |
| `commit.message` | `GET /repo/{id}/commits` | string | Commit title | Full message |
| `commit.author_name` | `GET /repo/{id}/commits` | string | Author info | Name + avatar |
| `commit.authored_at` | `GET /repo/{id}/commits` | ISO string | Timestamp | `10 mins ago` |
| `commit.parents` | `GET /repo/{id}/commits` | list[str] | Merge indicator | `⊕ Merge` if 2+ |
| `summary.risk_score` | `GET /repo/{id}/commits` | int 0-100 | Risk score dial | Circular ring |
| `summary.risk_level` | `GET /repo/{id}/commits` | string | Risk badge | `CRITICAL/HIGH/MEDIUM/LOW` |
| `summary.files_changed` | `GET /repo/{id}/commits` | int | Commit meta | `3 files` |
| `summary.critical/high/medium/low` | `GET /repo/{id}/commits` | int | Severity counters | Colored badges |
| `finding.category` | `GET /repo/{id}/commits` | string | Finding tag | `secret_detection`, `security_code`, etc. |
| `finding.severity` | both | string | Severity badge | Colored badge |
| `finding.title` | both | string | Finding header | Bold headline |
| `finding.description` | both | string | Finding detail | Paragraph |
| `finding.path` | both | string\|null | File path | `backend/routes/auth.py` |
| `finding.evidence` | both | string\|null | Code block | Monospace, redacted |
| `ai_response.impact` | `POST /repo/commit/analysis` | string | Deep-dive drawer | Impact paragraph |
| `ai_response.explanation` | `POST /repo/commit/analysis` | string | Deep-dive drawer | Context explanation |
| `ai_response.recommendations` | `POST /repo/commit/analysis` | list[str] | Remediation section | Bullet list |
| `sectest.finding.module` | `GET /report.json` | string | Filter tab | `injection`/`headers`/etc. |
| `sectest.finding.meta.cwe` | `GET /report.json` | string | Compliance pill | `CWE-89` |
| `sectest.finding.meta.proof_hash` | `GET /report.json` | string | Proof receipt | Hex + copy |
| `sectest.finding.remediation` | `GET /report.json` | string | Remediation drawer | Fix steps |

---

## 8. Integration Notes & Resilience Guidelines

### Identity & Admin Backend

1. **JWT expiry monitoring**: Decode the token client-side to read `exp` for session freshness.
2. **Session query fields**: `GET /tc-auth/session/query`
   - `field=id` → queries by `account_id`
   - `field=sid` → queries by `session_id`
   - `field=ip` → queries by IP address
3. **OAuth query fields**: `GET /tc-auth/oauth/query`
   - `field=account_id` (most common)
   - `field=id` (OAuth link row ID)
4. **`PUT /tc-auth/update/password`** expects exactly `{ "password": "..." }`. No current-password field.

---

### Git & Commit Security Engine

5. **CLI flow**: `cli-backend` runs locally on the analyst machine:
   1. Authenticate with access token
   2. Clone repo, run `RepositoryAnalyzer.analyze()`
   3. `POST /repo` → get `repo_id`
   4. For each commit: run `CommitAnalyzer.analyze(sha)`
   5. Batch `POST /repo/{repo_id}/commits`

6. **`POST /repo` upsert logic**: Unique key is `url`. Possible status: `created` | `updated` | `already_up_to_date`.

7. **Duplicate commit SHA**: Storing a commit with the same `(repo_id, commit_sha)` again will hit DB unique constraint `uq_commit_repo_sha`. The CLI should check existing commits before re-uploading.

8. **`repo.languages` keys**: Human-readable language names (`"Python"`, `"JavaScript"`) — NOT file extensions. `repo.files_by_extension` uses raw extensions (`.py`, `.js`).

9. **`GET /repo/{repo_id}/commits` ordering**: Ordered by `commits.created_at DESC` (DB insert time), NOT by git commit timestamp.

10. **`POST /repo/commit/analysis` (AI endpoint)**:
    - Clones repo freshly each call — expensive.
    - No auth enforced.
    - Fails if: invalid URL, SHA missing from cloned repo, network error, AI error.
    - Pass the full `CommitAnalyzer.analyze(sha)` output as `analysis` field.

---

### SecTest Scanner

11. **Port 8765**: If inactive, show cached/sample data and prompt to run a scan.
12. **`errors` array**: Non-empty means scan may be incomplete — show a warning banner.

---

*Written from live source code by Antigravity IDE. Last updated: 2026-08-18.*
