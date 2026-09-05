# ThreadLens Blockchain & Integrity Checkpoint Architecture

> **Status:** Architecture locked for hackathon implementation\
> **Scope:** On-demand customizable integrity chains + optional Ethereum
> anchoring\
> **Core principle:** ThreadLens does not make blockchain mandatory. The
> internal integrity chain is the primary artifact; Ethereum is an
> optional external trust anchor.

------------------------------------------------------------------------

## 1. Executive Summary

ThreadLens will implement blockchain as an **on-demand integrity and
evidence anchoring feature**, rather than making the entire platform
blockchain-dependent.

A user can explicitly request a **Checkpoint** for a repository/account
state. During checkpoint creation, the user gets high-level
customization over what should be included, such as:

-   Full repository state
-   Repository commit history
-   Last N commits
-   Selected/random commits
-   Security findings
-   Attack reports
-   Account data
-   Usage data
-   Chat history
-   Selected conversations
-   Custom blocks
-   Other supported ThreadLens data

ThreadLens converts the selected information into a sequence of JSON
blocks. Every block contains:

-   Its block index
-   Block type
-   Block data
-   Timestamp/metadata as required
-   `previous_hash`
-   `current_hash`

The `current_hash` is calculated from the canonicalized contents of the
block, including its `previous_hash`.

Therefore, the final block's `current_hash` acts as the **integrity hash
of the complete internal chain**.

The complete chain can be:

1.  Kept by ThreadLens.
2.  Exported/downloaded by the user.
3.  Stored independently by the user.
4.  Uploaded or pasted back into ThreadLens later for integrity
    verification.

For Pro users, one or more internal chains can be selected and anchored
together in a **single Ethereum transaction**. The Ethereum layer stores
a simple mapping conceptually equivalent to:

``` text
chain_id -> chain_hash
```

along with the minimum account/wallet metadata required by the smart
contract.

The Ethereum transaction and blockchain metadata are stored separately
in ThreadLens's database and associated with the user's account.
**Ethereum data is not inserted into the internal JSON chain**, because
doing so would change the chain hash and create unnecessary
circular/dependency complexity.

------------------------------------------------------------------------

# 2. High-Level Product Flow

``` mermaid
flowchart TD
    A[ThreadLens User] --> B[Create Integrity Checkpoint]
    B --> C[Checkpoint Configuration]

    C --> C1[Repository State]
    C --> C2[Commit History]
    C --> C3[Security Findings]
    C --> C4[Attack Reports]
    C --> C5[Account Data]
    C --> C6[Usage Data]
    C --> C7[Chat History]
    C --> C8[Custom Blocks]

    C1 --> D[Checkpoint Data Builder]
    C2 --> D
    C3 --> D
    C4 --> D
    C5 --> D
    C6 --> D
    C7 --> D
    C8 --> D

    D --> E[Canonical JSON Serialization]
    E --> F[Hash Chain Builder]

    F --> G[Internal JSON Chain]
    G --> H[Final Block Current Hash]
    H --> I[Chain Integrity Hash]

    I --> J[Store Checkpoint in ThreadLens DB]
    I --> K[Export JSON to User]

    I --> L{User Requests Ethereum Anchor?}

    L -->|No| M[Internal Checkpoint Only]
    L -->|Yes / Pro| N[Select One or More Chains]
    N --> O[Create Chain ID → Chain Hash Mapping]
    O --> P[Ethereum Smart Contract]
    P --> Q[Transaction Hash / Anchor Metadata]
    Q --> R[Store Anchor Metadata in ThreadLens DB]
```

------------------------------------------------------------------------

# 3. Core Architecture

``` mermaid
flowchart LR
    U[User] --> UI[ThreadLens Checkpoint Builder]

    UI --> CB[Checkpoint Builder]
    CB --> IC[Internal Integrity Chain]

    IC --> DB[(ThreadLens Database)]
    IC --> EXP[Exportable JSON]

    EXP --> VERIFY[Verification Engine]

    IC --> HASH[Final Chain Hash]
    HASH --> ANCHOR[Optional Ethereum Anchor]

    ANCHOR --> ETH[Ethereum Smart Contract]
    ETH --> TX[Blockchain Transaction]

    TX --> DB

    VERIFY --> LOCAL[Internal Chain Verification]
    VERIFY --> ETHV[Ethereum Anchor Verification]

    LOCAL --> RESULT[Verification Result]
    ETHV --> RESULT
```

------------------------------------------------------------------------

# 4. Important Separation of Responsibilities

The architecture deliberately separates three things.

## 4.1 Internal Integrity Chain

Responsible for:

-   Capturing the user's selected ThreadLens state
-   Creating JSON blocks
-   Linking blocks cryptographically
-   Producing the final chain integrity hash
-   Being portable/exportable
-   Supporting offline/independent preservation by the user

## 4.2 Ethereum Anchor

Responsible only for:

-   Recording one or more internal chain hashes externally
-   Providing an independently controlled/public blockchain timestamp
    and transaction record
-   Allowing ThreadLens to prove that a particular chain hash was
    anchored

Ethereum does **not** store the complete repository state, findings,
chats, reports, or raw checkpoint JSON.

## 4.3 ThreadLens Database

Responsible for:

-   Storing the user's checkpoint
-   Keeping a ThreadLens copy of exported chains
-   Associating checkpoints with accounts
-   Keeping Ethereum transaction metadata
-   Keeping wallet/account mapping
-   Making the UX convenient

The user is **not dependent on ThreadLens as the only storage location**
because the checkpoint JSON can be exported and retained independently.

------------------------------------------------------------------------

# 5. Entity Relationship Diagram

``` mermaid
erDiagram
    ACCOUNT ||--o{ CHECKPOINT : creates
    ACCOUNT ||--o{ BLOCKCHAIN_ANCHOR : owns
    CHECKPOINT ||--|| INTERNAL_CHAIN : contains
    INTERNAL_CHAIN ||--|{ CHAIN_BLOCK : contains
    BLOCKCHAIN_ANCHOR ||--|{ ANCHORED_CHAIN : includes
    CHECKPOINT ||--o| ANCHORED_CHAIN : may_be_anchored_as

    ACCOUNT {
        string account_id PK
        string wallet_address
        string plan
        datetime created_at
    }

    CHECKPOINT {
        string checkpoint_id PK
        string account_id FK
        string name
        string description
        string configuration_json
        string chain_id
        string chain_integrity_hash
        datetime created_at
    }

    INTERNAL_CHAIN {
        string chain_id PK
        string checkpoint_id FK
        string account_id FK
        string chain_version
        string final_hash
        string status
        datetime created_at
    }

    CHAIN_BLOCK {
        string block_id PK
        string chain_id FK
        integer block_index
        string block_type
        json data
        string previous_hash
        string current_hash
        datetime created_at
    }

    BLOCKCHAIN_ANCHOR {
        string anchor_id PK
        string account_id FK
        string network
        string contract_address
        string wallet_address
        string transaction_hash
        string block_number
        string status
        datetime anchored_at
    }

    ANCHORED_CHAIN {
        string anchor_id FK
        string chain_id FK
        string chain_hash
    }
```

------------------------------------------------------------------------

# 6. Main Domain Entities

## Account

Represents the ThreadLens user/account.

The account owns:

-   Checkpoints
-   Internal chains
-   Blockchain anchors
-   Wallet/account association
-   Subscription/plan information

The ThreadLens account identity and blockchain wallet identity should
remain conceptually separate.

Example:

``` text
ThreadLens account
    |
    +-- account_id
    |
    +-- plan = PRO
    |
    +-- blockchain wallet
            |
            +-- wallet_address
```

A private key/seed phrase must never be stored as ordinary account data.

------------------------------------------------------------------------

## Checkpoint

A checkpoint is the user's **requested snapshot definition and resulting
evidence package**.

It represents:

> "Capture the selected ThreadLens state at this point according to
> these rules."

A checkpoint may contain:

``` text
checkpoint_id
name
description
account_id
configuration
internal_chain_id
final_chain_hash
created_at
```

------------------------------------------------------------------------

## Internal Chain

The internal chain is the cryptographically linked sequence of JSON
blocks created from the checkpoint configuration.

Example:

``` text
Chain: chain_001

Block 0
   |
   v
Block 1
   |
   v
Block 2
   |
   v
Block 3
   |
   v
Final Hash = H3
```

The final hash is the chain's integrity commitment.

------------------------------------------------------------------------

## Chain Block

A block contains one logical piece/category of checkpoint evidence.

Possible block types:

``` text
repository_state
commit_history
finding
attack_report
account_data
usage_data
chat_history
custom
metadata
```

A single category may generate multiple blocks.

For example:

``` text
attack_report_001
attack_report_002
attack_report_003
```

rather than forcing all attack reports into one huge object.

------------------------------------------------------------------------

## Blockchain Anchor

An anchor represents an Ethereum transaction that records one or more
internal chain hashes.

It contains blockchain-specific metadata such as:

``` text
anchor_id
account_id
network
contract_address
wallet_address
transaction_hash
block_number
status
anchored_at
```

The anchor does not become part of the internal chain.

------------------------------------------------------------------------

# 7. User Checkpoint Customization

The checkpoint builder should expose high-level choices rather than
forcing users to understand hashes or blockchain internals.

Example:

``` text
CREATE CHECKPOINT

Name:
[ Production Security Audit ]

Repository
[x] Repository state
    Mode: [ Full ▼ ]

[x] Commit history
    Mode: [ Last N ▼ ]
    N: [ 10 ]

Security
[x] Findings
    Mode: [ All ▼ ]

[x] Attack reports
    Mode: [ Selected ▼ ]

Account
[ ] Account data

Usage
[x] Usage statistics

Chat History
[x] Chat history
    Mode: [ Selected conversations ▼ ]

Custom
[+] Add custom block

--------------------------------
[ Create Checkpoint ]
```

