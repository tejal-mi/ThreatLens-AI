# CLI Routes (Frontend Fetch Style)

Base path: `/repo`

This document contains exactly these 4 routes:

- `POST /repo`
- `GET /repo`
- `GET /repo/{repo_id}/commits`
- `POST /repo/{repo_id}/commits`

Excluded route:

- `POST /repo/commit/analysis`

## Frontend Integration Notes

- All 4 routes require `Authorization: Bearer <access_token>`.
- Use `Content-Type: application/json` for POST requests.

---

## POST `/repo`

Create or update repository metadata.

### Path parameters

None.

### Query parameters

None.

### Request body

```json
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
      "by_extension": {
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
      ]
    },
    "languages": {
      "files": 330,
      "extensions": {
        ".py": 300,
        ".md": 45,
        ".toml": 3
      }
    },
    "tags": ["python", "api"]
  }
}
```

### Fetch example

```js
const res = await fetch(`${baseUrl}/repo`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    data: {
      repository: {
        url: "https://github.com/fastapi/fastapi.git",
        username: "fastapi",
        name: "fastapi",
        default_branch: "master",
        branches: ["master"],
        remote_branches: ["master"],
        commit_count: 13250,
      },
      files: {
        total: 420,
        by_extension: { ".py": 300, ".md": 45, ".toml": 3 },
        total_size: 9243340,
        largest_files: [{ path: "README.md", size: 6800 }],
      },
      languages: {
        files: 330,
        extensions: { ".py": 300, ".md": 45, ".toml": 3 },
      },
      tags: ["python", "api"],
    },
  }),
});

const data = await res.json();
```

### Response (sample)

```json
{
  "status": "created",
  "repo_id": 12
}
```

Possible `status` values:

- `created`
- `updated`
- `already_up_to_date`

---

## GET `/repo`

Get all repositories for the authenticated account.

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
    "files_by_extension": {".py": 300, ".md": 45, ".toml": 3},
    "total_size": 9243340,
    "largest_files": [{"path": "README.md", "size": 6800}],
    "language_files": 330,
    "languages": {".py": 300, ".md": 45, ".toml": 3},
    "tags": ["python", "api"],
    "created_at": "2026-08-18T09:11:40.247351+00:00",
    "updated_at": "2026-08-18T09:11:40.247351+00:00"
  }
]
```

---

## GET `/repo/{repo_id}/commits`

Get paginated stored commit analysis entries.

### Path parameters

- `repo_id` (`int`, required)

### Query parameters

- `page` (`int`, optional, default `1`, minimum `1`)
- `limit` (`int`, optional, default `10`, minimum `1`, maximum `100`)

### Request body

None.

### Fetch example

```js
const repoId = 12;

const res = await fetch(`${baseUrl}/repo/${repoId}/commits?page=1&limit=10`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

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

## POST `/repo/{repo_id}/commits`

Store raw commit analysis entries.

### Path parameters

- `repo_id` (`int`, required)

### Query parameters

None.

### Request body

```json
{
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

Important note:

- The request body now includes only `data`.
- The repository ID is taken from the path parameter `/{repo_id}`.

### Fetch example

```js
const repoId = 12;

const res = await fetch(`${baseUrl}/repo/${repoId}/commits`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    data: [
      {
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
    ],
  }),
});

const result = await res.json();
```

### Response (sample)

```json
{
  "status": "stored",
  "count": 1
}
```
