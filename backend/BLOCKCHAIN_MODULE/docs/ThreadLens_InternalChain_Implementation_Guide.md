# ThreadLens `InternalChain` — Implementation & Usage Guide

## 1. Purpose

`InternalChain` is ThreadLens's internal cryptographic checkpoint chain.

It is an on-demand, JSON-based SHA-256 hash chain for capturing arbitrary ThreadLens state, including repository state, commits, findings/results, attack reports, account data, usage, chat history, and custom data.

The internal chain is independent of Ethereum. Ethereum anchoring is a separate layer that may later store the final chain hash.

---

## 2. Fixed Block Schema

Every block uses this structure:

```json
{
  "index": 0,
  "type": "repository_state",
  "data": {},
  "created_at": "2026-08-31T22:30:00Z",
  "prev": null,
  "current": "..."
}
```

Fields:

| Field | Supplied by | Purpose |
|---|---|---|
| `index` | `InternalChain` | Block sequence number |
| `type` | Caller | Logical category/source |
| `data` | Caller | Block payload |
| `created_at` | `InternalChain` | Block creation timestamp |
| `prev` | `InternalChain` | Previous block's `current` hash |
| `current` | `InternalChain` | SHA-256 hash of the current block |

The caller only supplies `type` and `data`.

---

## 3. Data Semantics

`data` accepts:

```python
dict | list[dict]
```

### Dictionary

A dictionary creates **one block**:

```python
chain.create_block(
    "repository_state",
    {
        "branch": "main",
        "commit": "abc123"
    }
)
```

### List of dictionaries

A top-level list creates **one block per dictionary**:

```python
chain.create_block(
    "commits",
    [
        {"commit": {...}, "summary": {...}},
        {"commit": {...}, "summary": {...}},
        {"commit": {...}, "summary": {...}}
    ]
)
```

Result:

```text
Block N
Block N+1
Block N+2
```

A nested list inside a dictionary does not create additional blocks:

```python
{
    "commit": {...},
    "summary": {...},
    "findings": [{...}, {...}]
}
```

is still exactly one block.

The chain layer does not inspect nested data.

---

## 4. Storage

Use a configurable base variable:

```python
blockchain_dir
```

Storage path:

```text
{blockchain_dir}/chain/{account_id}/{chain_id}.json
```

The `chain_id` is:

```python
f"{chain_name}_{account_id}"
```

Example:

```text
blockchain_dir/
└── chain/
    └── 12345/
        ├── production_audit_12345.json
        ├── deployment_12345.json
        └── security_review_12345.json
```

The JSON file itself is a plain list of block dictionaries:

```json
[
  {
    "index": 0,
    "type": "genesis",
    "data": {},
    "created_at": "...",
    "prev": null,
    "current": "..."
  },
  {
    "index": 1,
    "type": "repository_state",
    "data": {},
    "created_at": "...",
    "prev": "...",
    "current": "..."
  }
]
```

There is no wrapper such as:

```json
{"chain_id": "...", "blocks": []}
```

---

## 5. Account ID and Chain ID

The primary source of truth for the account is:

```python
user["account"]["id"]
```

From it:

```python
account_id = user["account"]["id"]
chain_id = f"{chain_name}_{account_id}"
```

Do not rely on a separately supplied account ID.

Relationship:

```text
user
  │
  └── account.id
        │
        ├── account_id
        ├── chain_id
        └── storage directory
```

---

## 6. Genesis Block

A new chain is initialized in memory with:

```json
{
  "index": 0,
  "type": "genesis",
  "data": {
    "...": "user"
  },
  "created_at": "2026-08-31T22:30:00Z",
  "prev": null,
  "current": "..."
}
```

Rules:

```text
index   = 0
type    = "genesis"
data    = user
prev    = null
current = SHA-256 hash
```

The genesis block has no previous block.

---

## 7. `__init__`

Signature:

```python
InternalChain(
    chain_name: str,
    user: dict
)
```

Behavior:

```text
InternalChain(...)
       │
       ├── account_id = user["account"]["id"]
       ├── chain_id = chain_name + "_" + account_id
       ├── calculate JSON path
       │
       ├── JSON exists?
       │      ├── YES → load into memory
       │      └── NO  → create genesis in memory
       │
       └── never create a missing JSON file
```

A new chain therefore exists only in memory until `commit()` is explicitly called.

---

