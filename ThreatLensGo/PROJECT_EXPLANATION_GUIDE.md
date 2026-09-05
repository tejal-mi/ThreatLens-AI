# 🛡️ ThreatLensGo — Complete Project & Architecture Guide
> **The Definitive Technical Explanation, Architecture Blueprint, Feature Breakdown, and Presentation Guide for ThreatLensGo.**  
> *Author / Engineering Team: CodeSena*

---

## 📑 Table of Contents

1. [Executive Summary & Core Value Proposition](#1-executive-summary--core-value-proposition)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Comprehensive Feature Breakdown (Every Single Feature)](#3-comprehensive-feature-breakdown-every-single-feature)
   - [3.1. Autonomous AI Security Agent (ReAct Loop)](#31-autonomous-ai-security-agent-react-loop)
   - [3.2. Human-in-the-Loop Diff Approval Gate](#32-human-in-the-loop-diff-approval-gate)
   - [3.3. 3-Way Discriminative Security Verification](#33-3-way-discriminative-security-verification)
   - [3.4. Polyglot AST Codebase Indexing Engine](#34-polyglot-ast-codebase-indexing-engine)
   - [3.5. Persistent SQLite WAL Index & 0.17ms Startup Reconciler](#35-persistent-sqlite-wal-index--017ms-startup-reconciler)
   - [3.6. Sub-50ms Live Filesystem Watcher](#36-sub-50ms-live-filesystem-watcher)
   - [3.7. Bidirectional Import & Dependency Graph](#37-bidirectional-import--dependency-graph)
   - [3.8. Unified Multimodal Search Engine (AST + Ripgrep)](#38-unified-multimodal-search-engine-ast--ripgrep)
   - [3.9. Cyberpunk Terminal UI (TUI) & Animation Engine](#39-cyberpunk-terminal-ui-tui--animation-engine)
   - [3.10. Interactive Security Testing Modules](#310-interactive-security-testing-modules)
   - [3.11. Multi-Provider OAuth 2.0 & Session Management](#311-multi-provider-oauth-20--session-management)
   - [3.12. Resource Guardrails & Concurrency Isolation](#312-resource-guardrails--concurrency-isolation)
4. [How Codebase Indexing Works (Deep Dive)](#4-how-codebase-indexing-works-deep-dive)
   - [4.1. The 5-Stage Indexing Pipeline](#41-the-5-stage-indexing-pipeline)
   - [4.2. Tree-sitter WebAssembly Integration (Zero-Native Dependencies)](#42-tree-sitter-webassembly-integration-zero-native-dependencies)
   - [4.3. AST Structural Symbol Extraction Logic](#43-ast-structural-symbol-extraction-logic)
   - [4.4. SQLite Schema & Index Design](#44-sqlite-schema--index-design)
   - [4.5. Fast Hash Reconciliation (<1ms Boot)](#45-fast-hash-reconciliation-1ms-boot)
   - [4.6. Incremental Real-Time Re-Indexing](#46-incremental-real-time-re-indexing)
5. [How the Autonomous Agent Works Under the Hood](#5-how-the-autonomous-agent-works-under-the-hood)
   - [5.1. The ReAct (Reason + Act) Remediation Cycle](#51-the-react-reason--act-remediation-cycle)
   - [5.2. Tool Registry & Execution Lifecycle](#52-tool-registry--execution-lifecycle)
   - [5.3. Event-Driven TUI Bridge & Streaming](#53-event-driven-tui-bridge--streaming)
   - [5.4. Post-Patch Target Synchronization & 3-Way Verification](#54-post-patch-target-synchronization--3-way-verification)
6. [Complete Libraries & Tech Stack Inventory](#6-complete-libraries--tech-stack-inventory)
7. [Directory Structure & Code Map](#7-directory-structure--code-map)
8. [How to Explain ThreatLensGo in a Demo, Interview, or Presentation](#8-how-to-explain-threatlensgo-in-a-demo-interview-or-presentation)
   - [8.1. The 30-Second Elevator Pitch](#81-the-30-second-elevator-pitch)
   - [8.2. The 2-Minute Architecture Walkthrough](#82-the-2-minute-architecture-walkthrough)
   - [8.3. Step-by-Step Live Demo Script](#83-step-by-step-live-demo-script)
   - [8.4. Technical Talking Points & Key Metrics](#84-technical-talking-points--key-metrics)
   - [8.5. Anticipated Questions & Answers (FAQs)](#85-anticipated-questions--answers-faqs)

---

## 1. Executive Summary & Core Value Proposition

### What is ThreatLensGo?
**ThreatLensGo** is an autonomous DevSecOps and offensive security platform designed to bridge the gap between **vulnerability discovery** and **automated source code remediation**.

Traditional security tools stop at reporting vulnerabilities (e.g. "Line 42 has SQL Injection"). Developers are left to manually locate the file, trace dependencies, write the fix, and re-test. 

**ThreatLensGo automates this entire lifecycle**:
1. **Finds** the vulnerability using dynamic security probing engines (`sectest`).
2. **Locates** the root-cause source code using an in-memory polyglot AST indexer.
3. **Generates** a precise, parameterized patch using an autonomous ReAct LLM agent.
4. **Presents** an interactive unified diff to the human operator for approval.
5. **Applies** the patch and **verifies** remediation against a live test harness using a multi-payload attack matrix.

All of this happens inside a blazing-fast, cyberpunk-inspired **Terminal User Interface (TUI)** built with **React 18** and **Ink**.

---

## 2. High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 THREATLENSGO TERMINAL UI (Ink / React 18)                        │
│                                                                                                  │
│   ┌───────────────────────┐      AgentEvent Stream       ┌────────────────────────────────────┐  │
│   │   AgentChatScreen     │ ◄─────────────────────────── │          AgentController           │  │
│   │   - Token Streaming   │                              │          (Event Bridge)            │  │
│   │   - Live Tool Badges  │ ───────────────────────────► │  - submitQuery()                   │  │
│   │   - DiffApprovalModal │        User Actions          │  - approveDiff() / rejectDiff()    │  │
│   │   - Telemetry Header  │     (Approve / Reject)       │  - cancel()                        │  │
│   └───────────────────────┘                              └─────────────────┬──────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┼─────────────────────┘
                                                                             │
┌────────────────────────────────────────────────────────────────────────────▼─────────────────────┐
│                               AUTONOMOUS AGENT CORE (ReAct Engine)                               │
│                                                                                                  │
│   ┌────────────────────────────────────────┐          Multi-Turn Streaming Conversation          │
│   │       AutonomousAgentLoop              │ ◄───────────────────────────────────────────────►   │
│   │  - System Prompt with Security Toolset │                      LLM Client                     │
│   │  - Message Pruning & Guardrails        │         (OpenRouter / OpenAI / Anthropic)           │
│   │  - Approval Gate Interceptor           │                                                     │
│   └──────────────────┬─────────────────────┘                                                     │
│                      │                                                                           │
│                      ▼ Dispatches Tools                                                          │
│   ┌───────────────────────────────────────────────────────────────────────────────────────────┐  │
│   │                                      TOOL REGISTRY                                        │  │
│   │  ┌───────────────────────────────┐               ┌─────────────────────────────────────┐  │  │
│   │  │       Codebase Tools          │               │           Security Tools            │  │  │
│   │  │  • search_code (Ripgrep+AST)  │               │  • run_sectest (Dynamic Prober)     │  │  │
│   │  │  • find_symbol (AST Lookup)   │               │  • verify_remediation (3-Way Check) │  │  │
│   │  │  • read_file (Bounded Slices) │               └─────────────────────────────────────┘  │  │
│   │  │  • edit_file (Diff Generator) │                                                        │  │
│   │  │  • get_dependencies (Graph)   │                                                        │  │
│   │  └───────────────┬───────────────┘                                                        │  │
│   └──────────────────┼────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────┼───────────────────────────────────────────────────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────────────────────────────────────────────────┐
│                             CODEBASE INTELLIGENCE & INDEXING ENGINE                              │
│                                                                                                  │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌───────────────────────────────────┐  │
│  │   Polyglot Extractor  │   │    Dependency Graph    │   │         Ripgrep Searcher          │  │
│  │   (Tree-sitter WASM)  │   │  (Imports / Calls /    │   │         (@vscode/ripgrep)         │  │
│  │  TS · JS · Py · Go    │   │   Circular Dep Safe)   │   │     Raw Regex & Text Sinks        │  │
│  └───────────┬───────────┘   └───────────┬────────────┘   └─────────────────┬─────────────────┘  │
│              └───────────────────────────┼──────────────────────────────────┘                    │
│                                          ▼                                                       │
│                           ┌──────────────────────────────┐                                       │
│                           │   Persistent SQLite Store    │ ◄─── Chokidar File Watcher            │
│                           │      (WAL Mode, <0.2ms)      │      (Live Incremental Updates)       │
│                           └──────────────────────────────┘                                       │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Comprehensive Feature Breakdown (Every Single Feature)

### 3.1. Autonomous AI Security Agent (ReAct Loop)
- **What it does**: Executes a multi-turn **Reasoning + Acting** loop where the agent inspects the codebase, diagnoses vulnerabilities, drafts patches, waits for user approval, and verifies fixes.
- **How it works**:
  - Implemented in `src/agent/AutonomousAgentLoop.ts`.
  - Takes user instructions (e.g. *"Audit /api/search for SQL injection and fix it"*).
  - Supplies the LLM with strict JSON schemas for 7 specialized tools.
  - Streams tokens real-time to the TUI while showing live badges (`⚡ [search_code]`, `⚡ [read_file]`).
  - Includes a fallback `MockAgentController.ts` for offline or zero-API-key demonstrations.

### 3.2. Human-in-the-Loop Diff Approval Gate
- **What it does**: Prevents the AI agent from writing unreviewed code to disk.
- **How it works**:
  - When the agent calls `edit_file`, execution **pauses immediately**.
  - A `DiffApprovalPayload` is generated containing the file path, original content, proposed content, and a unified diff patch.
  - The TUI displays `DiffApprovalModal.tsx` with color-coded syntax highlighting (green for additions, red for deletions).
  - The developer presses **`[A] Approve`** (writes patch to disk and resumes the loop), **`[R] Reject`** (sends feedback to LLM to rethink), or **`[C] Cancel`** (terminates the task).

### 3.3. 3-Way Discriminative Security Verification
- **What it does**: Proves whether a code fix actually resolved the vulnerability or just applied a naive workaround.
- **How it works**:
  - Implemented in `src/agent/tools/securityTools.ts` via `verify_remediation`.
  - Executes a **target-reload health check** to ensure the patched server has reloaded.
  - Fires a matrix of diverse attack vectors (tautologies, stacked queries, comment truncations, syntax breakers).
  - Evaluates results into three distinct states:
    1. **`REMEDIATED`**: All attack vectors safely handled via parameterized queries or proper escaping.
    2. **`FLAWED_PATCH`**: Naive patch detected! (e.g., developer replaced `' OR '1'='1` with a blank string, but `admin'--` still bypassed it).
    3. **`VULNERABLE`**: Patch failed completely; endpoint remains vulnerable.

### 3.4. Polyglot AST Codebase Indexing Engine
- **What it does**: Parses code into Abstract Syntax Trees to extract exact symbol definitions (functions, classes, methods, interfaces, types) with line and column numbers.
- **How it works**:
  - Built with `web-tree-sitter` and WebAssembly (`.wasm`) grammars.
  - Supports **TypeScript, JavaScript, Python, and Go** natively without requiring local C++ compilers.
  - Extracts method visibility (public/private/protected), parameter lists, return types, async status, and parent-child class linkages.

### 3.5. Persistent SQLite WAL Index & 0.17ms Startup Reconciler
- **What it does**: Stores all indexed files, symbols, and dependencies in a local SQLite database (`.threatlens_index.db`).
- **How it works**:
  - Uses `better-sqlite3` configured with **Write-Ahead Logging (WAL)** for ultra-fast concurrent access.
  - Computes SHA-256 hashes of all workspace files.
  - On restart, compares current file hashes against SQLite: **only modified or new files are re-parsed**.
  - Benchmark: Reconciles an unchanged codebase in **0.17 ms** on boot.

### 3.6. Sub-50ms Live Filesystem Watcher
- **What it does**: Keeps the index 100% synchronized in real-time as developers edit code in external editors (VS Code, Cursor, Vim).
- **How it works**:
  - Implemented in `src/indexer/fileWatcher.ts` using `chokidar`.
  - Debounces file events and triggers single-file re-parsing and atomic SQLite updates in **< 50ms**.
  - Handles file additions, modifications, and deletions (with cascade deletion of associated symbols and dependencies).

### 3.7. Bidirectional Import & Dependency Graph
- **What it does**: Maps relationships between all files across the repository.
- **How it works**:
  - Resolves ES Module imports, CommonJS `require()`, Python `import / from ... import`, and Go package imports.
  - Supports extensionless imports (`./utils` -> `./utils.ts`), directory index fallbacks (`./services` -> `./services/index.ts`).
  - Implements **cycle-safe graph traversal** to detect circular dependencies (`A -> B -> A`).
  - Answers two critical queries:
    - *Outgoing*: "What files does this module import?"
    - *Incoming*: "What files across the repo import this module?"

### 3.8. Unified Multimodal Search Engine (AST + Ripgrep)
- **What it does**: Provides a single search query interface combining structural symbol search and raw text regex search.
- **How it works**:
  - Uses `@vscode/ripgrep` (vendored zero-install binary) for lightning-fast disk-level regex search.
  - Blends ripgrep text matches with SQLite B-Tree symbol matches.
  - **Ranking**: Exact symbol definitions (`function authenticate()`) are ranked at **Top 1**, above casual string mentions or comments.

### 3.9. Cyberpunk Terminal UI (TUI) & Animation Engine
- **What it does**: Delivers an immersive terminal experience inspired by tools like OpenCode and LazyGit.
- **How it works**:
  - Built with React 18, Ink 5, and custom React hooks (`useAnimationFrame`).
  - Dynamic 60 FPS neon ANSI color waves, pulsing status dots, braille spinners, and progressive telemetry bars.
  - Live header metrics (`X Files · Y Symbols`) updating dynamically as indexing progresses.

### 3.10. Interactive Security Testing Modules
The TUI includes dedicated screens for targeted security assessments:
- **SQLi Screen (`SqliScreen.tsx`)**: Error-based, Union-based, and Blind SQL injection fuzzing.
- **XSS Screen (`XssScreen.tsx`)**: Reflected, Stored, and DOM-based cross-site scripting sink testing.
- **DDoS Screen (`DdosScreen.tsx`)**: Traffic load profiling (Flood, Slowloris socket exhaustion, Burst-spike).
- **Exfil Screen (`ExfilScreen.tsx`)**: Scans for leaked credentials, exposed debug routes (`/actuator`), and stack traces.
- **Rate Limit & Proxy (`RateLimitScreen.tsx`, `ProxyScreen.tsx`)**: Validates HTTP 429 throttling and request interception.
- **Git Analysis (`GitAnalysisScreen.tsx`)**: Audits remote/local Git repos for leaked API keys and CVEs.

### 3.11. Multi-Provider OAuth 2.0 & Session Management
- **What it does**: Secure operator authentication.
- **How it works**:
  - Fast browser verification via **GitHub OAuth**, **Google OAuth**, and standard operator credentials.
  - Backed by FastAPI, SQLAlchemy, `tc_auth`, and JWT tokens.

### 3.12. Resource Guardrails & Concurrency Isolation
- **What it does**: Ensures the TUI never hangs, crashes, or leaks memory during heavy operations.
- **How it works**:
  - `CancellationTokenSource`: Allows immediate user cancellation of running tools or LLM requests.
  - Buffer Limits: File reads and tool outputs are capped at **32 KB** to prevent LLM context overflow.
  - Sliding Window History: Automatically trims conversation history to preserve vital system instructions while staying within token limits.
  - Max Iteration Guard: Caps autonomous loops at 15 turns to prevent runaway infinite loops.

---

## 4. How Codebase Indexing Works (Deep Dive)

Codebase indexing is the structural foundation that enables the agent to "understand" your code instantaneously without having to read every file from disk on every query.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                               THE 5-STAGE INDEXING PIPELINE                                 │
│                                                                                             │
│  [ Stage 1: File Scanning ]                                                                 │
│  Traverses workspace, respects .gitignore, computes SHA-256 hash & mtime.                   │
│                                              │                                              │
│                                              ▼                                              │
│  [ Stage 2: Hash Reconciliation ]                                                           │
│  Compares SHA-256 against SQLite index. Unchanged? -> Skip AST parsing (0.17ms).            │
│                                              │                                              │
│                                              ▼ (If Changed / New)                           │
│  [ Stage 3: WebAssembly AST Parsing ]                                                       │
│  Loads Tree-sitter WASM grammar (TS/JS/Py/Go) and builds in-memory syntax tree.             │
│                                              │                                              │
│                                              ▼                                              │
│  [ Stage 4: Structural Symbol & Import Extraction ]                                         │
│  Traverses AST nodes to extract functions, classes, methods, parameters, and imports.       │
│                                              │                                              │
│                                              ▼                                              │
│  [ Stage 5: Atomic SQLite Transaction ]                                                     │
│  Writes files, symbols, and dependency edges to SQLite with B-Tree indexes in WAL mode.     │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.1. The 5-Stage Indexing Pipeline

#### Stage 1: File Scanning (`src/indexer/fileScanner.ts`)
- Recursively walks the workspace directory.
- Filters out ignored directories (`.git`, `node_modules`, `dist`, `build`, `.threatlens_index.db`).
- Reads file stats (`mtime`, `sizeBytes`) and computes a cryptographic SHA-256 hash of the content.
- Uses `languageDetector.ts` to map extensions (`.ts`, `.tsx`, `.js`, `.py`, `.go`) to supported language types.

#### Stage 2: Fast Hash Reconciliation (`src/indexer/sqliteStore.ts`)
- The `SqliteIndexStore.reconcile()` method fetches all stored file paths and hashes from SQLite.
- It calculates the set difference:
  - **Unchanged files** (hash matches): Retained immediately with zero disk re-reading or AST parsing.
  - **Modified files** (hash differs): Queued for AST re-parsing.
  - **Deleted files** (present in DB, absent on disk): Removed via cascade deletion.
- **Performance**: In an unchanged workspace of 100+ files, startup takes **0.17 milliseconds**.

#### Stage 3: Tree-sitter WebAssembly Parsing (`src/indexer/parserLoader.ts`)
- Rather than compiling native C++ node-gyp bindings (which fail across operating systems), ThreatLensGo uses **`web-tree-sitter`** running pre-compiled WebAssembly (`.wasm`) grammars.
- WASM binaries are loaded dynamically based on language:
  - `tree-sitter-typescript.wasm`
  - `tree-sitter-tsx.wasm`
  - `tree-sitter-javascript.wasm`
  - `tree-sitter-python.wasm`
  - `tree-sitter-go.wasm`

#### Stage 4: Granular AST Symbol & Import Extraction (`src/indexer/astExtractor.ts`)
The `AstExtractor` class traverses the AST syntax nodes and extracts rich metadata:
- **Functions**: Extracts name, parameters, return type, async flag, exported flag, start/end line, and column.
- **Classes & Methods**: Captures class name, heritage (`extends` / `implements`), and traverses `class_body` to extract methods with access modifiers (`public`, `private`, `protected`), static flags, and parent class references.
- **Types & Interfaces**: Extracts TypeScript interfaces, type aliases, and enums.
- **Python Support**: Parses `def` functions, `async def`, `class` definitions, and docstrings.
- **Go Support**: Parses `func` declarations, methods with struct receivers (`func (s *Server) Handle()`), and `type X struct / interface`.
- **Imports**: Extracts import paths, default imports, named specifiers, and re-exports.

#### Stage 5: Atomic SQLite Persistence (`src/indexer/sqliteStore.ts`)
All extracted data is written inside a single SQLite transaction:
```sql
CREATE TABLE files (
  id TEXT PRIMARY KEY,
  path TEXT UNIQUE NOT NULL,
  hash TEXT NOT NULL,
  mtime INTEGER NOT NULL,
  language TEXT NOT NULL,
  size_bytes INTEGER NOT NULL
);

CREATE TABLE symbols (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  file_path TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,          -- 'function', 'class', 'method', 'interface', etc.
  start_line INTEGER NOT NULL,
  end_line INTEGER NOT NULL,
  start_col INTEGER NOT NULL,
  end_col INTEGER NOT NULL,
  signature TEXT,
  parameters TEXT,
  return_type TEXT,
  is_exported INTEGER NOT NULL DEFAULT 0,
  is_async INTEGER NOT NULL DEFAULT 0,
  parent_symbol TEXT,
  FOREIGN KEY(file_id) REFERENCES files(id) ON DELETE CASCADE
);

CREATE TABLE dependencies (
  id TEXT PRIMARY KEY,
  source_file TEXT NOT NULL,
  target_file TEXT NOT NULL,
  raw_specifier TEXT NOT NULL,
  is_external INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(source_file) REFERENCES files(path) ON DELETE CASCADE
);
```
B-Tree indexes on `symbols.name`, `files.path`, and `dependencies.source_file` enable sub-millisecond lookups.

---

## 5. How the Autonomous Agent Works Under the Hood

### 5.1. The ReAct (Reason + Act) Remediation Cycle

When a user submits a query like *"Audit the backend for SQL injection in search and fix it"*, the agent executes this sequence:

```
[ User Input ] ──► "Audit and fix SQLi in /api/search"
                          │
                          ▼
[ Iteration 1 ] ──► LLM analyzes prompt & decides to probe endpoint
                    Calls: run_sectest({ suite: 'sqli', targetUrl: 'http://localhost:8000' })
                    Result: Vulnerable! Payload "' OR '1'='1" triggered SQL syntax error.
                          │
                          ▼
[ Iteration 2 ] ──► LLM searches codebase for search query handling
                    Calls: search_code({ query: "SELECT * FROM products WHERE", mode: "text" })
                    Result: Found in backend/api/search.py:24
                          │
                          ▼
[ Iteration 3 ] ──► LLM reads exact lines around the vulnerability
                    Calls: read_file({ path: "backend/api/search.py", startLine: 15, endLine: 35 })
                    Result: Unescaped string formatting `f"SELECT * FROM items WHERE name = '{query}'"`
                          │
                          ▼
[ Iteration 4 ] ──► LLM generates parameterized query fix
                    Calls: edit_file({
                      path: "backend/api/search.py",
                      oldContent: 'query = f"SELECT * FROM items WHERE name = \'{user_input}\'"',
                      newContent: 'query = "SELECT * FROM items WHERE name = :name"\n        params = {"name": user_input}',
                      description: "Use parameterized query to prevent SQL injection"
                    })
                          │
                          ▼
             🛑 [ HUMAN APPROVAL GATE INTERCEPTION ]
             Agent execution halts. TUI displays DiffApprovalModal.
             User presses [A] Approve.
             Diff is written to disk. Agent loop resumes.
                          │
                          ▼
[ Iteration 5 ] ──► LLM verifies the remediation
                    Calls: verify_remediation({
                      targetUrl: "http://localhost:8000",
                      endpoint: "/api/search",
                      param: "q",
                      category: "sqli"
                    })
                    Result: 3-Way Check reports REMEDIATED (7/7 attack payloads safely handled).
                          │
                          ▼
[ Conclusion ]  ──► LLM outputs final remediation report. Status: DONE.
```

### 5.2. Tool Registry & Execution Lifecycle

The agent has access to 7 strictly defined tools in `src/agent/tools/`:

| Tool Name | Type | Purpose | Safety Check |
|---|---|---|---|
| `search_code` | Read-only | Blended AST symbol + Ripgrep text search | Bounded return count |
| `find_symbol` | Read-only | Finds exact function/class definitions | Indexed SQLite query |
| `read_file` | Read-only | Reads sliced line ranges of files | Capped at 32 KB |
| `list_directory` | Read-only | Lists indexed workspace files | Cached SQLite scan |
| `get_dependencies`| Read-only | Traverses incoming/outgoing dependency tree | Cycle-protected |
| `edit_file` | Mutating | Proposes code modifications via unified diff | **Requires Human Approval** |
| `run_sectest` | Security | Executes dynamic vulnerability attack probes | Timeout guarded |
| `verify_remediation`| Security | 3-way discriminative post-remediation check | Target healthcheck sync |

---

## 6. Complete Libraries & Tech Stack Inventory

Here is the exhaustive list of libraries used in ThreatLensGo, along with the engineering reason for choosing each:

### Terminal UI & Rendering Stack
| Library | Version | Why It Was Chosen |
|---|---|---|
| **`ink`** | `^5.1.0` | React renderer for interactive terminal interfaces. Provides declarative component architecture, flexbox layout, and keyboard event handling in the console. |
| **`react`** | `^18.3.1` | Core UI state management, custom hooks, component lifecycles, and re-rendering pipelines. |
| **`ink-select-input`** | `^6.0.0` | Interactive keyboard-driven navigation menus with indicator arrows and selection handlers. |
| **`ink-text-input`** | `^6.0.0` | Real-time terminal text input component with cursor positioning and placeholder support. |
| **`ink-spinner`** | `^5.0.0` | High-fidelity braille loading spinners for asynchronous background operations. |

### Codebase Indexing & Parsing Stack
| Library | Version | Why It Was Chosen |
|---|---|---|
| **`web-tree-sitter`** | `^0.22.6` | WebAssembly-based AST parser. Delivers high-speed AST generation without requiring native C++ build toolchains (`node-gyp`). |
| **`tree-sitter-wasms`** | `^0.1.13` | Pre-compiled WebAssembly grammar bundles for TypeScript, TSX, JavaScript, Python, and Go. |
| **`better-sqlite3`** | `^13.0.3` | The fastest synchronous SQLite library for Node.js. Used in WAL mode for persistent symbol caching and dependency graph storage. |
| **`chokidar`** | `^5.0.0` | Cross-platform filesystem watcher with efficient debouncing to power live sub-50ms index updates. |
| **`@vscode/ripgrep`** | `^1.18.0` | Vendored Ripgrep binary distribution. Delivers multi-threaded regex search across thousands of files without requiring external system installations. |
| **`ignore`** | `^7.0.6` | Standard `.gitignore` rule parser to guarantee test artifacts and build outputs are excluded from indexing. |

### Runtime & Execution Stack
| Library | Version | Why It Was Chosen |
|---|---|---|
| **`tsx`** | `^4.19.0` | Ultra-fast TypeScript execution engine powered by esbuild. Enables zero-compile execution of the TUI. |
| **`typescript`** | `^5.5.4` | Strict type checking and interface contracts across the agent, indexer, and UI bridge. |
| **`dotenv`** | `^17.4.2` | Loads environment variables (`OPENROUTER_API_KEY`, `OPENAI_API_KEY`, etc.) seamlessly. |

### Security & Backend Microservices Stack (Root & `sectest`)
| Library | Purpose |
|---|---|
| **`fastapi`** | High-performance Python async backend for authentication and API routing. |
| **`httpx` / `requests`** | Asynchronous HTTP client used by `sectest` to dispatch security attack vectors. |
| **`sqlalchemy` & `postgresql`**| Relational persistence for user accounts and audit session histories. |
| **`tc_auth` & `authlib`** | OAuth 2.0 device flow and JWT token generation. |

---

## 7. Directory Structure & Code Map

```
ThreatLens/
├── ThreatLensGo/
│   ├── AGENT_FLOW_GUIDE.md           # Quick summary of agent operational status
│   ├── IMPLEMENTATION_PLAN.md        # 15-phase engineering roadmap
│   ├── PROJECT_EXPLANATION_GUIDE.md  # THIS FILE: Comprehensive project guide
│   └── tui/
│       ├── .threatlens_index.db      # Persistent SQLite WAL symbol database
│       ├── package.json              # Dependencies & npm scripts
│       └── src/
│           ├── index.tsx             # CLI entry point (boots React Ink)
│           ├── App.tsx               # Root component & screen routing
│           │
│           ├── indexer/              # Codebase Intelligence Engine
│           │   ├── astExtractor.ts   # Polyglot AST visitor (TS/JS/Py/Go)
│           │   ├── parserLoader.ts   # WASM Tree-sitter loader
│           │   ├── sqliteStore.ts    # SQLite WAL cache & hash reconciler
│           │   ├── fileScanner.ts    # Recursive file walker & hasher
│           │   ├── fileWatcher.ts    # Chokidar live filesystem watcher
│           │   ├── importResolver.ts # Multi-language import & require resolver
│           │   ├── dependencyGraph.ts# Cycle-safe bidirectional dependency graph
│           │   ├── ripgrepSearcher.ts# @vscode/ripgrep text search wrapper
│           │   ├── unifiedSearch.ts  # Hybrid ranked search (AST + Ripgrep)
│           │   ├── languageDetector.ts# File extension to language mapper
│           │   ├── symbols.ts        # CodeSymbol data contracts
│           │   └── types.ts          # Indexer type definitions
│           │
│           ├── agent/                # Autonomous Agent Core
│           │   ├── AutonomousAgentLoop.ts # Multi-turn ReAct execution loop
│           │   ├── MockAgentController.ts # Interactive offline simulation agent
│           │   ├── agentManager.ts   # Singleton controller lifecycle manager
│           │   ├── prompt.ts         # System prompt & tool guidance
│           │   ├── config.ts         # Timeout & iteration guardrail settings
│           │   ├── types.ts          # AgentEvent & DiffApproval contracts
│           │   ├── llm/
│           │   │   └── llmClient.ts  # OpenAI / OpenRouter streaming client
│           │   ├── tools/
│           │   │   ├── codebaseTools.ts # search_code, find_symbol, read_file, edit_file
│           │   │   ├── securityTools.ts # run_sectest, verify_remediation
│           │   │   ├── diffUtils.ts     # Unified diff generation utility
│           │   │   └── toolRegistry.ts  # Tool dispatcher & execution sandbox
│           │   └── guardrails/
│           │       ├── resourceGuard.ts   # Token pruning & byte truncators
│           │       └── cancellationToken.ts # AbortController signal handling
│           │
│           ├── screens/              # TUI Visual Screens
│           │   ├── AgentChatScreen.tsx   # Interactive agent chat with live badges
│           │   ├── MainMenu.tsx          # Cyberpunk main navigation menu
│           │   ├── LoginScreen.tsx       # OAuth & credential login screen
│           │   ├── GitAnalysisScreen.tsx # Git secret & CVE audit screen
│           │   ├── ProxyScreen.tsx       # HTTP traffic proxy screen
│           │   ├── RateLimitScreen.tsx   # 429 throttle testing screen
│           │   └── security/
│           │       ├── SecurityMenu.tsx  # Security modules hub
│           │       ├── SqliScreen.tsx    # SQL injection testing screen
│           │       ├── XssScreen.tsx     # Cross-site scripting screen
│           │       ├── DdosScreen.tsx    # DDoS concurrency simulation screen
│           │       ├── ExfilScreen.tsx   # Sensitive data exposure audit screen
│           │       └── TargetUrlScreen.tsx# Base target URL configuration
│           │
│           ├── components/           # Reusable Terminal UI Components
│           │   ├── TerminalLayout.tsx    # Responsive cyberpunk window frame
│           │   ├── DiffApprovalModal.tsx # Colorized terminal unified diff modal
│           │   ├── ToolBadge.tsx         # Visual status badge for tool runs
│           │   ├── SimulationRunner.tsx  # Stepping test progress runner
│           │   ├── ProgressBar.tsx       # Braille & block progress indicator
│           │   ├── AnimatedLogo.tsx      # Neon ANSI ASCII banner
│           │   ├── AnimatedTip.tsx       # Cycling security tips ticker
│           │   ├── PulsingBox.tsx        # Neon border glow effect
│           │   └── StatusDot.tsx         # Live operational status indicator
│           │
│           └── hooks/
│               └── useAnimationFrame.ts  # 60 FPS terminal render loop hook
│
├── sectest/                          # Python Security Probing Engine
│   ├── cli.py                        # Standalone sectest CLI
│   └── modules/                      # Injection, Auth, Exposure, RateLimit modules
│
├── backend/                          # FastAPI Backend & Auth Microservices
└── frontend/                         # Web Dashboard (React + Vite + Tailwind)
```

---

## 8. How to Explain ThreatLensGo in a Demo, Interview, or Presentation

### 8.1. The 30-Second Elevator Pitch
> *"ThreatLensGo is an autonomous security remediation platform with a cyberpunk Terminal UI. It doesn't just find vulnerabilities like SQL injection or XSS—it uses an AST-driven codebase intelligence engine to locate the vulnerable code, autonomously drafts a secure parameterized fix, pauses for human diff approval, and then verifies the remediation against a live attack matrix to guarantee the flaw is truly fixed."*

---

### 8.2. The 2-Minute Architecture Walkthrough
1. **The Problem**: *"Security scanners dump thousands of alerts on developers without context. Fixing them requires manual searching, writing patches, and re-testing."*
2. **The Terminal UI**: *"We built ThreatLensGo using React 18 and Ink. It brings rich web-like ergonomics—streaming tokens, 60 FPS ANSI animations, and unified diff modals—directly to the command line."*
3. **The Indexer**: *"Under the hood, we built a zero-native-dependency AST indexing engine using Tree-sitter WebAssembly and SQLite WAL mode. On reboot, it reconciles workspace hashes in 0.17 milliseconds and tracks live code edits via Chokidar in under 50 milliseconds."*
4. **The Agentic Loop**: *"When a vulnerability is flagged, our ReAct agent searches the index, reads the target code, and generates a unified diff. It is strictly bounded by human-in-the-loop approval: no code touches disk until the developer hits `[A]pprove`."*
5. **3-Way Verification**: *"Finally, our `verify_remediation` tool tests a diverse matrix of attack payloads. It discriminates between genuine parameterized fixes and flawed naive string replacements, ensuring high security assurance."*

---

### 8.3. Step-by-Step Live Demo Script

#### Step 1: Launch the Application
```bash
cd ThreatLensGo/tui
npm run dev
```
*Point out the neon ASCII banner, the dynamic tips ticker at the bottom, and the responsive terminal frame.*

#### Step 2: Showcase the Autonomous Agent
- Select option **`0. 🤖 ThreatLens Agent`**.
- Note the top metrics header: `✓ 102 Files · 584 Symbols · Engine Ready`.
- Type the query:
  ```text
  Audit /api/search for SQL injection, patch the vulnerability, and verify the remediation.
  ```
- **What to highlight**:
  - The streaming token generation from the agent.
  - The live tool badges appearing (`⚡ [search_code]`, `⚡ [read_file]`, `⚡ [edit_file]`).

#### Step 3: Demonstrate Human-in-the-Loop Diff Approval
- The agent halts execution and renders the **`DiffApprovalModal`**.
- **What to highlight**:
  - The unified diff view showing red lines deleted and green lines added.
  - The safety guarantee: the agent cannot arbitrarily alter the codebase without permission.
- Press **`A`** to approve the patch.

#### Step 4: Show 3-Way Security Verification
- The agent executes `verify_remediation`.
- Show how the tool tests 7 diverse SQLi attack vectors and outputs the `REMEDIATED` verdict badge.

#### Step 5: Tour the Interactive Security Testing Screens
- Press `ESC` to return to the Main Menu.
- Navigate to **`1. 💉 SQL Injection (SQLi)`** or **`3. 💥 DDoS Stress Testing`**.
- Run a simulated attack profile (e.g. *Slowloris socket exhaustion*) to demonstrate the live telemetry progress bars and status checks.

---

### 8.4. Technical Talking Points & Key Metrics

When presenting, mention these specific technical achievements to demonstrate deep engineering competence:

1. **0.17 ms Startup Reconciler**:
   - By storing SHA-256 hashes in SQLite with WAL mode, unchanged codebases boot instantaneously with zero wasted AST parsing.
2. **Zero Native Build Dependencies**:
   - Using `web-tree-sitter` (WASM) eliminates `node-gyp`, Python build tools, and C++ compiler prerequisites, making the tool 100% portable across Windows, macOS, and Linux.
3. **Sub-50 ms Live Synchronization**:
   - `chokidar` watcher debounces filesystem events and updates SQLite incrementally so the agent always operates on the latest source code.
4. **Flawed Patch Discrimination**:
   - The security test harness doesn't rely on single-shot tests; it fires a matrix of tautologies, comment truncations, and stacked queries to detect naive string replacement fixes.
5. **Memory & Context Guardrails**:
   - 32 KB buffer caps, `CancellationTokenSource` abort signals, and automated message sliding windows protect LLM token limits and prevent infinite loops.

---

### 8.5. Anticipated Questions & Answers (FAQs)

#### Q1: "Why use Tree-sitter WebAssembly instead of native Tree-sitter?"
> **Answer**: *"Native Tree-sitter requires platform-specific C/C++ compilation via `node-gyp`, which frequently fails on Windows or restricted developer environments. `web-tree-sitter` runs compiled WASM modules directly in the V8 engine, guaranteeing 100% cross-platform compatibility with near-native parsing performance."*

#### Q2: "How do you prevent the AI from making unwanted code changes or breaking things?"
> **Answer**: *"We enforce a strict Human-in-the-Loop Diff Approval Gate. The `edit_file` tool does not write to disk; it generates a `DiffApprovalPayload`. The agent loop is suspended until the developer reviews the colorized unified diff in the terminal and explicitly presses `[A] Approve`."*

#### Q3: "What happens if no LLM API key is configured?"
> **Answer**: *"The application features a graceful fallback architecture. If no `OPENROUTER_API_KEY` or `OPENAI_API_KEY` is present, it automatically activates `MockAgentController.ts`. This allows developers to experience the full interactive workflow, streaming UI, and diff approval modal completely offline."*

#### Q4: "How does the search engine rank results?"
> **Answer**: *"We use a multi-modal search ranking approach. Exact AST symbol definitions (functions, classes, interfaces) stored in SQLite are given highest priority and returned as Top 1 results. Partial symbol matches follow, and raw keyword/regex occurrences found via `@vscode/ripgrep` are ranked below structural symbols."*

#### Q5: "How does the dependency graph handle circular imports?"
> **Answer**: *"Our `DependencyGraph` class implements cycle-safe graph traversal with a visited set and depth tracking. If module A imports module B which imports module A, the traversal detects the cycle, flags `hasCircularDependency: true`, and returns safely without infinite recursion."*

---

*ThreatLensGo — Engineered by CodeSena.*
