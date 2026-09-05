import React from "react";
import {
  LayoutDashboard,
  ShieldAlert,
  FolderGit2,
  Zap,
  FileCheck,
  Plus,
  HelpCircle,
  LogOut,
} from "lucide-react";
import { ThreatLensLogo } from "@/components/common/ThreatLensLogo";
import { useAuth } from "@/contexts/AuthContext";

export default function Sidebar({ activeTab, setActiveTab, onNewTask }) {
  const { user, logout } = useAuth();

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "findings", label: "Findings", icon: ShieldAlert, badge: "8" },
    { id: "repositories", label: "Repositories", icon: FolderGit2, badge: "4" },
    { id: "scanner", label: "Live Prober", icon: Zap, badge: "SecTest" },
    { id: "compliance", label: "Compliance", icon: FileCheck, badge: "94%" },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#0d0e12] border-r border-white/[0.07] flex flex-col justify-between p-4 select-none">
      {/* Top Brand & Actions */}
      <div className="space-y-5">
        {/* Brand Header */}
        <div className="px-1 pt-1 flex items-center justify-between">
          <ThreatLensLogo className="h-7 w-auto" />
        </div>

        {/* Primary Action Button: + New Task / New Scan (Directly matching video design) */}
        <button
          onClick={onNewTask}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-[#f97316] hover:from-[#e03e1e] hover:to-[#ea580c] text-white font-bold text-xs tracking-tight shadow-[0_0_20px_rgba(255,77,45,0.4)] transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Task / Scan</span>
        </button>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? "bg-[#181a22] text-white border border-white/[0.1] shadow-lg"
                    : "text-[#8a99ad] hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-[#f97316]" : "text-[#8a99ad] group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                      isActive
                        ? "bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30"
                        : "bg-white/[0.05] text-[#8a99ad]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section: Help & User Card */}
      <div className="space-y-3 pt-4 border-t border-white/[0.06]">
        <a
          href="https://github.com/ThreatLens"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#8a99ad] hover:text-white transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help & Docs</span>
        </a>

        {/* User Card matching video (Avatar + Name @handle) */}
        <div className="p-2 rounded-xl bg-[#12141c] border border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#f97316] to-[#fb923c] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : "AG"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || "Anna Gunn"}</p>
              <p className="text-[10px] text-[#8a99ad] font-mono truncate">
                @{user?.handle || "agunn25"}
              </p>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-lg text-[#8a99ad] hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