## 8. `commit()`

Signature:

```python
commit()
```

`commit()` is the explicit persistence operation.

New chain:

```text
memory
  ↓
commit()
  ↓
create directories
  ↓
create JSON
```

Existing chain:

```text
load JSON
  ↓
modify in memory
  ↓
commit()
  ↓
write updated JSON
```

No automatic persistence occurs during `create_block()`.

---

## 9. `create_block()`

Signature:

```python
create_block(
    type: str,
    data: dict | list[dict]
)
```

Only these are supplied by the caller:

```text
type
data
```

The chain automatically generates:

```text
index
created_at
prev
current
```

### Example

```python
chain.create_block(
    "attack_report",
    {
        "attack_id": "attack_001",
        "status": "successful"
    }
)
```

### List example

```python
chain.create_block(
    "commits",
    commits
)
```

If `commits` contains 10 top-level dictionaries, 10 blocks are created.

The caller never supplies indexes.

---

## 10. Block Hashing

For a new block:

```text
latest.current
     ↓
new.prev
```

Then:

```text
new.index = latest.index + 1
new.created_at = current UTC timestamp
```

`current` is calculated using SHA-256.

Conceptually:

```text
{
    index,
    type,
    data,
    created_at,
    prev
}
        ↓
canonical JSON
        ↓
UTF-8
        ↓
SHA-256
        ↓
current
```

`current` itself is excluded from its own hash input.

---

## 11. Canonical JSON

Hashing must use deterministic serialization.

The implementation must ensure stable:

- Key ordering
- Whitespace
- Unicode representation
- Number representation
- UTF-8 encoding

A suitable Python strategy is:

```python
json.dumps(
    block_without_current,
    sort_keys=True,
    separators=(",", ":"),
    ensure_ascii=False
)
```

Then encode as UTF-8 and calculate SHA-256.

The exact helper implementation may differ, but deterministic serialization is mandatory.

---

## 12. Hash Chain

Example:

```text
Block 0
prev = null
current = H0

Block 1
prev = H0
current = H1

Block 2
prev = H1
current = H2

Block 3
prev = H2
current = H3
```

Relationship:

```text
H0 → H1 → H2 → H3
```

Changing an earlier block changes its hash and breaks the subsequent `prev` relationship.

---

# Public API

## 13. Complete Public Interface

```python
class InternalChain:

    def __init__(
        self,
        chain_name: str,
        user: dict
    ):
        ...

    def create_block(
        self,
        type: str,
        data: dict | list[dict]
    ):
        ...

    def commit(self):
        ...

    def load_chain(
        self,
        page: int = 1,
        limit: int = 10
    ) -> list[dict]:
        ...

    def get_genesis(self) -> dict:
        ...

    def get_block(
        self,
        idx: int
    ) -> dict:
        ...

    def get_latest_block(self) -> dict:
        ...

    def get_chain_hash(self) -> str:
        ...

    def get_block_by_type(
        self,
        type: str,
        page: int = 1,
        limit: int = 10
    ) -> list[dict]:
        ...

    def verify_chain(
        self,
        target: int = 10,
        mode: str = "last"
    ):
        ...

    def get_chains(self) -> list[str]:
        ...
```

---

## 14. `load_chain()`

```python
load_chain(page=1, limit=10) -> list[dict]
```

Pagination has special semantics:

> Genesis is always returned, and `limit` controls the number of latest non-genesis blocks.

Therefore:

```python
load_chain(page=1, limit=10)
```

returns:

```text
genesis
+
10 latest non-genesis blocks
=
11 blocks
```

Example chain:

```text
0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15
^
genesis
```

Page 1, limit 10:

```text
0 + 6 7 8 9 10 11 12 13 14 15
```

Page 2 moves to the preceding set of non-genesis blocks while still including genesis.

Pagination is therefore latest-to-older, with genesis always included.

---

## 15. `get_genesis()`

```python
get_genesis() -> dict
```

Returns the block with:

```python
index == 0
```

---

## 16. `get_block()`

```python
get_block(idx: int) -> dict
```

Returns the block where:

```python
block["index"] == idx
```

Example:

```python
block = chain.get_block(10)
```

---

## 17. `get_latest_block()`

```python
get_latest_block() -> dict
```

Returns the block with the highest index.

---

## 18. `get_chain_hash()`

```python
get_chain_hash() -> str
```

Returns:

```python
chain.get_latest_block()["current"]
```

This is the current integrity hash of the complete internal chain.

It is the value later used for optional Ethereum anchoring.

---

## 19. `get_block_by_type()`

```python
get_block_by_type(
    type: str,
    page: int = 1,
    limit: int = 10
) -> list[dict]
```

Returns blocks matching:

```python
block["type"] == type
```

Pagination applies to the matching blocks.

Example:

```python
chain.get_block_by_type(
    "attack_report",
    page=1,
    limit=10
)
```

Nested data does not affect matching.

---

## 20. `verify_chain()`

```python
verify_chain(
    target: int = 10,
    mode: str = "last"
)
```

Supported modes:

```text
single
from
till
full
last
latest
```

### `single`

```python
chain.verify_chain(
    target=10,
    mode="single"
)
```

Uses:

```text
Block 9
   ↓
Block 10
```

It verifies the target block and its predecessor so the target's `prev` relationship can be checked.

### `from`

```python
chain.verify_chain(
    target=10,
    mode="from"
)
```

Verifies:

```text
10 → 11 → 12 → ... → latest
```

### `till`

```python
chain.verify_chain(
    target=10,
    mode="till"
)
```

Verifies:

```text
genesis → 1 → 2 → ... → 10
```

### `full`

```python
chain.verify_chain(mode="full")
```

Verifies the complete chain.

`target` is ignored.

### `last`

```python
chain.verify_chain(
    target=10,
    mode="last"
)
```

Verifies the last 10 blocks.

If the latest block is 30:

```text
21 → 22 → ... → 30
```

The predecessor needed to establish the first selected block's `prev` relationship should also be loaded when necessary.

### `latest`

```python
chain.verify_chain(mode="latest")
```

Verifies the latest block using the latest block and its predecessor.

`target` is ignored.

---

## 21. Verification Summary

| Mode | Target | Range |
|---|---:|---|
| `single` | Yes | `target-1 → target` |
| `from` | Yes | `target → latest` |
| `till` | Yes | `genesis → target` |
| `full` | No | `genesis → latest` |
| `last` | Yes | last `target` blocks |
| `latest` | No | `latest-1 → latest` |

---

## 22. `get_chains()`

```python
get_chains() -> list[str]
```

Lists all internal chain IDs for the current account.

It searches:

```text
{blockchain_dir}/chain/{account_id}/
```

and identifies JSON chain files.

Example:

```text
12345/
├── production_audit_12345.json
├── deployment_12345.json
└── security_review_12345.json
```

returns:

```python
[
    "production_audit_12345",
    "deployment_12345",
    "security_review_12345"
]
```

Only the current account's directory is searched.

---

# Usage

## 23. Create a Chain

```python
chain = InternalChain(
    chain_name="production_audit",
    user=user
)
```

If the chain does not exist:

- Genesis is created in memory.
- No JSON file is created.

---

## 24. Add Repository State

```python
chain.create_block(
    "repository_state",
    repository_state
)
```

This changes memory only.

---

## 25. Add Paginated Commit Data

If the existing ThreadLens commit API returns:

```python
commits = [
    {
        "commit": {...},
        "summary": {...},
        "findings": []
    },
    ...
]
```

then:

```python
chain.create_block(
    "commits",
    commits
)
```

creates one block for each top-level dictionary.

Nested `findings` remain inside the corresponding block's `data`.

---

## 26. Add an Attack Report

```python
chain.create_block(
    "attack_report",
    attack_report
)
```

---

## 27. Explicitly Save

```python
chain.commit()
```

This is the point at which the JSON file is created or updated.

No mutation should be assumed to be persistent until `commit()` is called.

---

## 28. Query the Chain

```python
blocks = chain.load_chain(
    page=1,
    limit=10
)

genesis = chain.get_genesis()

block = chain.get_block(10)

latest = chain.get_latest_block()

chain_hash = chain.get_chain_hash()

attack_reports = chain.get_block_by_type(
    "attack_report",
    page=1,
    limit=10
)

all_chains = chain.get_chains()
```

---

## 29. Verify the Chain

```python
chain.verify_chain(
    target=10,
    mode="last"
)
```

Other examples:

```python
chain.verify_chain(10, "single")

chain.verify_chain(10, "from")

chain.verify_chain(10, "till")

chain.verify_chain(mode="full")

chain.verify_chain(mode="latest")
```

