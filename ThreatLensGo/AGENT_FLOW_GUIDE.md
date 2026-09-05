# 🤖 ThreatLens Autonomous Agent — Flow & Status Guide

> **A short, simple overview of how the agentic security remediation engine works, what is currently fully operational, and what limitations exist.**

---

## 🔄 1. How the Agentic Flow Works

```
 ┌────────────────────────────────────────────────────────┐
 │ 1. Workspace Boot & Indexing                           │
 │    • Tree-sitter WASM parses AST symbols (TS/Py/Go)    │
 │    • SQLite WAL cache + Hash reconciler (0.17ms boot)  │
 │    • Live Chokidar watcher tracks disk changes (<50ms) │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │ 2. Autonomous ReAct Remediation Loop                   │
 │    • User submits query or vulnerability alert         │
 │    • LLM reasons using system prompt & tools schema    │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │ 3. Security Probe & Vulnerability Discovery            │
 │    • Tool: run_sectest                                 │
 │    • Dispatches attack vectors (SQLi, XSS, Command Inj)│
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │ 4. Code Search & Targeted Patch Generation             │
 │    • Tools: search_code, find_symbol, read_file        │
 │    • Tool: edit_file (Generates Unified Diff Patch)   │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │ 5. 🛑 Human-in-the-Loop Diff Approval Gate             │
 │    • Agent Loop pauses execution safely                │
 │    • TUI displays colorized terminal diff modal        │
 │    • User chooses: [A] Approve, [R] Reject, [C] Cancel │
 │    • On Approve: Writes patch to disk & resumes loop   │
 └─────────────────────────┬──────────────────────────────┘
                           │
                           ▼
 ┌────────────────────────────────────────────────────────┐
 │ 6. 3-Way Security Verification                         │
 │    • Tool: verify_remediation                          │
 │    • Tests full attack payload matrix against endpoint │
 │    • Evaluates: VULNERABLE / FLAWED_PATCH / REMEDIATED │
 │    • Concludes and outputs remediation report          │
 └────────────────────────────────────────────────────────┘
```

---

## ✅ 2. What Is Working (100% Operational & Tested)

| Feature | Description | Verified By |
| :--- | :--- | :--- |
| **Polyglot AST Symbol Extractor** | Zero-compiler Tree-sitter WASM parsing functions, classes, methods with parent linkages, interfaces, types, and TSX for **TypeScript, JavaScript, Python, and Go**. | `tests/step14_multilang.test.ts` |
| **Sub-Millisecond SQLite Cache** | Persistent SQLite store with WAL mode; skips unchanged files on reboot in **0.17ms**. | `tests/step6_persistence.test.ts` |
| **Live Filesystem Watcher** | Chokidar watcher debounces and updates SQLite index in **<50ms** on file edit/add/delete. | `tests/step7_watcher.test.ts` |
| **Bidirectional Dependency Graph** | Resolves relative and ESM imports; detects circular dependencies and provides incoming/outgoing dependency lookups. | `tests/step8_dependency_graph.test.ts` |
| **Unified Search Engine** | Vendored Ripgrep (`@vscode/ripgrep`) combined with SQLite exact AST matching elevates symbol definitions to Top 1. | `tests/step9_search.test.ts` |
| **Standard Codebase Tools** | `search_code`, `find_symbol`, `read_file`, `edit_file`, `list_directory`, `get_dependencies`. | `tests/step10_tools.test.ts` |
| **Sequenced Security Tools** | `run_sectest` & `verify_remediation` with discriminative detection (`VULNERABLE`, `FLAWED_PATCH`, `REMEDIATED`). | `tests/step11_security_tools.test.ts` |
| **Autonomous ReAct Engine** | Multi-turn streaming loop, tool dispatcher, diff approval pause/resume, and post-remediation verification. | `tests/step12_headless_loop.test.ts` |
| **Interactive TUI Chat Screen** | Live metrics header (`X Files · Y Symbols`), token streaming, tool badges, and terminal diff approval modal. | `tests/step13_bridge.test.ts` |
| **Resource Guardrails & Timeouts** | `CancellationTokenSource` aborts hung tools; buffers are capped at 32KB; message sliding window prevents token overflows; hard loop cap at 15 iterations. | `tests/step15_guardrails.test.ts` |

---

## ⚠️ 3. What Is Not Working / Current Limitations

1. **Live LLM API Key Requirement**:
   * *Status*: Needs `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` set in your environment to make live cloud LLM calls.
   * *Fallback*: If no key is set, the TUI automatically falls back to an interactive simulated mock agent mode so the UI remains fully testable offline.
2. **Active Target HTTP Server for Security Probes**:
   * *Status*: `run_sectest` and `verify_remediation` require a live target URL (e.g. `http://localhost:8000`). If the target server is down, the probe returns a connection error to the agent so it can report it.
3. **Multi-Language AST Depth for C++ / Rust / Java**:
   * *Status*: WASM grammars for Rust, C++, and Java are bundled, but dedicated high-level AST visitor extractors are currently implemented and tested for **TypeScript, JavaScript, Python, and Go**.
4. **Automated Git Commits by the Agent**:
   * *Status*: The agent edits files on disk upon human diff approval, but does **not** automatically run `git commit` or `git push` without user action (intentional safety boundary).

---

## 🚀 4. How to Run

### Interactive Terminal TUI
```bash
cd ThreatLensGo/tui
npm run dev
```
*Select option **`0. 🤖 ThreatLens Agent`** from the main menu.*

### Headless End-to-End Autonomous Remediation Test
```bash
cd ThreatLensGo/tui
npx tsx tests/step12_headless_loop.test.ts
```

### Full Polyglot & Guardrail Verification Tests
```bash
cd ThreatLensGo/tui
npx tsx tests/step14_multilang.test.ts
npx tsx tests/step15_guardrails.test.ts
```
