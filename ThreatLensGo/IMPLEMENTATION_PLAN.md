# 🛡️ ThreatLensGo Codebase Intelligence & Agentic TUI: Unified Implementation Plan

This implementation plan defines the complete engineering roadmap for building the AST-driven Codebase Intelligence Engine, Event-Driven TUI Bridge, Persistent Indexing, Dependency Graph, Security Remediation Verification, and Multi-Language Adapters for ThreatLensGo.

---

## 🏗️ Architecture & Component Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                   ThreatLensGo Terminal UI (React / Ink)                │
│                                                                        │
│  ┌──────────────────────┐   AgentEvent Stream   ┌───────────────────┐  │
│  │   Existing Chat TUI  │ ◄──────────────────── │  AgentController  │  │
│  │  - Streaming tokens  │                       │   (Event Bridge)  │  │
│  │  - Live tool badges  │ ────────────────────► │  - submitQuery()  │  │
│  │  - Diff approval box │    User Actions       │  - approveDiff()  │  │
│  │    (DiffPayload)     │   (Approve / Reject)  │  - cancel()       │  │
│  └──────────────────────┘                       └───────────────────┘  │
└───────────────────────────────────────────────────┬────────────────────┘
                                                    │ Worker Thread / IPC
┌───────────────────────────────────────────────────▼────────────────────┐
│                    Codebase Intelligence & Agent Engine                │
│                                                                        │
│  ┌────────────────────────┐  Autonomous Loop   ┌───────────────────┐   │
│  │      Agent Tools       │ ◄─────────────────►│ Multi-Turn LLM    │   │
│  │ - search_code (Ripgrep)│                    │ (Plan-Search-Read-│   │
│  │ - find_symbol (AST)    │                    │  Edit-Verify-Fix) │   │
│  │ - read_file / edit_file│                    └───────────────────┘   │
│  │ - run_sectest / verify │                                            │
│  └───────────┬────────────┘                                            │
│              │                                                         │
│  ┌───────────▼──────────────────────────────────────────────────────┐  │
│  │                  Unified Search & Graph Engine                   │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐  │  │
│  │  │ AST Symbol Store │  │ Dependency Graph │  │ Ripgrep Engine │  │  │
│  │  │ (Tree-sitter TS) │  │ (Imports/Calls)  │  │(@vscode/rg)    │  │  │
│  │  └────────┬─────────┘  └────────┬─────────┘  └───────┬────────┘  │  │
│  │           └─────────────────────┼────────────────────┘           │  │
│  │                                 ▼                                │  │
│  │                      Persistent SQLite Index                     │  │
│  │                     (files, symbols, hashes)                     │  │
│  │                                 ▲                                │  │
│  │                        Chokidar Watcher                          │  │
│  │                      (Live Delta Updates)                        │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ 15-Step Detailed Roadmap

### 📦 Phase 1: TUI Bridge & Event Wiring (Walking Skeleton)

#### Step 0: Event Bus Contract, Diff Types & Configuration
* **Goal**: Define the bidirectional TypeScript communication contract and unified `DiffApprovalPayload` shape between the TUI and the agent engine.
* **Tasks**:
  * Define `DiffApprovalPayload`:
    ```typescript
    export interface DiffApprovalPayload {
      file: string;
      originalContent: string;
      newContent: string;
      patch: string; // Unified diff format for syntax highlighting
      description: string;
    }
    ```
  * Define `AgentEvent` types: `token`, `tool_start`, `tool_result`, `require_approval` (wrapping `DiffApprovalPayload`), `status`, `done`, `error`.
  * Define `AgentController` interface: `submitQuery()`, `approveDiff()`, `rejectDiff(reason?)`, `cancel()`, `onEvent()`.
  * Create `agentConfig.ts` with configurable per-tool timeout defaults.
* **Milestone**: Types compiled and exported cleanly without runtime dependencies.