------------------------------------------------------------------------

# 8. Repository State Options

Possible repository-state modes:

``` text
FULL
```

Captures the configured full repository state.

``` text
SELECTED
```

Captures explicitly selected repository information.

``` text
CUSTOM
```

Captures only the repository fields selected by the user.

The exact fields should be defined by the existing ThreadLens repository
module.

------------------------------------------------------------------------

# 9. Commit History Options

The user can choose:

``` text
ALL
```

All available commits in the requested scope.

``` text
LAST_N
```

Example:

``` text
last_n = 10
```

``` text
SELECTED
```

User explicitly selects commits.

``` text
RANDOM
```

A random selection from a defined scope.

### Random selection requirement

Random selections must record enough information to make the checkpoint
reproducible.

For example:

``` json
{
  "selection_mode": "random",
  "count": 10,
  "seed": "selection-seed"
}
```

Without recording the selection information, the same checkpoint cannot
reliably be reconstructed later.

------------------------------------------------------------------------

# 10. Findings

The user can choose:

``` text
All findings
Selected findings
Findings by severity
Findings by scan
Custom selection
```

Example:

``` json
{
  "block_type": "findings",
  "data": {
    "selection_mode": "all",
    "findings": []
  }
}
```

------------------------------------------------------------------------

# 11. Attack Reports

Attack reports can be included independently from findings.

Possible modes:

``` text
ALL
LAST_N
SELECTED
BY_ATTACK_TYPE
BY_TARGET
CUSTOM
```

This distinction is important because:

``` text
Finding
```

and

``` text
Attack Report
```

are not necessarily the same entity.

A finding may represent a discovered vulnerability, while an attack
report can contain the details/results of a simulated or executed
security test.

------------------------------------------------------------------------

# 12. Account Data

Account data should be explicitly opt-in.

Example:

``` text
Account data
[x] Include
```

Only the account information approved for checkpointing should be
serialized.

Sensitive credentials, passwords, access tokens, private keys, secrets,
or other security-sensitive material should never be included merely
because the user selected "account data."

The checkpoint builder should use an explicit allowlist of fields.

------------------------------------------------------------------------

# 13. Usage Data

Usage can be represented as a separate block.

Examples:

``` text
API usage
AI usage
Scan count
Attack count
Resource usage
Usage period
Quota statistics
```

Example:

``` json
{
  "block_type": "usage",
  "data": {
    "period": "2026-08",
    "scan_count": 42,
    "attack_count": 18
  }
}
```

The exact fields depend on the ThreadLens usage model.

------------------------------------------------------------------------

# 14. Chat History

Chat history should support flexible selection.

Possible options:

``` text
FULL
SELECTED_CONVERSATIONS
SELECTED_MESSAGES
LAST_N
DATE_RANGE
CUSTOM
```

Example:

``` json
{
  "block_type": "chat_history",
  "data": {
    "mode": "selected_conversations",
    "conversation_ids": [
      "chat_001",
      "chat_008"
    ]
  }
}
```

If privacy or sensitive-data handling is a concern, the checkpoint
builder should make chat inclusion explicitly opt-in.

------------------------------------------------------------------------

# 15. Custom Blocks

The architecture should allow future ThreadLens modules to participate
without redesigning the entire chain.

Conceptually:

``` json
{
  "block_type": "custom",
  "type": "module_specific_type",
  "data": {}
}
```

The chain engine should not need to understand every possible custom
block.

It only needs to:

1.  Serialize the block canonically.
2.  Include the previous hash.
3.  Calculate the current hash.
4.  Append the block.

This makes the integrity layer modular.

------------------------------------------------------------------------

# 16. Internal JSON Block Structure

A recommended conceptual block:

``` json
{
  "block_index": 3,
  "block_type": "attack_report",
  "created_at": "2026-08-31T10:30:00Z",
  "data": {
    "attack_id": "attack_123",
    "result": {}
  },
  "previous_hash": "8b7c...",
  "current_hash": "2a91..."
}
```

The exact field names can be finalized during implementation.

The important rule is:

> `current_hash` must commit to the block's meaningful contents and its
> `previous_hash`.

------------------------------------------------------------------------

# 17. Hash Chain

The chain should follow:

``` text
Block 0
previous_hash = null
current_hash = H(Block 0)

Block 1
previous_hash = Block 0.current_hash
current_hash = H(Block 1 + previous_hash)

Block 2
previous_hash = Block 1.current_hash
current_hash = H(Block 2 + previous_hash)

...

Block N
previous_hash = Block N-1.current_hash
current_hash = H(Block N + previous_hash)
```

Diagram:

``` mermaid
flowchart LR
    B0["Block 0<br/>prev = null<br/>hash = H0"]
    B1["Block 1<br/>prev = H0<br/>hash = H1"]
    B2["Block 2<br/>prev = H1<br/>hash = H2"]
    BN["Block N<br/>prev = H(N-1)<br/>hash = HN"]

    B0 --> B1 --> B2 --> BN

    BN --> FINAL["Final Chain Integrity Hash<br/>= HN"]
```

------------------------------------------------------------------------

# 18. Why the Final Hash Represents the Chain

Because every block commits to the previous block:

``` text
H0
 ↓
H1 includes H0
 ↓
H2 includes H1
 ↓
H3 includes H2
 ↓
...
 ↓
HN includes H(N-1)
```

Changing an earlier block causes its hash to change.

That breaks the next block's `previous_hash`, which propagates through
the remainder of the chain.

Therefore:

``` text
Final Hash
    |
    +-- indirectly commits to Block N
    +-- indirectly commits to Block N-1
    +-- indirectly commits to Block N-2
    +-- ...
    +-- indirectly commits to Block 0
```

So the final block hash is sufficient as the **integrity commitment for
the complete chain**.

------------------------------------------------------------------------

# 19. Canonical JSON Is Mandatory

Raw JSON text should not be hashed directly without deterministic
serialization.

These can represent the same logical object:

``` json
{"a":1,"b":2}
```

and:

``` json
{
  "b": 2,
  "a": 1
}
```

but their raw byte representations differ.

Therefore:

``` mermaid
flowchart LR
    A[Logical Block Data] --> B[Canonical Serialization]
    B --> C[UTF-8 Bytes]
    C --> D[Hash Function]
    D --> E[Current Hash]
```

The implementation should define deterministic rules for:

-   Key ordering
-   Whitespace
-   Number representation
-   String encoding
-   Null handling
-   Array ordering

The same logical block must always produce the same canonical
representation.

------------------------------------------------------------------------

# 20. Internal Chain Immutability

Once a checkpoint is created:

``` text
Checkpoint V1
    |
    +-- Block 0
    +-- Block 1
    +-- Block 2
    |
    +-- Final Hash = H123
```

The existing chain should not be edited.

If the user changes the checkpoint configuration:

``` text
Checkpoint V1
    |
    +-- H123

        USER CHANGES CONFIGURATION

Checkpoint V2
    |
    +-- H456
```

Create a new chain/checkpoint instead of modifying the old one.

This preserves the meaning of the original integrity proof.

------------------------------------------------------------------------

# 21. User Ownership and Portability

ThreadLens should retain a server-side copy for convenience, but the
user should be able to export the chain.

``` mermaid
flowchart TD
    A[Internal Chain Created] --> B[ThreadLens DB]
    A --> C[Export JSON]
    C --> D[User Controlled Storage]

    D --> E[Local File]
    D --> F[Cloud Storage]
    D --> G[Offline Archive]
    D --> H[Other Storage]
```

The user is therefore not permanently dependent on ThreadLens for
preservation of the checkpoint artifact.

This is an important product property:

> **ThreadLens creates the proof, but the user can own and preserve the
> resulting artifact independently.**

------------------------------------------------------------------------

# 22. Verification Without Ethereum

A user can upload or paste an internal chain.

``` mermaid
flowchart TD
    A[Paste / Upload JSON] --> B[Parse JSON]
    B --> C[Validate Block Structure]
    C --> D[Validate Previous Hash Links]
    D --> E[Recalculate Block Hashes]
    E --> F[Calculate Final Hash]
    F --> G{Hashes Match?}

    G -->|Yes| H[Internal Chain Valid]
    G -->|No| I[Integrity Failed]
```

This verifies whether the supplied chain is internally consistent.

It does **not**, by itself, prove that the data was historically true.

It proves that the chain has not been modified relative to its own
cryptographic links.

------------------------------------------------------------------------

# 23. Ethereum-Backed Verification

For a blockchain-anchored checkpoint:

``` mermaid
flowchart TD
    A[Uploaded Checkpoint JSON] --> B[Rebuild / Verify Internal Chain]
    B --> C[Calculate Final Chain Hash]
    C --> D[Find Ethereum Anchor]
    D --> E[Read Anchored Chain Hash]
    E --> F{Hashes Match?}

    F -->|Yes| G[Blockchain Anchor Matches]
    F -->|No| H[Blockchain Anchor Mismatch]

    G --> I[Verified]
    H --> J[Verification Failed]
```

The two checks are separate:

``` text
Internal Chain Verification
        +
Ethereum Anchor Verification
        =
Blockchain-backed checkpoint verification
```

------------------------------------------------------------------------

# 24. Important Separation: Ethereum Data Must Not Enter the Internal Chain

This is a deliberate architectural rule.

Do **not** do:

``` text
Internal Chain
    |
    +-- Block 0
    +-- Block 1
    +-- Block 2
    +-- Ethereum transaction
```

