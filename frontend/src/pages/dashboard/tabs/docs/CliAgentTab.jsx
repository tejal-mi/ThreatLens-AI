import React, { useState } from "react";
import {
  Terminal, Download, Cpu, Zap, Shield, Lock, GitCommit,
  FolderGit2, Check, Copy, ChevronRight, ExternalLink,
  ArrowRight, Bot, AlertTriangle, Key, Settings, Activity,
  Package, Globe, BookOpen, Code2, Workflow, Star, Play,
  Flag, FileCode, Layers, Database, WifiOff,
} from "lucide-react";

const COMMANDS = [
  {
    category: "Repository Scanning",
    color: "#38bdf8",
    icon: FolderGit2,
    cmds: [
      { cmd: "threatlens scan ./repo", desc: "Scan local repository with default settings.", flags: ["--full", "--branch main", "--since 30d"] },
      { cmd: "threatlens scan --url https://github.com/org/repo", desc: "Scan a remote GitHub repository by URL.", flags: ["--token $GITHUB_TOKEN", "--depth 100"] },
      { cmd: "threatlens scan --all-repos", desc: "Scan all repos linked to your account.", flags: ["--parallel 4", "--output json"] },
    ],
  },
  {
    category: "Commit Analysis",
    color: "#a78bfa",
    icon: GitCommit,
    cmds: [
      { cmd: "threatlens commits --repo ./repo", desc: "Analyze commit history for risk scoring and anomalies.", flags: ["--limit 500", "--since 2026-01-01"] },
      { cmd: "threatlens commits --sha abc1234", desc: "Inspect a single commit with full diff analysis.", flags: ["--verbose", "--json"] },
    ],
  },
  {
    category: "Secret Detection",
    color: "#f43f5e",
    icon: Lock,
    cmds: [
      { cmd: "threatlens secrets ./repo", desc: "Run entropy-based secret scanner across all file diffs.", flags: ["--entropy 4.0", "--patterns custom.yaml"] },
      { cmd: "threatlens secrets --pre-commit", desc: "Install as a git pre-commit hook to block secret leaks.", flags: [] },
    ],
  },
  {
    category: "DAST Probing",
    color: "#f59e0b",
    icon: Activity,
    cmds: [
      { cmd: "threatlens dast --target http://localhost:8080", desc: "Run OWASP Top 10 DAST suite against a running API.", flags: ["--module sqli", "--module ratelimit", "--module headers"] },
      { cmd: "threatlens dast --report report.json", desc: "Export findings to a structured JSON report.", flags: ["--format sarif"] },
    ],
  },
  {
    category: "AI Assistant",
    color: "#34d399",
    icon: Bot,
    cmds: [
      { cmd: "threatlens ask \"explain finding sqli-1\"", desc: "Ask ThreatLensGO to explain or remediate a finding.", flags: ["--model deepseek-r1", "--context full"] },
      { cmd: "threatlens ask --interactive", desc: "Launch an interactive AI security chat session in the terminal.", flags: [] },
    ],
  },
  {
    category: "CI/CD & Pipelines",
    color: "#60a5fa",
    icon: Workflow,
    cmds: [
      { cmd: "threatlens cicd --workflow .github/workflows/ci.yml", desc: "Audit a GitHub Actions workflow for privilege escalation risks.", flags: ["--strict"] },
      { cmd: "threatlens cicd --dockerfile Dockerfile", desc: "Analyze a Dockerfile for unsafe configurations.", flags: ["--no-fail"] },
    ],
  },
  {
    category: "Authentication & Config",
    color: "#71717a",
    icon: Key,
    cmds: [
      { cmd: "threatlens login --api-key <KEY>", desc: "Authenticate the CLI with your ThreatLens API key.", flags: [] },
      { cmd: "threatlens config set base-url https://api.threatlens.io", desc: "Point the CLI at a self-hosted or custom backend URL.", flags: [] },
      { cmd: "threatlens config list", desc: "Show all current CLI configuration settings.", flags: [] },
    ],
  },
];

