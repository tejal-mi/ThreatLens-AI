# Repository Routes (Frontend)

Base path: `/repo`

This document includes only these 3 routes:

- `GET /repo`
- `GET /repo/{repo_id}/commits`
- `POST /repo/commit/analysis`

## Frontend Integration Notes

- For protected routes, send `Authorization: Bearer <access_token>`.
- Always send and read JSON.

---

## GET `/repo`

Get all repositories saved for the authenticated account.

### Authentication

Required.

### Path parameters

None.

### Query parameters

None.

### Request body

None.

### Fetch example

```js
const res = await fetch(`${baseUrl}/repo`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

if (!res.ok) {
  throw new Error(`Failed to fetch repositories: ${res.status}`);
}

const repositories = await res.json();
```

### Response (sample)

```json
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
    "files_by_extension": {
      ".py": 300,
      ".md": 45,
      ".toml": 3
    },
    "total_size": 9243340,
    "largest_files": [
      {
        "path": "README.md",
        "size": 6800
      }
    ],
    "language_files": 330,
    "languages": {
      ".py": 300,
      ".md": 45,
      ".toml": 3
    },
    "tags": ["python", "api"],
    "created_at": "2026-08-18T09:11:40.247351+00:00",
    "updated_at": "2026-08-18T09:11:40.247351+00:00"
  }
]
```

---

## GET `/repo/{repo_id}/commits`

Get paginated stored raw commit analysis entries for a repository.

### Authentication

Required.

### Path parameters

- `repo_id` (`int`, required): Repository DB ID.

### Query parameters

- `page` (`int`, optional, default `1`, minimum `1`)
- `limit` (`int`, optional, default `10`, minimum `1`, maximum `100`)

### Request body

None.

### Fetch example

```js
const repoId = 12;
const page = 1;
const limit = 10;

const res = await fetch(
  `${baseUrl}/repo/${repoId}/commits?page=${page}&limit=${limit}`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
);

if (!res.ok) {
  throw new Error(`Failed to fetch commit analysis: ${res.status}`);
}

const payload = await res.json();
```

### Response (sample)

```json
{
  "page": 1,
  "limit": 10,
  "data": [
    {
      "commit": {
        "sha": "8b4f7a668a7de34693bb25d6f66abfcb4f7b095e",
        "short_sha": "8b4f7a6",
        "message": "add oauth callback validation"
      },
      "summary": {
        "risk_score": 52,
        "risk_level": "medium"
      },
      "findings": [
        {
          "severity": "medium",
          "category": "auth",
          "title": "Potential open redirect",
          "path": "api/oauth.py",
          "evidence": "frontend_url from query used in redirect"
        }
      ]
    }
  ]
}
```

---

## POST `/repo/commit/analysis`

Generate AI commit analysis from:

- repository URL
- a deterministic/raw analysis payload containing `analysis.commit.sha`

### Authentication

Not required by the current route implementation.

### Path parameters

None.

### Query parameters

None.

### Request body

```json
{
  "url": "https://github.com/example-org/example-repo.git",
  "analysis": {
    "commit": {
      "sha": "8b4f7a668a7de34693bb25d6f66abfcb4f7b095e",
      "short_sha": "8b4f7a6",
      "message": "add oauth callback validation"
    },
    "summary": {
      "risk_score": 52,
      "risk_level": "medium"
    },
    "findings": [
      {
        "severity": "medium",
        "category": "auth",
        "title": "Potential open redirect",
        "path": "api/oauth.py",
        "evidence": "frontend_url from query used in redirect"
      }
    ]
  }
}
```

Required fields used by route logic:

- `url`
- `analysis.commit.sha`

### Fetch example

```js
const res = await fetch(`${baseUrl}/repo/commit/analysis`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://github.com/example-org/example-repo.git",
    analysis: {
      commit: {
        sha: "8b4f7a668a7de34693bb25d6f66abfcb4f7b095e",
        short_sha: "8b4f7a6",
        message: "add oauth callback validation",
      },
      summary: {
        risk_score: 52,
        risk_level: "medium",
      },
      findings: [
        {
          severity: "medium",
          category: "auth",
          title: "Potential open redirect",
          path: "api/oauth.py",
          evidence: "frontend_url from query used in redirect",
        },
      ],
    },
  }),
});

if (!res.ok) {
  throw new Error(`AI analysis failed: ${res.status}`);
}

const analysis = await res.json();
```

### Response (sample)

```json
{
  "diff": [
    {
      "change_type": "M",
      "old_path": "api/oauth.py",
      "new_path": "api/oauth.py",
      "old_mode": "100644",
      "new_mode": "100644",
      "diff": "@@ -10,6 +10,8 @@ ..."
    }
  ],
  "ai_response": {
    "summary": "...",
    "overview": "...",
    "changes": ["..."],
    "findings": [
      {
        "severity": "medium",
        "category": "auth",
        "title": "Potential open redirect",
        "description": "...",
        "path": "api/oauth.py",
        "evidence": "...",
        "impact": "...",
        "explanation": "..."
      }
    ],
    "recommendations": ["..."],
    "security_assessment": "..."
  }
}
```

---

## Error Handling

- Validation errors return `422` with FastAPI validation details.
- `POST /repo/commit/analysis` may also fail for invalid URL, missing commit SHA in the target repo, clone/network errors, or AI provider errors.