#### Step 1: Mock Agent TUI Spike
* **Goal**: Prove that streaming text, tool status pills, and approval pauses work inside your existing Chat TUI using the exact `DiffApprovalPayload` contract.
* **Tasks**:
  * Implement a `MockAgentController` that simulates delayed token streaming, emits a fake tool badge (`⚡ [Ripgrep] Searching "auth"`), and triggers a fake diff approval request.
  * Connect the mock controller to your existing Chat TUI state.
  * Implement interactive user input pause (`[A]pprove` / `[R]eject` / `[C]ancel`) that resumes the mock agent.
* **Milestone**: You can type a message in your real TUI and watch a realistic multi-step agent flow execute live with full approval gate interaction.

---

### 🌲 Phase 2: File Ingestion & AST Extraction

#### Step 2: File Scanner & Language Detection
* **Goal**: Traverse the project directory, respect `.gitignore`, compute hashes, and detect languages.
* **Tasks**:
  * Build recursive directory walker ignoring `.git`, `node_modules`, `dist`, `build`, and binaries.
  * Compute SHA-256 / xxhash content hashes and record file size and modified timestamp.
  * Detect languages (`.ts`, `.tsx`, `.js`, `.py`).
* **Milestone**: Running scanner against ThreatLens prints a clean JSON manifest of indexed files and detected languages.

#### Step 3: Tree-sitter WASM Binding Spike
* **Goal**: Validate cross-platform Tree-sitter bindings without C++ native compilation dependencies.
* **Tasks**:
  * Install `web-tree-sitter` and vendor `tree-sitter-typescript.wasm` and `tree-sitter-javascript.wasm`.
  * Write a 20-line standalone spike parsing a single TypeScript file.
* **Milestone**: Successfully extracts the root AST node of a TypeScript file in `< 20ms`.

#### Step 4: Granular AST Structural Symbol Extraction (3 Sub-Steps)
* **Step 4a: Functions Only**
  * Write Tree-sitter queries strictly for standard function declarations and exported functions.
  * Run against a real project file and confirm exact name, parameters, and start/end line numbers.
* **Step 4b: Classes, Methods & Type Constructs**
  * Incrementally extend queries to:
    * Class declarations and methods (getters/setters/async methods).
    * Interfaces, type aliases, and enums.
  * Re-run against the same test file after each addition to verify incremental changes without regressions.
* **Step 4c: Fixture Edge-Case Resolution**
  * Feed the extractor the Step 5 fixture file (arrow functions, decorators, overloaded signatures, JSX tags).
  * Fix extraction edge cases one fixture case at a time.
* **Milestone**: Extractor correctly captures all symbols and line ranges across standard and complex TypeScript constructs.

#### Step 5: Extraction Fixture Test Suite
* **Goal**: Formalize automated regression suite for AST extraction.
* **Tasks**:
  * Create a synthetic fixture directory containing known edge cases.
  * Write automated tests asserting that the extractor captures 100% of expected symbols.
* **Milestone**: Automated test passes 100% and catches any future AST regressions.

---

### 💾 Phase 3: Persistence, Watcher & Dependency Graph

#### Step 6: SQLite Persistent Index
* **Goal**: Save file metadata and symbols to SQLite for instant boot-ups.
* **Tasks**:
  * Set up SQLite schema: `files` (id, path, hash, mtime, language) and `symbols` (id, file_id, name, kind, start_line, end_line).
  * Add B-tree indexes on `symbols.name` and `files.path`.
  * Build startup hash reconciler: skip re-parsing files whose content hash matches SQLite.
* **Milestone**: Restarting the CLI on an unchanged workspace completes in `< 10ms` with zero re-parsing.

#### Step 7: Live Chokidar Filesystem Watcher
* **Goal**: Incrementally update SQLite on file changes in real-time.
* **Tasks**:
  * Initialize `chokidar` on workspace files.
  * On `change`/`add`: re-parse AST and update SQLite records for that single file.
  * On `unlink`: remove file and cascade delete its symbols.