const ENV_VARS = [
  { name: "THREATLENS_API_KEY", example: "tl_sk_xxxxx", desc: "Your ThreatLens API key for authentication." },
  { name: "THREATLENS_BASE_URL", example: "https://api.threatlens.io", desc: "Override the default API endpoint for self-hosted deployments." },
  { name: "THREATLENS_LOG_LEVEL", example: "debug | info | warn", desc: "Set verbosity of CLI output logs." },
  { name: "GITHUB_TOKEN", example: "ghp_xxxxx", desc: "GitHub personal access token for scanning private repositories." },
  { name: "OPENROUTER_API_KEY", example: "sk-or-xxxxx", desc: "OpenRouter key used by the local ThreatLensGO AI assistant." },
];

const INSTALL_METHODS = [
  { label: "pip (Python)", code: "pip install threatlens", icon: Package, color: "#38bdf8" },
  { label: "Homebrew (macOS)", code: "brew install threatlens/tap/threatlens", icon: Globe, color: "#a78bfa" },
  { label: "curl (Linux)", code: "curl -sSL https://install.threatlens.io | sh", icon: Terminal, color: "#34d399" },
  { label: "Docker", code: "docker run --rm -v $(pwd):/repo threatlens/cli scan /repo", icon: Layers, color: "#f59e0b" },
];

const LOCAL_AGENT_STEPS = [
  {
    num: "01", title: "Install the local agent", color: "#38bdf8",
    code: "pip install threatlens[agent]",
    note: "Installs the scanner engine plus the embedded ThreatLensGO AI runtime.",
  },
  {
    num: "02", title: "Configure your keys", color: "#a78bfa",
    code: `export THREATLENS_API_KEY=tl_sk_xxxxxxxx\nexport OPENROUTER_API_KEY=sk-or-xxxxxxxx`,
    note: "The agent uses OpenRouter for AI inference — bring your own key, billed at OpenRouter's rates.",
  },
  {
    num: "03", title: "Start the local agent daemon", color: "#34d399",
    code: "threatlens agent start --port 8765 --watch ./my-project",
    note: "The daemon watches your project directory and streams findings to the ThreatLens dashboard in real time.",
  },
  {
    num: "04", title: "Connect the dashboard", color: "#f59e0b",
    code: "# Dashboard auto-connects at localhost:8765\n# Check: Security Overview → System Pulse",
    note: "The dashboard's System Pulse panel shows green when the local agent is detected.",
  },
];