because adding Ethereum transaction data after anchoring would modify
the chain's contents and therefore change its final hash.

That creates unnecessary dependency:

``` text
Chain hash
   ↓
Ethereum transaction
   ↓
Transaction data
   ↓
would need to be added back to chain
   ↓
chain hash changes
```

Instead:

``` text
             Internal Chain
                   |
                   v
            Final Chain Hash
                   |
          ┌────────┴────────┐
          │                 │
          v                 v
      ThreadLens DB      Ethereum
          │                 │
          │                 v
          │             TX Hash
          │                 │
          └──────┬──────────┘
                 v
          Account Association
```

The internal chain is complete before Ethereum anchoring.

------------------------------------------------------------------------

# 25. Ethereum Anchor Model

The Ethereum side should be deliberately minimal.

Conceptually:

``` text
Anchor
{
    account / submitter,
    chain_id_1 -> chain_hash_1,
    chain_id_2 -> chain_hash_2,
    chain_id_3 -> chain_hash_3,
    ...
}
```

The actual Solidity representation may use mappings/arrays/structs
according to gas and implementation requirements, but the product-level
model remains:

``` text
chain_id → chain_hash
```

This avoids putting large checkpoint data on Ethereum.

------------------------------------------------------------------------

# 26. Multiple Chains in One Ethereum Transaction

A major feature is allowing the user to select **one or many existing
internal chains** for anchoring.

Example:

``` text
Available chains

[x] Production Audit       chain_001
[x] Pre-deployment Audit   chain_002
[x] Security Review        chain_003
[ ] Development Snapshot  chain_004

             ↓

        Anchor Selected

             ↓

One Ethereum Transaction
```

Conceptually:

``` mermaid
flowchart TD
    A[Chain 001] --> E[Batch Anchor Request]
    B[Chain 002] --> E
    C[Chain 003] --> E
    D[Chain 004] --> E

    E --> F["{ chain_id → chain_hash }"]
    F --> G[Ethereum Smart Contract]
    G --> H[One Ethereum Transaction]
```

This lets multiple internal chains share one transaction rather than
requiring:

``` text
Chain 1 → TX 1
Chain 2 → TX 2
Chain 3 → TX 3
```

Instead:

``` text
Chain 1 ─┐
Chain 2 ─┤
Chain 3 ─┘
         ↓
       TX 1
```

This reduces unnecessary transaction overhead and makes the Pro feature
more attractive.

------------------------------------------------------------------------

# 27. Why No Merkle Tree for the Hackathon

A Merkle tree could reduce or optimize certain proof structures, but it
is intentionally **not part of the initial ThreadLens design**.

The current requirement is straightforward:

``` text
chain_id → chain_hash
```

Advantages for the hackathon:

-   Easier smart contract
-   Easier backend integration
-   Easier verification
-   Easier database model
-   Easier frontend explanation
-   Easier demo
-   No additional proof-generation/verification layer
-   No need to explain Merkle proofs to judges

The architecture can be optimized later if real transaction-size or gas
measurements justify it.

------------------------------------------------------------------------

# 28. Database Relationship

ThreadLens should keep blockchain information separate from chain
blocks.

Conceptually:

``` mermaid
erDiagram
    ACCOUNT ||--o{ INTERNAL_CHAIN : owns
    INTERNAL_CHAIN ||--|{ CHAIN_BLOCK : contains
    ACCOUNT ||--o{ BLOCKCHAIN_ANCHOR : creates
    BLOCKCHAIN_ANCHOR ||--|{ ANCHORED_CHAIN : contains
    INTERNAL_CHAIN ||--o{ ANCHORED_CHAIN : referenced_by

    ACCOUNT {
        id account_id
        string plan
        string wallet_address
    }

    INTERNAL_CHAIN {
        id chain_id
        id account_id
        string final_hash
    }

    CHAIN_BLOCK {
        id block_id
        id chain_id
        int block_index
        string previous_hash
        string current_hash
        json data
    }

    BLOCKCHAIN_ANCHOR {
        id anchor_id
        id account_id
        string network
        string contract_address
        string transaction_hash
        string block_number
        string status
    }

    ANCHORED_CHAIN {
        id anchor_id
        id chain_id
        string chain_hash
    }
```

This means:

``` text
Internal chain
     ≠
Ethereum anchor
```

but both can be associated through the account and anchor relationship.

------------------------------------------------------------------------

# 29. Suggested Anchor Lifecycle

``` mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Created: Internal chain generated
    Created --> Stored: Saved in ThreadLens DB
    Stored --> Selected: User selects for anchoring
    Selected --> Submitted: Ethereum transaction submitted
    Submitted --> Confirmed: Transaction confirmed
    Submitted --> Failed: Transaction failed
    Failed --> Selected: Retry
    Confirmed --> Verified
    Verified --> [*]
```

Possible states:

``` text
DRAFT
CREATED
STORED
SELECTED
SUBMITTED
CONFIRMED
FAILED
VERIFIED
```

------------------------------------------------------------------------

# 30. Blockchain Data Flow

``` mermaid
sequenceDiagram
    participant User
    participant ThreadLens
    participant DB
    participant Contract
    participant Ethereum

    User->>ThreadLens: Create checkpoint
    ThreadLens->>ThreadLens: Apply user configuration
    ThreadLens->>ThreadLens: Build JSON blocks
    ThreadLens->>ThreadLens: Calculate hash chain
    ThreadLens->>DB: Store checkpoint + chain
    ThreadLens-->>User: Checkpoint created

    User->>ThreadLens: Select one or more chains for Ethereum anchor
    ThreadLens->>DB: Load selected chain hashes
    ThreadLens->>Contract: Submit chain_id → chain_hash mapping
    Contract->>Ethereum: Transaction
    Ethereum-->>Contract: Confirm transaction
    Contract-->>ThreadLens: Anchor confirmation
    ThreadLens->>DB: Store TX + block + anchor metadata
    ThreadLens-->>User: Blockchain anchor confirmed
```

------------------------------------------------------------------------

# 31. Verification Data Flow

``` mermaid
sequenceDiagram
    participant User
    participant Verifier
    participant DB
    participant Ethereum

    User->>Verifier: Upload / paste checkpoint JSON
    Verifier->>Verifier: Validate JSON
    Verifier->>Verifier: Recalculate hash chain
    Verifier->>Verifier: Calculate final chain hash

    alt Internal verification only
        Verifier-->>User: Internal chain valid / invalid
    else Ethereum-backed verification
        Verifier->>DB: Find anchor metadata
        DB-->>Verifier: Contract + transaction + chain reference
        Verifier->>Ethereum: Read anchor
        Ethereum-->>Verifier: Anchored chain hash
        Verifier->>Verifier: Compare hashes
        Verifier-->>User: Verified / mismatch
    end
```

------------------------------------------------------------------------

# 32. Account and Wallet Relationship

The ThreadLens account and blockchain wallet should not be treated as
the same identity.

``` mermaid
flowchart LR
    A[ThreadLens Account] --> B[Account ID]
    A --> C[Subscription / Plan]
    A --> D[Checkpoint Ownership]

    A -. association .-> E[Blockchain Wallet]
    E --> F[Wallet Address]
    E --> G[Network]
```

The blockchain wallet address can be associated with the account.

Private keys should be handled through a dedicated secure signing
mechanism and should not be stored as ordinary database fields.

------------------------------------------------------------------------

# 33. Free vs Pro Product Model

The blockchain design also supports a clean revenue model.

## Free Tier

Possible offering:

-   One internal integrity chain
-   Custom checkpoint configuration
-   Export checkpoint JSON
-   Import/paste checkpoint JSON
-   Internal chain verification
-   ThreadLens copy/storage

The exact quota can be adjusted later.

## Pro Tier

Possible offering:

-   Multiple internal chains
-   Higher checkpoint limits
-   Ethereum anchoring
-   Anchor multiple chains in one transaction
-   Blockchain-backed verification
-   Extended history/storage
-   Other premium ThreadLens capabilities

The important product distinction is:

> **Free protects and verifies state. Pro provides externally anchored
> proof.**

------------------------------------------------------------------------

# 34. Revenue Story

The blockchain feature should not be pitched as:

> "Users pay because Ethereum costs gas."

Instead:

> **"ThreadLens Pro provides independently verifiable security evidence
> through optional blockchain anchoring."**

Value proposition:

``` text
ThreadLens
    |
    +-- Security analysis
    +-- Evidence collection
    +-- Custom checkpoint
    +-- Cryptographic integrity
    |
    +-- Pro
         |
         +-- External Ethereum anchoring
         +-- Multi-chain batch anchoring
         +-- Blockchain-backed verification
```

The blockchain becomes a **premium trust feature**, not the entire
product.

------------------------------------------------------------------------

# 35. Why Blockchain Has a Real Purpose Here

Without blockchain:

``` text
ThreadLens DB
     |
     +-- "This checkpoint had hash ABC123."
```

ThreadLens controls the database.

With Ethereum:

``` text
ThreadLens checkpoint
       |
       +-- Final hash = ABC123
                    |
                    v
              Ethereum
                    |
                    +-- ABC123
                    +-- transaction
                    +-- public chain history
```

ThreadLens can now demonstrate that a particular hash was anchored
externally.

The value is therefore:

-   External anchoring
-   Tamper-evident evidence
-   Publicly verifiable transaction history
-   Separation from ThreadLens-only storage
-   Portable user-owned checkpoint artifact

------------------------------------------------------------------------

# 36. What Blockchain Does NOT Do

The system should explicitly avoid claiming that blockchain proves the
truth of the underlying data.

Blockchain proves that:

> A particular hash was committed/anchored at a particular point on the
> blockchain.

It does not automatically prove:

> The repository actually contained what the checkpoint claims.

The security model is therefore:

``` text
ThreadLens data collection
        +
Canonical serialization
        +
Hash chain
        +
Optional Ethereum anchoring
```

Blockchain provides the external integrity anchor; ThreadLens's
collection process determines what was captured.

------------------------------------------------------------------------

# 37. Complete System Diagram

``` mermaid
flowchart TB
    USER[ThreadLens User]

    USER --> BUILDER[Checkpoint Builder]

    BUILDER --> REPO[Repository State]
    BUILDER --> COMMITS[Commit History]
    BUILDER --> FINDINGS[Findings]
    BUILDER --> ATTACKS[Attack Reports]
    BUILDER --> ACCOUNT[Allowed Account Data]
    BUILDER --> USAGE[Usage]
    BUILDER --> CHAT[Chat History]
    BUILDER --> CUSTOM[Custom Blocks]

    REPO --> SERIALIZER[Canonical JSON Serializer]
    COMMITS --> SERIALIZER
    FINDINGS --> SERIALIZER
    ATTACKS --> SERIALIZER
    ACCOUNT --> SERIALIZER
    USAGE --> SERIALIZER
    CHAT --> SERIALIZER
    CUSTOM --> SERIALIZER

    SERIALIZER --> CHAIN[Internal Hash Chain]

    CHAIN --> BLOCKS[JSON Blocks]
    CHAIN --> FINAL[Final Block Current Hash]

    BLOCKS --> DB[(ThreadLens Database)]
    FINAL --> DB

    CHAIN --> EXPORT[Export JSON]
    EXPORT --> USER_STORAGE[User Controlled Storage]

    FINAL --> SELECTOR{Ethereum Anchoring?}

    SELECTOR -->|No| DONE[Checkpoint Complete]

    SELECTOR -->|Yes / Pro| MULTI[Select One or More Chains]

    MULTI --> MAP["chain_id → chain_hash"]
    MAP --> CONTRACT[ThreadLens Ethereum Smart Contract]
    CONTRACT --> ETH[Ethereum Network]

    ETH --> TX[Transaction / Block]
    TX --> ANCHORDB[(Anchor Metadata in DB)]

    USER_STORAGE --> VERIFY[Verification Engine]
    VERIFY --> LOCAL[Internal Chain Verification]

    LOCAL --> ETHCHECK{Ethereum Anchor?}

    ETHCHECK -->|No| LOCALRESULT[Internal Integrity Result]
    ETHCHECK -->|Yes| ETHVERIFY[Read Ethereum Anchor]
    ETHVERIFY --> ETHRESULT[Blockchain Match Result]

    LOCALRESULT --> RESULT[Final Verification Result]
    ETHRESULT --> RESULT
```

------------------------------------------------------------------------

# 38. Recommended Implementation Modules

A clean backend separation could look like:

``` text
blockchain/
│
├── checkpoint/
│   ├── builder
│   ├── selectors
│   ├── serializers
│   └── validators
│
├── chain/
│   ├── block
│   ├── hash
│   ├── builder
│   └── verifier
│
├── ethereum/
│   ├── contract
│   ├── client
│   ├── anchor
│   └── verifier
│
└── models/
    ├── checkpoint
    ├── internal_chain
    ├── chain_block
    └── blockchain_anchor
```

Exact module placement should follow the existing ThreadLens backend
structure.

------------------------------------------------------------------------

# 39. Recommended API-Level Concepts

The implementation can expose APIs conceptually similar to:

``` text
POST   /checkpoints
GET    /checkpoints
GET    /checkpoints/{checkpoint_id}
GET    /checkpoints/{checkpoint_id}/export
POST   /checkpoints/verify

POST   /blockchain/anchors
GET    /blockchain/anchors
GET    /blockchain/anchors/{anchor_id}
POST   /blockchain/verify
```

These are architectural concepts, not final route commitments. Existing
ThreadLens route conventions should determine the final API paths.

------------------------------------------------------------------------

# 40. Checkpoint Creation Sequence

``` text
1. User opens Checkpoint Builder.

2. User selects what to include.

3. User selects scopes/modes:
   - Full
   - Last N
   - Selected
   - Random
   - Custom

4. ThreadLens resolves the selected data.

5. ThreadLens creates deterministic JSON block data.

6. ThreadLens canonicalizes each block.

7. ThreadLens hashes Block 0.

8. ThreadLens adds Block 1 using Block 0's hash.

9. Repeat until all blocks are created.

10. Final block's current_hash becomes:
       chain_integrity_hash

11. ThreadLens stores the checkpoint/chain.

12. User may export the JSON.

13. Optionally, Pro user selects one or more chains for Ethereum anchoring.

14. ThreadLens sends:
       chain_id → chain_hash

15. Ethereum confirms the transaction.

16. ThreadLens stores transaction/anchor metadata separately.
```

