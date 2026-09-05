import React from "react";
import { Search, Bell, Sparkles, Plus, Terminal } from "lucide-react";

export default function Header({
  title = "Overview",
  subtitle,
  onOpenCommand,
  onPrimaryAction,
  primaryActionLabel = "New Scan",
}) {
  return (
    <header className="h-16 w-full border-b border-white/[0.07] bg-[#07090e]/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30 select-none">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-base font-bold text-white tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[11px] text-[#8a99ad] font-mono">{subtitle}</p>}
      </div>

      {/* Right Controls: Search + Primary Action + Notifications */}
      <div className="flex items-center gap-3">
        {/* Global Search Bar */}
        <button
          onClick={onOpenCommand}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-[#0a0d15] border border-white/[0.08] text-[#8a99ad] hover:border-white/[0.16] hover:text-white text-xs transition-all w-48 sm:w-64"
        >
          <Search className="w-3.5 h-3.5 text-[#38bdf8]" />
          <span className="truncate flex-1 text-left">Search anything...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[10px] font-mono text-[#8a99ad]">⌘K</kbd>
        </button>

        {/* Primary Action Button */}
        {onPrimaryAction && (
          <button
            onClick={onPrimaryAction}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#2546ff] hover:bg-[#0d27c7] text-white text-xs font-bold shadow-[0_0_15px_rgba(37,70,255,0.3)] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{primaryActionLabel}</span>
          </button>
        )}

        {/* Notification Bell */}
        <button className="relative p-2 rounded-xl text-[#8a99ad] hover:text-white hover:bg-white/[0.05] border border-white/[0.06] transition-all">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#2546ff] shadow-[0_0_8px_#2546ff]" />
        </button>
      </div>
    </header>
  );
}