function CodeBlock({ code, onCopy, copied }) {
  return (
    <div className="relative group rounded-xl overflow-hidden border border-[#1c1c1f] bg-[#09090b]">
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-2">
        <span className="w-2.5 h-2.5 rounded-full bg-[#3f3f46]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#3f3f46]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#3f3f46]" />
      </div>
      <pre className="px-4 pb-4 font-mono text-[12.5px] text-[#a1a1aa] leading-relaxed overflow-x-auto whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
      <button
        onClick={onCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#71717a] hover:text-white transition-all cursor-pointer opacity-0 group-hover:opacity-100"
        title="Copy"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function CliAgentTab({ onNavigate }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [openCategory, setOpenCategory] = useState("Repository Scanning");

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 py-2">

      {/* ── HERO ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8] text-[11px] font-bold uppercase tracking-wider">
            <Terminal className="w-3 h-3" /> CLI Reference
          </span>
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#27272a] border border-[#3f3f46] text-[#a1a1aa] text-[11px] font-mono">
            v2.0.0
          </span>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight">CLI & Local Agent</h1>
        <p className="text-[#71717a] text-base leading-relaxed max-w-2xl">
          The ThreatLens CLI is a powerful command-line scanner that runs on your machine, integrates with your CI/CD, and streams results directly to the dashboard — with a local AI agent for on-device intelligence.
        </p>
      </div>

      {/* ── INSTALL ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Installation</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INSTALL_METHODS.map(({ label, code, icon: Icon, color }) => (
            <div key={label} className="group bg-[#0d0d10] border border-[#1c1c1f] hover:border-[#27272a] rounded-2xl p-4 space-y-3 transition-all cursor-pointer" onClick={() => copy(code, `install-${label}`)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <span className="text-sm font-semibold text-white">{label}</span>
                </div>
                <span className="text-[10px] text-[#3f3f46] group-hover:text-[#71717a] transition-colors">
                  {copiedKey === `install-${label}` ? "✓ Copied" : "click to copy"}
                </span>
              </div>
              <pre className="font-mono text-[12px] text-[#a1a1aa] bg-[#09090b] rounded-lg px-3 py-2 border border-[#1c1c1f] overflow-x-auto">{code}</pre>
            </div>
          ))}
        </div>
      </div>

      {/* ── COMMAND REFERENCE ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Command Reference</h2>
        <div className="bg-[#0d0d10] border border-[#1c1c1f] rounded-2xl overflow-hidden">
          {/* Category tabs */}
          <div className="flex overflow-x-auto gap-0 border-b border-[#1c1c1f]" style={{ scrollbarWidth: "none" }}>
            {COMMANDS.map(({ category, color, icon: Icon }) => (
              <button
                key={category}
                onClick={() => setOpenCategory(category)}
                className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-medium whitespace-nowrap transition-all cursor-pointer border-b-2 ${
                  openCategory === category
                    ? "text-white border-[#38bdf8] bg-[#111114]"
                    : "text-[#52525b] border-transparent hover:text-[#a1a1aa] hover:bg-[#0f0f12]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: openCategory === category ? color : undefined }} />
                {category}
              </button>
            ))}
          </div>

          {/* Commands for selected category */}
          {COMMANDS.filter(c => c.category === openCategory).map(({ cmds, color }) => (
            <div key={openCategory} className="divide-y divide-[#1c1c1f]">
              {cmds.map(({ cmd, desc, flags }, idx) => (
                <div key={cmd} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="font-mono text-sm font-bold" style={{ color }}>
                          {cmd}
                        </code>
                      </div>
                      <p className="text-[12.5px] text-[#71717a] leading-relaxed">{desc}</p>
                    </div>
                    <button
                      onClick={() => copy(cmd, `cmd-${idx}-${openCategory}`)}
                      className="p-1.5 rounded-lg bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#71717a] hover:text-white transition-all cursor-pointer shrink-0"
                    >
                      {copiedKey === `cmd-${idx}-${openCategory}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {flags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {flags.map((f) => (
                        <code key={f} className="px-2 py-0.5 rounded-md bg-[#18181b] border border-[#27272a] text-[#a1a1aa] font-mono text-[11px]">
                          {f}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── LOCAL AGENT SETUP ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Local Agent Setup</h2>
          <p className="text-[#52525b] text-sm mt-1">Run ThreatLens fully on-device — no cloud required for scanning. Results stream to your dashboard via the local agent.</p>
        </div>

        <div className="space-y-3">
          {LOCAL_AGENT_STEPS.map(({ num, title, color, code, note }) => (
            <div key={num} className="bg-[#0d0d10] border border-[#1c1c1f] rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold" style={{ color }}>{num}</span>
                <span className="text-sm font-bold text-white">{title}</span>
              </div>
              <CodeBlock code={code} onCopy={() => copy(code, `step-${num}`)} copied={copiedKey === `step-${num}`} />
              <p className="text-[12px] text-[#52525b] flex items-start gap-1.5">
                <span className="mt-0.5 w-3.5 h-3.5 rounded-full bg-[#27272a] flex items-center justify-center text-[8px] shrink-0">i</span>
                {note}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ENVIRONMENT VARIABLES ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Environment Variables</h2>
        <div className="bg-[#0d0d10] border border-[#1c1c1f] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1.5fr] px-5 py-2.5 border-b border-[#1c1c1f] text-[10.5px] font-bold text-[#52525b] uppercase tracking-wider">
            <span>Variable</span><span>Example</span><span>Description</span>
          </div>
          <div className="divide-y divide-[#1c1c1f]">
            {ENV_VARS.map(({ name, example, desc }) => (
              <div key={name} className="grid grid-cols-[1fr_1fr_1.5fr] items-start px-5 py-3.5 gap-4 hover:bg-[#111114] transition-colors group">
                <code
                  className="font-mono text-[12px] font-bold text-[#38bdf8] cursor-pointer"
                  onClick={() => copy(name, `env-${name}`)}
                  title="Copy"
                >
                  {copiedKey === `env-${name}` ? "✓ copied" : name}
                </code>
                <code className="font-mono text-[12px] text-[#71717a]">{example}</code>
                <span className="text-[12.5px] text-[#52525b]">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CI/CD INTEGRATION ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">CI/CD Integration</h2>
        <p className="text-[#52525b] text-sm">Drop-in GitHub Actions workflow to scan every pull request automatically.</p>
        <CodeBlock
          code={`name: ThreatLens Security Scan

on:
  pull_request:
    branches: [main, develop]

jobs:
  threatlens:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # full history for commit analysis

      - name: Install ThreatLens
        run: pip install threatlens

      - name: Run Security Scan
        env:
          THREATLENS_API_KEY: \${{ secrets.THREATLENS_API_KEY }}
        run: |
          threatlens scan . --full --output json > report.json
          threatlens secrets .
          threatlens dast --target http://localhost:8080 --no-fail

      - name: Upload Report
        uses: actions/upload-artifact@v4
        with:
          name: threatlens-report
          path: report.json`}
          onCopy={() => copy("# GitHub Actions workflow", "cicd-yaml")}
          copied={copiedKey === "cicd-yaml"}
        />
      </div>

      {/* ── TROUBLESHOOTING ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-tight">Troubleshooting</h2>
        <div className="space-y-3">
          {[
            { issue: "Dashboard shows 'scanner offline'", fix: "Ensure the local agent is running: threatlens agent status. Check it's listening on port 8765.", icon: WifiOff, color: "#f59e0b" },
            { issue: "Authentication failed (401)", fix: "Regenerate your API key in the dashboard → Tokens → API Keys. Re-run threatlens login.", icon: Key, color: "#f43f5e" },
            { issue: "No commits found", fix: "Make sure you're scanning a Git repo with history. Use --depth 0 to fetch full history from remote.", icon: GitCommit, color: "#a78bfa" },
            { issue: "DAST scanner finds nothing", fix: "Ensure your target API is running and accessible. Add --verbose to see probe logs.", icon: Activity, color: "#38bdf8" },
          ].map(({ issue, fix, icon: Icon, color }) => (
            <div key={issue} className="bg-[#0d0d10] border border-[#1c1c1f] rounded-2xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}12`, border: `1px solid ${color}22` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{issue}</div>
                <p className="text-[12.5px] text-[#71717a] mt-0.5 leading-relaxed">{fix}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="bg-gradient-to-br from-[#0f0b1e] to-[#090910] border border-[#3b1f6b] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Questions? Ask ThreatLensGO</h3>
          <p className="text-[12.5px] text-[#71717a]">Our AI assistant can explain any CLI command, debug your setup, or generate custom scan configs.</p>
        </div>
        <button
          onClick={() => onNavigate && onNavigate("chatbot")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#a78bfa] hover:bg-[#c4b5fd] text-[#0d0718] text-sm font-bold transition-all shrink-0 cursor-pointer active:scale-[0.98]"
        >
          <Bot className="w-4 h-4" /> Open AI Assistant
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