------------------------------------------------------------------------

# 41. Verification Sequence

``` text
1. User pastes/uploads JSON.

2. ThreadLens validates the JSON schema.

3. ThreadLens validates block ordering.

4. ThreadLens validates previous_hash links.

5. ThreadLens recalculates every current_hash.

6. ThreadLens calculates the final chain hash.

7. If no Ethereum anchor is requested:
       return internal integrity result.

8. If Ethereum verification is requested:
       locate the relevant anchor.

9. Read the corresponding chain hash from Ethereum.

10. Compare:

       calculated_hash
              ==
       anchored_hash

11. Return verification result.
```

------------------------------------------------------------------------

# 42. Security Rules

The initial implementation should enforce these rules:

### Rule 1 --- No private keys in checkpoint JSON

Never include:

-   Private keys
-   Seed phrases
-   Passwords
-   API secrets
-   Access tokens
-   Session tokens

unless there is an explicitly designed, secure secret-handling system
--- which is outside the purpose of this checkpoint feature.

### Rule 2 --- Account data uses an allowlist

"Include account data" should not mean "serialize the entire user
database record."

Only approved fields should be included.

### Rule 3 --- Canonicalize before hashing

Never depend on arbitrary JSON formatting.

### Rule 4 --- Don't modify completed chains

Create a new checkpoint when state/configuration changes.

### Rule 5 --- Ethereum metadata stays outside the chain

The Ethereum transaction must not modify the internal chain.

### Rule 6 --- Store blockchain metadata separately

Transaction details belong to the blockchain anchor entity/table,
associated with the account and anchored chains.

------------------------------------------------------------------------

# 43. Hackathon Demo Flow

A strong demo can be:

``` text
1. Open ThreadLens.

2. Create checkpoint:
   "Before Production Deployment"

3. Select:
   ✓ Full repository state
   ✓ Last 10 commits
   ✓ All findings
   ✓ Selected attack reports
   ✓ Usage
   ✗ Chat history

4. ThreadLens generates:
   8 JSON blocks

5. Show:
   Block 0 → Block 1 → ... → Block 7

6. Show:
   Final Chain Hash

7. Export JSON.

8. Create two more checkpoints.

9. Select all three.

10. Click:
    "Anchor to Ethereum"

11. Show:
    3 chains
    1 Ethereum transaction

12. Show:
    chain_id → chain_hash

13. Upload one exported JSON.

14. Run verification.

15. Show:
    Internal Chain: VALID
    Ethereum Anchor: MATCH
    Overall: VERIFIED

16. Modify one value in the JSON.

17. Verify again.

18. Show:
    Internal Chain: INVALID
    Ethereum Anchor: MISMATCH
    Overall: FAILED
```

This demonstrates the value of every major component without requiring
the judges to understand complicated blockchain infrastructure.

------------------------------------------------------------------------

# 44. Final Architecture Decision

The ThreadLens blockchain subsystem is defined as:

``` text
                    THREADLENS
                        |
                        v
             User-created Checkpoint
                        |
                        v
             Fully customizable selection
                        |
                        v
              Canonical JSON blocks
                        |
                        v
               Hash-linked chain
                        |
                        v
           Final block current_hash
                        |
                Chain Integrity Hash
                        |
            +-----------+-----------+
            |                       |
            v                       v
      ThreadLens DB            User Export
            |                       |
            |                       v
            |                Independent Storage
            |
            v
    Optional Pro Anchoring
            |
            v
     Select 1 or many chains
            |
            v
    { chain_id : chain_hash }
            |
            v
    Ethereum Smart Contract
            |
            v
      One Ethereum TX
            |
            v
   Anchor metadata → ThreadLens DB
```

### Core design principles

**1. On-demand**\
Blockchain is only used when explicitly requested.

**2. User configurable**\
The user decides what the checkpoint contains.

**3. Portable**\
The resulting JSON chain can be exported and independently stored.

**4. Tamper-evident**\
Every block commits to the previous block.

**5. Simple verification**\
Recalculate the chain and compare the final hash.

**6. Ethereum is optional**\
The internal integrity chain works without blockchain.

**7. Ethereum is external**\
Ethereum provides an independent anchor rather than becoming part of the
internal chain.

**8. Multi-chain batching**\
One Ethereum transaction can anchor multiple internal chains.

**9. Simple contract model**\
Use `chain_id → chain_hash` rather than introducing Merkle-tree
complexity.

**10. Monetizable**\
Internal checkpointing can be a Free feature; Ethereum anchoring and
higher chain limits can form part of Pro.

------------------------------------------------------------------------

# 45. One-Line Product Definition

> **ThreadLens Integrity Checkpoints let users create customizable,
> portable, tamper-evident snapshots of their repository and security
> state, with optional Ethereum anchoring that allows one or multiple
> checkpoint chains to be externally verified.**
