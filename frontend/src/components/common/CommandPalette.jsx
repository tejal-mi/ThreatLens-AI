import React, { useEffect, useState } from "react";
import { Search, X, Folder, Shield, Zap, Terminal, GitCommit, ArrowRight } from "lucide-react";

export default function CommandPalette({ isOpen, onClose, onSelect }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose ? (isOpen ? onClose() : null) : null;
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const suggestions = [
    { type: "repo", title: "ThreatLens / ThreatLens", sub: "Main Security Architecture Repo", icon: Folder },
    { type: "repo", title: "02_vulnerable_ecommerce_py", sub: "Flask Target API · 3 Critical Findings", icon: Shield },
    { type: "audit", title: "Run SecTest Prober on localhost:8000", sub: "Dynamic penetration test suite", icon: Zap },
    { type: "commit", title: "Commit 96e2a87 — Sanitize SQL query", sub: "Alex Vance · Low Risk", icon: GitCommit },
    { type: "nav", title: "Open Superadmin Infrastructure Config", sub: "SMTP, OAuth & JWT token settings", icon: Terminal },
  ];

  const filtered = suggestions.filter(
    (s) =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.sub.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-[#0a0d15] border border-white/[0.12] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08]">
          <Search className="w-4 h-4 text-[#38bdf8]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, repository name, or commit SHA..."
            className="flex-1 bg-transparent text-white text-xs outline-none placeholder-[#8a99ad]"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-[#8a99ad] hover:text-white hover:bg-white/[0.06] text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="p-2 max-h-80 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8a99ad]">
              No matching commands or repositories found.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    onSelect && onSelect(item);
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl text-left hover:bg-white/[0.05] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-[#2546ff]/15 text-[#38bdf8] flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white group-hover:text-[#38bdf8] truncate transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[#8a99ad] truncate font-mono">{item.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#8a99ad] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })
          )}
        </div>

        {/* Keyboard hints footer */}
        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.05] flex items-center justify-between text-[10px] text-[#8a99ad] font-mono">
          <span>Navigation: ↑ ↓ · Select: ↵</span>
          <span>Close: ESC</span>
        </div>
      </div>
    </div>
  );
}