---

# 30. Complete Example

```python
user = {
    "account": {
        "id": "12345"
    }
}

chain = InternalChain(
    chain_name="production_audit",
    user=user
)

chain.create_block(
    "repository_state",
    {
        "branch": "main",
        "commit": "2197009"
    }
)

chain.create_block(
    "commits",
    [
        {
            "commit": {
                "sha": "abc123"
            },
            "summary": {
                "findings": 2
            },
            "findings": []
        },
        {
            "commit": {
                "sha": "def456"
            },
            "summary": {
                "findings": 0
            },
            "findings": []
        }
    ]
)

chain.create_block(
    "attack_report",
    {
        "attack_id": "attack_001",
        "status": "successful"
    }
)

# Explicit persistence
chain.commit()

# Queries
latest = chain.get_latest_block()
chain_hash = chain.get_chain_hash()

# Verification
result = chain.verify_chain(
    target=10,
    mode="last"
)
```

---

# 31. Separation from Ethereum

Internal chain blocks must not contain Ethereum-specific information such as:

```text
transaction_hash
wallet_address
network
contract_address
block_number
```

The relationship is:

```text
InternalChain
      │
      └── final chain hash
              │
              ▼
       Optional Ethereum Anchor
              │
              └── chain_id → chain_hash
```

Ethereum anchoring is a separate concern.

Adding Ethereum transaction information into the internal chain after anchoring would change the chain hash, so it must remain outside the chain.

---

# 32. User-Owned Checkpoint

The JSON chain is portable.

```text
ThreadLens
   │
   ├── keeps a server-side copy
   │
   └── user exports JSON
             │
             ▼
       user-controlled storage
```

The user can later paste or upload the JSON to verify the internal chain.

---

# 33. Implementation Rules

1. Class name is `InternalChain`.
2. Use SHA-256.
3. JSON root is `list[dict]`.
4. Genesis is index `0`.
5. Genesis type is `"genesis"`.
6. Genesis `prev` is `null`.
7. Genesis `data` is the supplied `user` dictionary.
8. `account_id` comes from `user["account"]["id"]`.
9. `chain_id = f"{chain_name}_{account_id}"`.
10. Use the configurable `blockchain_dir`.
11. Storage is `chain/{account_id}/{chain_id}.json`.
12. `__init__` loads an existing JSON.
13. `__init__` creates an in-memory genesis when JSON does not exist.
14. `__init__` does not create a missing file.
15. `commit()` is explicitly required for persistence.
16. `create_block()` accepts only `type` and `data`.
17. `index` is automatic.
18. `created_at` is automatic.
19. `prev` is automatic.
20. `current` is automatic.
21. `dict` data creates one block.
22. Top-level `list[dict]` data creates one block per dictionary.
23. Nested lists/dictionaries do not affect block creation.
24. `current` is SHA-256 over canonicalized block contents excluding `current`.
25. Every non-genesis block references the previous block's `current`.
26. The latest block's `current` is the chain hash.
27. `load_chain()` always includes genesis plus the requested latest non-genesis blocks.
28. `verify_chain(single)` checks the target and predecessor.
29. `get_chains()` lists chain IDs from the current account directory.
30. Ethereum metadata remains outside the internal chain.

---

# 34. Architecture Summary

```text
                   ThreadLens User
                         │
                         ▼
                 InternalChain(...)
                         │
          ┌──────────────┴──────────────┐
          │                             │
    Existing JSON                 No JSON
          │                             │
          ▼                             ▼
    Load into memory            Genesis in memory
          │                             │
          └──────────────┬──────────────┘
                         │
                         ▼
                  create_block()
                         │
                         ▼
                   Memory only
                         │
                         ▼
                      commit()
                         │
                         ▼
                     JSON file
                         │
              ┌──────────┴──────────┐
              │                     │
              ▼                     ▼
          Query APIs           verify_chain()
              │                     │
              ▼                     ▼
       chain information      integrity result
              │
              ▼
        get_chain_hash()
              │
              ▼
      Optional Ethereum Anchor
```

`InternalChain` is intentionally generic. It does not understand the meaning of commits, findings, attack reports, chats, or other ThreadLens entities. The `type` identifies the source/category, while `data` contains the original JSON-compatible payload.

This keeps the integrity layer small, reusable, portable, and independent from both ThreadLens domain logic and Ethereum.