* **Milestone**: Modifying a function in an external editor updates SQLite in `< 50ms`.

#### Step 8: Layered Import Resolver & Dependency Graph (3 Sub-Steps)
* **Step 8a: Basic Relative Resolution**
  * Extract `import`, `export`, and `require()` paths.
  * Resolve basic relative paths (`./foo`, `../bar/baz`) to absolute file paths.
  * Verify against 2–3 real project files.
* **Step 8b: Directory & Extensionless Fallback Resolution**
  * Add support for extensionless imports (`./utils` → `./utils.ts` / `./utils.tsx`).
  * Add directory index fallbacks (`./services` → `./services/index.ts`).
  * Verify resolution against real nested directories.
* **Step 8c: Circular Imports & Graph Traversal**
  * Create a dedicated circular import fixture (`A -> B -> A`).
  * Implement cycle-safe graph traversal algorithms (`getDependencies(file)`, `getDependents(file)`).
  * Verify full resolution without infinite recursion.
* **Milestone**: Querying a service file returns all controllers that import it, with 100% fixture test pass.

---

### 🔍 Phase 4: Unified Search & Agent Tools (Generic + Security)

#### Step 9: Vendored Ripgrep & Unified Search Engine
* **Goal**: Combine raw text search, symbol search, and dependency graph traversal into one search API.
* **Tasks**:
  * Vendor `@vscode/ripgrep` for zero-install, cross-platform text/regex search.
  * Build unified search module:
    * `search.symbol(query)` → SQLite AST symbols
    * `search.text(query, { regex, glob })` → Ripgrep
    * `search.dependencies(file)` → Dependency graph
  * **Search Fixture Test**: Assert exact symbol matches rank above partial regex substring matches.
* **Milestone**: Single search module executes all three search types against the codebase with verified ranking.

#### Step 10: Standard Codebase Tool Definitions
* **Goal**: Expose standard codebase navigation and modification tools as structured LLM functions producing strict `DiffApprovalPayload` objects.
* **Tasks**:
  * Define and unit-test tool wrappers:
    * `search_code({ query, mode })`
    * `find_symbol({ name })`
    * `read_file({ path, startLine, endLine })`
    * `edit_file({ path, oldContent, newContent })` → generates `DiffApprovalPayload`
    * `list_directory({ path })`
* **Milestone**: Each tool executes standalone with strict argument validation and produces diff shapes matching Step 0's contract.

#### Step 11: Sequenced Security Verification & Harness Hardening (4 Sub-Steps)
* **Step 11a: Read-Only Sectest Harness Audit (No Code)**
  * Audit `sectest/modules/injection.py`, `auth.py`, and `exposure.py`.
  * Document and report exact payload arrays (e.g. `SQLI_PROBES = ["' OR '1'='1", "1' ORDER BY 999--", "'"]`) and error signature coverage.
* **Step 11b: Expand Harness Payload Diversity (If Needed)**
  * If audit reveals single-shot or narrow probes, expand payload vectors (tautology, error-based, comment truncation, stacked queries) in `sectest`.
  * Obtain explicit review of harness changes.
* **Step 11c: Define Security Tool Wrappers**
  * Implement standalone wrappers:
    * `run_sectest({ suite: 'sqli' | 'xss' | 'ddos' | 'rateLimit', targetUrl })`
    * `verify_remediation({ vulnerabilityType, file, patch })`
  * Unit test wrappers against running mock endpoints.
* **Step 11d: Target-Reload Check & 3-Way Discriminative Fixture**
  * Add server reload/sync healthcheck in `verify_remediation` confirming the target has reloaded the patched file before probing.
  * Write the 3-case discriminative fixture test:
    * Case A: Known vulnerable endpoint → reports **Vulnerable**.
    * Case B: Flawed patch (naive string replace of one payload) → reports **Vulnerable** (catches false negatives).
    * Case C: Parameterized query fix → reports **Remediated**.
* **Milestone**: Verification engine reliably discriminates genuine fixes from flawed patches against a live reloaded target.

---

### 🤖 Phase 5: Autonomous Loop & TUI Integration

#### Step 12: Headless Autonomous Security Remediation Loop
* **Goal**: Build the multi-turn agent planning and execution loop in console mode, verifying the end-to-end security workflow headless.
* **Tasks**:
  * Implement LLM orchestration: system prompt, tool dispatch, history trimming, and error feedback loop.
  * Run headless test scenario:  
    *"Audit the backend for SQL injection in user authentication, patch the query, and run sectest to verify."*
* **Milestone**: Headless agent autonomously searches, reads, edits, runs `verify_remediation`, and reports success in console.

#### Step 13: Real Bridge Integration (TUI + Security Agent Engine)
* **Goal**: Replace Step 1's mock agent with the real engine inside your Chat TUI, connecting real diffs to the approval UI.
* **Tasks**:
  * Connect the real agent loop to the `AgentController` event bus.
  * Stream real LLM tokens to the chat bubble.
  * Render live tool status badges during tool executions.
  * Pass real `DiffApprovalPayload` to the TUI diff box, allowing user to approve/reject before disk write.
  * Trigger target reload check and run `verify_remediation` post-approval.
* **Milestone**: In your real TUI, prompting *"Fix the SQLi flaw in backend/auth.ts"* runs the full loop, displays tool status badges, pauses for diff approval with exact syntax highlighting, applies the patch, and displays the `sectest` pass badge.

---

### 🚀 Phase 6: Multi-Language & Production Hardening

#### Step 14: Multi-Language Adapters (Python, Go, Rust, Java)
* **Goal**: Extend the AST extractor and dependency resolver to other languages.
* **Tasks**:
  * Define a clean `LanguageAdapter` interface.
  * Add `PythonAdapter` (`tree-sitter-python.wasm`) and `GoAdapter` (`tree-sitter-go.wasm`).
* **Milestone**: Symbols and imports are indexed seamlessly across polyglot repos.

#### Step 15: Concurrency Isolation & Configurable Tool Guardrails
* **Goal**: Guarantee TUI responsiveness and guard against runaway executions with user-configurable timeout policies.
* **Tasks**:
  * Move the indexer and search heavy-lifting to `node:worker_threads` to keep the Ink UI at 60 FPS.
  * **Configurable Timeout Policy (`agentConfig.ts`)**:
    * Fast tools (`search_code`, `read_file`, `find_symbol`, `edit_file`): default `10s`.
    * Security probe tools (`run_sectest`, `verify_remediation`): default `60s`.
    * Stress / DDoS simulation tools: configurable up to `300s` with abort signal support.
  * Add token truncation guards on large files and automatic rollback on broken edits.
* **Milestone**: Indexing a 10,000+ file repository causes 0ms TUI freeze; configurable timeouts abort runaway operations cleanly.

---

## 🧪 Verification Matrix

| Step | Verification Target | Verification Method |
|---|---|---|
| **Step 1** | TUI Bridge & Event Bus | Manual mock run in Chat TUI (tokens, tool badge, diff approval gate with `DiffApprovalPayload`) |
| **Step 4c / 5** | AST Extraction Accuracy | Automated Fixture Suite (classes, methods, arrow functions, JSX) |
| **Step 8c** | Dependency Graph | Automated Fixture Suite (relative imports, index resolution, circular deps) |
| **Step 9** | Unified Search | Search Fixture Suite (exact symbol rank vs ripgrep text) |
| **Step 11d** | Security Remediation Tool | 3-way Discriminative Fixture (Vulnerable vs Flawed Patch vs Clean Fix with varied payloads) |
| **Step 12** | Headless Agent Loop | Unattended console run fixing simulated SQLi |
| **Step 13** | End-to-End TUI Agent | Real TUI run: Prompt → Search → Diff Approval → Target Sync → `sectest` pass |
| **Step 15** | UI Smoothness & Guardrails | 10k file index stress test + configurable timeout abort test |
