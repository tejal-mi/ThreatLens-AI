import React, { useState, useMemo, useEffect } from "react";
import {
  Calendar,
  RotateCcw,
  Download,
  ChevronDown,
  Sparkles,
  Terminal,
  Bot,
  Check,
  Zap,
  Shield,
  Building2,
  X as XIcon,
  Star,
  Lock,
  Users,
  Globe,
  Clock,
  ArrowRight,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export const OPENROUTER_PRICING = {
  chatbot: { model: "DeepSeek V3", inputPricePerM: 0.14, outputPricePerM: 0.28, reasoningPricePerM: 2.19 },
  terminal: { model: "Llama 3.3 70B / Gemini Flash", inputPricePerM: 0.12, outputPricePerM: 0.30 },
};

const INITIAL_DAILY_DATA = [
  { date: "Aug 08", fullDate: "Aug 08, 2026 UTC", chatIn: 12400, chatOut: 3600, termIn: 8200, termOut: 1100, requests: 4 },
  { date: "Aug 09", fullDate: "Aug 09, 2026 UTC", chatIn: 8900, chatOut: 2400, termIn: 4500, termOut: 900, requests: 3 },
  { date: "Aug 10", fullDate: "Aug 10, 2026 UTC", chatIn: 16500, chatOut: 5100, termIn: 12100, termOut: 1800, requests: 6 },
  { date: "Aug 11", fullDate: "Aug 11, 2026 UTC", chatIn: 5400, chatOut: 1800, termIn: 3200, termOut: 600, requests: 2 },
  { date: "Aug 12", fullDate: "Aug 12, 2026 UTC", chatIn: 9800, chatOut: 3200, termIn: 7600, termOut: 1200, requests: 4 },
  { date: "Aug 13", fullDate: "Aug 13, 2026 UTC", chatIn: 14200, chatOut: 4800, termIn: 11400, termOut: 1900, requests: 5 },
  { date: "Aug 14", fullDate: "Aug 14, 2026 UTC", chatIn: 22100, chatOut: 7400, termIn: 18300, termOut: 3100, requests: 8 },
  { date: "Aug 15", fullDate: "Aug 15, 2026 UTC", chatIn: 18600, chatOut: 6200, termIn: 14200, termOut: 2400, requests: 7 },
  { date: "Aug 16", fullDate: "Aug 16, 2026 UTC", chatIn: 11200, chatOut: 3800, termIn: 9100, termOut: 1500, requests: 4 },
  { date: "Aug 17", fullDate: "Aug 17, 2026 UTC", chatIn: 38500, chatOut: 14200, termIn: 32400, termOut: 6800, requests: 15 },
  { date: "Aug 18", fullDate: "Aug 18, 2026 UTC", chatIn: 24100, chatOut: 8100, termIn: 19800, termOut: 3400, requests: 9 },
  { date: "Aug 19", fullDate: "Aug 19, 2026 UTC", chatIn: 19400, chatOut: 6500, termIn: 16100, termOut: 2900, requests: 7 },
  { date: "Aug 20", fullDate: "Aug 20, 2026 UTC", chatIn: 27800, chatOut: 9300, termIn: 22500, termOut: 4100, requests: 11 },
  { date: "Aug 21", fullDate: "Aug 21, 2026 UTC", chatIn: 31200, chatOut: 10800, termIn: 26400, termOut: 5200, requests: 13 },
  { date: "Aug 22", fullDate: "Aug 22, 2026 UTC", chatIn: 28900, chatOut: 9900, termIn: 24100, termOut: 4600, requests: 12 },
  { date: "Aug 23", fullDate: "Aug 23, 2026 UTC", chatIn: 34500, chatOut: 12100, termIn: 29800, termOut: 5900, requests: 14 },
];

export const PLANS = [
  {
    id: "free", name: "Free", icon: Zap, monthlyPrice: 0, yearlyPrice: 0,
    description: "For individuals exploring ThreatLens security scanning.",
    color: "#71717a", border: "border-[#27272a]", cta: "Current Plan", current: true, tokens: "500K tokens / mo",
    features: [
      { label: "5 repositories", included: true },
      { label: "100 commits / month", included: true },
      { label: "ThreatLensGO (10 sessions)", included: true },
      { label: "Basic secret detection", included: true },
      { label: "Community support", included: true },
      { label: "CI/CD pipeline scanning", included: false },
      { label: "Compliance reports", included: false },
      { label: "Team seats", included: false },
      { label: "SIEM & webhook integrations", included: false },
      { label: "SLA & dedicated support", included: false },
    ],
  },
  {
    id: "pro", name: "Pro", icon: Shield, monthlyPrice: 29, yearlyPrice: 23,
    description: "For developers & small security teams shipping confidently.",
    color: "#38bdf8", border: "border-[#1e4068]", cta: "Upgrade to Pro", popular: true, tokens: "10M tokens / mo",
    features: [
      { label: "Unlimited repositories", included: true },
      { label: "Unlimited commits", included: true },
      { label: "ThreatLensGO (unlimited)", included: true },
      { label: "Advanced secret detection", included: true },
      { label: "Priority email support", included: true },
      { label: "CI/CD pipeline scanning", included: true },
      { label: "Compliance reports (SOC2, OWASP)", included: true },
      { label: "5 team seats", included: true },
      { label: "SIEM & webhook integrations", included: false },
      { label: "SLA & dedicated support", included: false },
    ],
  },
  {
    id: "enterprise", name: "Enterprise", icon: Building2, monthlyPrice: null, yearlyPrice: null,
    description: "Custom security infrastructure for large engineering orgs.",
    color: "#a78bfa", border: "border-[#3b1f6b]", cta: "Contact Sales", tokens: "Unlimited tokens",
    features: [
      { label: "Unlimited repositories", included: true },
      { label: "Unlimited commits", included: true },
      { label: "ThreatLensGO (custom models)", included: true },
      { label: "Enterprise secret detection + DLP", included: true },
      { label: "24/7 dedicated support", included: true },
      { label: "CI/CD pipeline scanning", included: true },
      { label: "Full compliance suite (PCI, HIPAA, ISO)", included: true },
      { label: "Unlimited team seats", included: true },
      { label: "SIEM & webhook integrations", included: true },
      { label: "Custom SLA & on-prem deployment", included: true },
    ],
  },
];

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 shadow-2xl text-xs space-y-1 z-50">
        <div className="text-white font-medium">{d.fullDate}</div>
        <div className="text-[#A1A1AA] flex justify-between gap-4"><span>Total Spend:</span><span className="text-white font-semibold">${d.spend.toFixed(5)}</span></div>
        <div className="text-[#38BDF8] flex justify-between gap-4"><span>Chatbot:</span><span>${d.chatCost.toFixed(5)}</span></div>
        <div className="text-[#F59E0B] flex justify-between gap-4"><span>Terminal:</span><span>${d.termCost.toFixed(5)}</span></div>
        <div className="text-[#A1A1AA] flex justify-between gap-4 pt-1 border-t border-[#27272a]"><span>Tokens:</span><span>{d.totalTokens.toLocaleString()}</span></div>
      </div>
    );
  }
  return null;
}

export default function TokenUsageTab({ user, initialSection = "usage", onBack }) {
  const [viewMode, setViewMode] = useState(initialSection === "plans" ? "plans" : "usage");
  const [activeCategory, setActiveCategory] = useState("chatbot");
  const [selectedProject] = useState("Default project");
  const [dateRange] = useState("08/08/26 - 08/23/26");
  const [groupBy] = useState("1d");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeHoverBar, setActiveHoverBar] = useState(null);
  const [billingCycle, setBillingCycle] = useState("monthly");

  // Keep viewMode synchronized if initialSection changes from navbar clicks
  useEffect(() => {
    if (initialSection) {
      setViewMode(initialSection === "plans" ? "plans" : "usage");
    }
  }, [initialSection]);

  const calculatedData = useMemo(() => INITIAL_DAILY_DATA.map((day) => {
    const chatCost = (day.chatIn / 1e6) * OPENROUTER_PRICING.chatbot.inputPricePerM + (day.chatOut / 1e6) * OPENROUTER_PRICING.chatbot.outputPricePerM;
    const termCost = (day.termIn / 1e6) * OPENROUTER_PRICING.terminal.inputPricePerM + (day.termOut / 1e6) * OPENROUTER_PRICING.terminal.outputPricePerM;
    return { ...day, chatCost, termCost, spend: chatCost + termCost, totalTokens: day.chatIn + day.chatOut + day.termIn + day.termOut };
  }), []);

  const summary = useMemo(() => {
    let totalSpend = 0, totalTokens = 0, totalRequests = 0, chatSpend = 0, termSpend = 0;
    calculatedData.forEach((d) => { totalSpend += d.spend; totalTokens += d.totalTokens; totalRequests += d.requests; chatSpend += d.chatCost; termSpend += d.termCost; });
    return { totalSpend, totalTokens, totalRequests, chatSpend, termSpend };
  }, [calculatedData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => { setIsRefreshing(false); toast.success("Usage metrics synchronized with OpenRouter telemetry"); }, 600);
  };

  const handleExport = () => {
    const csv = "data:text/csv;charset=utf-8,Date,ChatIn,ChatOut,TermIn,TermOut,Spend\n" + calculatedData.map(d => `${d.fullDate},${d.chatIn},${d.chatOut},${d.termIn},${d.termOut},${d.spend.toFixed(6)}`).join("\n");
    const a = document.createElement("a"); a.href = encodeURI(csv); a.download = `threatlens_usage_${activeCategory}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Usage telemetry exported as CSV");
  };

  return (
    <div className="flex-1 bg-[#121214] text-[#EDEDED] font-sans antialiased min-h-[calc(100vh-3.5rem)] flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 select-none overflow-y-auto">

      {/* ── TOP NAVIGATION BAR (Switcher between Usage and Plans) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#222226]">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-[#1c1c1f] hover:bg-[#25252a] border border-[#2e2e33] text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          {/* Sub-view switcher */}
          <div className="flex items-center p-1 rounded-xl bg-[#18181b] border border-[#27272a]">
            <button
              onClick={() => setViewMode("usage")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "usage"
                  ? "bg-[#27272a] text-white shadow-xs"
                  : "text-[#71717a] hover:text-white"
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${viewMode === "usage" ? "text-[#38bdf8]" : ""}`} />
              <span>Token Usage</span>
            </button>

            <button
              onClick={() => setViewMode("plans")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "plans"
                  ? "bg-[#27272a] text-white shadow-xs"
                  : "text-[#71717a] hover:text-white"
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${viewMode === "plans" ? "text-[#f59e0b]" : ""}`} />
              <span>Premium Plans</span>
              <span className="px-1.5 py-0.2 text-[9px] rounded-md bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30 font-bold">
                PRO
              </span>
            </button>
          </div>

          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c1c1f] border border-[#2e2e33] text-xs text-[#d1d5db]">
            <span>{selectedProject}</span>
          </div>
        </div>

        {/* Right Controls (shown on usage tab) */}
        {viewMode === "usage" ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => toast.info("Date: Aug 08 to Aug 23, 2026")} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1c1c1f] hover:bg-[#25252a] border border-[#2e2e33] text-xs text-[#E5E7EB] transition-colors cursor-pointer">
              <Calendar className="w-3.5 h-3.5 text-[#9ca3af]" /><span>{dateRange}</span><ChevronDown className="w-3.5 h-3.5 text-[#9ca3af] ml-1" />
            </button>
            <button onClick={handleRefresh} className={`p-2 rounded-lg bg-[#1c1c1f] hover:bg-[#25252a] border border-[#2e2e33] text-[#9ca3af] hover:text-white transition-all cursor-pointer ${isRefreshing ? "animate-spin text-[#38BDF8]" : ""}`} title="Refresh">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button onClick={handleExport} className="p-2 rounded-lg bg-[#1c1c1f] hover:bg-[#25252a] border border-[#2e2e33] text-[#9ca3af] hover:text-white transition-all cursor-pointer" title="Export CSV">
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setViewMode("usage")}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1c1c1f] hover:bg-[#25252a] border border-[#2e2e33] text-xs text-[#d1d5db] hover:text-white transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>View Token Telemetry</span>
          </button>
        )}
      </div>

      {/* ── CONDITIONAL VIEW 1: TOKEN USAGE TELEMETRY ── */}
      {viewMode === "usage" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Quick Upgrade Callout Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-[#0b1a30] via-[#101018] to-[#120a28] border border-[#1e4068]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-[#38bdf8]" />
              </div>
              <div>
                <div className="text-sm font-bold text-white">Need higher token throughput & unlimited repository scans?</div>
                <div className="text-xs text-[#71717a]">Upgrade to ThreatLens Pro for 10M tokens/mo, CI/CD scanning, and team seats.</div>
              </div>
            </div>
            <button
              onClick={() => setViewMode("plans")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-b from-[#1e5adb] via-[#1342a8] to-[#0c2a74] text-[#E0F2FE] hover:text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md shadow-blue-900/30 hover:brightness-110"
            >
              <span>Explore Plans</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hero Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-medium text-[#9ca3af]">Total Spend</div>
                  <div className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-1">${summary.totalSpend.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9ca3af] flex items-center gap-1">Group by <ChevronDown className="w-3 h-3" /></span>
                  <div className="px-2 py-1 rounded-md bg-[#27272a] text-xs font-semibold text-white">{groupBy}</div>
                </div>
              </div>
              <div className="h-60 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calculatedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.4} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#71717A", fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#71717A", fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(2)}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="spend" radius={[4, 4, 0, 0]} onMouseEnter={(_, i) => setActiveHoverBar(i)} onMouseLeave={() => setActiveHoverBar(null)}>
                      {calculatedData.map((_, i) => (
                        <Cell key={i} fill={i === activeHoverBar ? "#38BDF8" : i === calculatedData.length - 1 ? "#2962FF" : "#2C2C32"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-xs text-[#71717A] pt-2 border-t border-[#222226]">
                <span>Aug 08</span><span>Aug 23</span>
              </div>
            </div>

            <div className="bg-[#18181b] border border-[#27272a] rounded-2xl p-5 flex flex-col justify-between space-y-5">
              <div className="space-y-1">
                <div className="text-xs text-[#9ca3af]">August spend</div>
                <div className="text-sm font-semibold text-white">Personal</div>
                <div className="text-2xl font-bold text-white tracking-tight">${summary.totalSpend.toFixed(2)}</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                  <span>Total tokens</span><span className="text-[#38BDF8] font-mono font-medium">{summary.totalTokens.toLocaleString()}</span>
                </div>
                <div className="w-full h-1.5 bg-[#27272a] rounded-full overflow-hidden relative">
                  <div className="h-full bg-gradient-to-r from-[#2563EB] via-[#60A5FA] to-[#F43F5E] rounded-full" style={{ width: "42%" }} />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-[#F43F5E] bg-[#18181b]" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                  <span>Total requests</span><span className="font-mono text-white font-medium">{summary.totalRequests}</span>
                </div>
                <div className="w-full border-b border-dashed border-[#3f3f46] pt-1" />
              </div>
              <div className="pt-2 border-t border-[#222226] space-y-2">
                <div className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Channel Breakdown</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#d1d5db]"><Bot className="w-3.5 h-3.5 text-[#38BDF8]" />Chatbot Assistant</span>
                  <span className="font-mono font-medium text-white">${summary.chatSpend.toFixed(3)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[#d1d5db]"><Terminal className="w-3.5 h-3.5 text-[#F59E0B]" />Terminal Scanner</span>
                  <span className="font-mono font-medium text-white">${summary.termSpend.toFixed(3)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-8 border-b border-[#222226] pb-1">
              {[{ id: "chatbot", Icon: Bot, label: "Chatbot Usage", col: "text-[#38BDF8]" }, { id: "terminal", Icon: Terminal, label: "Terminal Usage", col: "text-[#F59E0B]" }].map(({ id, Icon, label, col }) => (
                <button key={id} onClick={() => setActiveCategory(id)} className={`pb-3 text-sm font-semibold relative cursor-pointer flex items-center gap-2 ${activeCategory === id ? "text-white" : "text-[#71717A] hover:text-white"}`}>
                  <Icon className={`w-4 h-4 ${col}`} />{label}
                  {activeCategory === id && <span className="absolute bottom-0 inset-x-0 h-0.5 bg-white rounded-full" />}
                </button>
              ))}
            </div>

            {activeCategory === "chatbot" ? (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-1">
                    <div className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />Referenced Model</div>
                    <div className="text-sm font-semibold text-white">DeepSeek V3 / R1</div>
                    <div className="text-xs text-[#9ca3af]">OpenRouter low-cost benchmark</div>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-1">
                    <div className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider">Input Tokens Rate</div>
                    <div className="text-sm font-bold text-[#38BDF8]">$0.14 / 1M Tokens</div>
                    <div className="text-xs text-[#9ca3af]">$0.00000014 per prompt token</div>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-1">
                    <div className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider">Output Tokens Rate</div>
                    <div className="text-sm font-bold text-[#38BDF8]">$0.28 / 1M Tokens</div>
                    <div className="text-xs text-[#9ca3af]">$0.00000028 per response token</div>
                  </div>
                </div>
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-5 py-3.5 border-b border-[#222226] flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">Chatbot Activity & Spend Breakdown</div>
                    <div className="text-xs text-[#9ca3af]">Total: <span className="text-white font-bold">${summary.chatSpend.toFixed(4)}</span></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1c1c1f] text-[#71717A] uppercase text-[10px] tracking-wider border-b border-[#27272a]">
                        <tr>{["Time (UTC)", "Service", "Input Tokens", "Output Tokens", "Total Tokens", "Cost (USD)", "Status"].map(h => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-[#222226] text-[#D1D5DB]">
                        {calculatedData.slice(-6).reverse().map((d, i) => (
                          <tr key={i} className="hover:bg-[#202024] transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[#9ca3af]">{d.fullDate}</td>
                            <td className="px-4 py-2.5 font-medium text-white"><span className="flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-[#38BDF8]" />ThreatLens AI Chat</span></td>
                            <td className="px-4 py-2.5 font-mono">{d.chatIn.toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono">{d.chatOut.toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono text-white">{(d.chatIn + d.chatOut).toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono text-[#38BDF8] font-semibold">${d.chatCost.toFixed(5)}</td>
                            <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">200 OK</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-1">
                    <div className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-[#F59E0B]" />Scanner Engine</div>
                    <div className="text-sm font-semibold text-white">Llama 3.3 / Gemini Flash</div>
                    <div className="text-xs text-[#9ca3af]">Diff & vulnerability tokenization</div>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-1">
                    <div className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider">AST & Diff Ingest Rate</div>
                    <div className="text-sm font-bold text-[#F59E0B]">$0.12 / 1M Tokens</div>
                    <div className="text-xs text-[#9ca3af]">$0.00000012 per ingested token</div>
                  </div>
                  <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-4 space-y-1">
                    <div className="text-[11px] text-[#71717A] uppercase font-bold tracking-wider">Security Findings Rate</div>
                    <div className="text-sm font-bold text-[#F59E0B]">$0.30 / 1M Tokens</div>
                    <div className="text-xs text-[#9ca3af]">$0.00000030 per report token</div>
                  </div>
                </div>
                <div className="bg-[#18181b] border border-[#27272a] rounded-2xl overflow-hidden shadow-xl">
                  <div className="px-5 py-3.5 border-b border-[#222226] flex items-center justify-between">
                    <div className="text-sm font-semibold text-white">Terminal & CLI Automated Scan Logs</div>
                    <div className="text-xs text-[#9ca3af]">Total: <span className="text-white font-bold">${summary.termSpend.toFixed(4)}</span></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#1c1c1f] text-[#71717A] uppercase text-[10px] tracking-wider border-b border-[#27272a]">
                        <tr>{["Time (UTC)", "Scan Target", "Diff Tokens", "Finding Tokens", "Total Tokens", "Cost (USD)", "Status"].map(h => <th key={h} className="px-4 py-2.5 font-semibold">{h}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-[#222226] text-[#D1D5DB]">
                        {calculatedData.slice(-6).reverse().map((d, i) => (
                          <tr key={i} className="hover:bg-[#202024] transition-colors">
                            <td className="px-4 py-2.5 font-mono text-[#9ca3af]">{d.fullDate}</td>
                            <td className="px-4 py-2.5 font-medium text-white"><span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-[#F59E0B]" />CLI Commit Scan #{i + 104}</span></td>
                            <td className="px-4 py-2.5 font-mono">{d.termIn.toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono">{d.termOut.toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono text-white">{(d.termIn + d.termOut).toLocaleString()}</td>
                            <td className="px-4 py-2.5 font-mono text-[#F59E0B] font-semibold">${d.termCost.toFixed(5)}</td>
                            <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium">Completed</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONDITIONAL VIEW 2: PREMIUM PLANS & TIERS ── */}
      {viewMode === "plans" && (
        <div className="space-y-10 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-xs text-[#a1a1aa]">
              <Star className="w-3 h-3 text-[#f59e0b] fill-[#f59e0b]" />
              <span className="font-bold uppercase text-[10.5px] tracking-wide">Subscription Plans & Upgrades</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">Simple, transparent pricing</h2>
            <p className="text-[#71717a] text-sm max-w-md leading-relaxed">Scale your security posture with the right plan. Upgrade or downgrade anytime.</p>

            {/* Billing Toggle */}
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-sm font-medium transition-colors ${billingCycle === "monthly" ? "text-white" : "text-[#52525b]"}`}>Monthly</span>
              <button onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none ${billingCycle === "yearly" ? "bg-[#38bdf8]" : "bg-[#27272a]"}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${billingCycle === "yearly" ? "translate-x-5" : "translate-x-0"}`} />
              </button>
              <span className={`text-sm font-medium transition-colors ${billingCycle === "yearly" ? "text-white" : "text-[#52525b]"}`}>Yearly</span>
              {billingCycle === "yearly" && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[11px] font-bold">Save 20%</span>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PLANS.map((plan) => {
              const PlanIcon = plan.icon;
              const displayPrice = plan.monthlyPrice === null ? null : billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
              return (
                <div key={plan.id} className={`relative flex flex-col rounded-2xl border ${plan.border} p-6 sm:p-7 gap-5 transition-all duration-300 hover:shadow-2xl ${
                  plan.popular ? "bg-gradient-to-b from-[#0b1a30] to-[#090910] shadow-[0_0_48px_rgba(56,189,248,0.07)]"
                  : plan.id === "enterprise" ? "bg-gradient-to-b from-[#100b26] to-[#090910]"
                  : "bg-[#0d0d10]"}`}>

                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#38bdf8] text-[#04101c] text-[11px] font-bold tracking-wide shadow-lg shadow-sky-500/30 whitespace-nowrap">
                      <Sparkles className="w-3 h-3" />Most Popular
                    </div>
                  )}

                  {/* Plan header */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${plan.color}15`, border: `1px solid ${plan.color}28` }}>
                        <PlanIcon className="w-5 h-5" style={{ color: plan.color }} />
                      </div>
                      <div>
                        <div className="text-[16px] font-bold text-white leading-tight">{plan.name}</div>
                        <div className="text-[11px] text-[#52525b] font-medium">{plan.tokens}</div>
                      </div>
                    </div>
                    <p className="text-[12.5px] text-[#71717a] leading-relaxed">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="space-y-0.5">
                    {displayPrice === null ? (
                      <><div className="text-3xl font-bold text-white">Custom</div><div className="text-xs text-[#52525b]">Volume-based pricing</div></>
                    ) : (
                      <>
                        <div className="flex items-end gap-1.5">
                          <span className="text-3xl font-bold text-white">${displayPrice}</span>
                          <span className="text-[#52525b] text-sm pb-1">/ mo</span>
                        </div>
                        {billingCycle === "yearly" && displayPrice > 0 && <div className="text-[11.5px] text-emerald-400 font-medium">${plan.monthlyPrice - plan.yearlyPrice} saved per month</div>}
                        {displayPrice === 0 && <div className="text-[11.5px] text-[#52525b]">Free forever, no card required</div>}
                      </>
                    )}
                  </div>

                  {/* CTA */}
                  <button onClick={() => plan.current ? toast.info("You are currently on the Free tier") : plan.id === "enterprise" ? toast.info("Contact sales@threatlens.io for custom deployment") : toast.success(`Upgrading to ${plan.name}...`)}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                      plan.current ? "bg-[#1c1c1f] border border-[#27272a] text-[#52525b] cursor-default"
                      : plan.popular ? "bg-gradient-to-b from-[#1e5adb] via-[#1342a8] to-[#0c2a74] text-[#E0F2FE] hover:text-white shadow-lg shadow-blue-900/30 hover:brightness-110 active:scale-[0.98]"
                      : plan.id === "enterprise" ? "bg-transparent border border-[#3b1f6b] hover:border-[#a78bfa] text-[#a78bfa] hover:bg-[#a78bfa]/10 active:scale-[0.98]"
                      : "bg-[#1c1c1f] hover:bg-[#252528] border border-[#2e2e33] text-white active:scale-[0.98]"}`}>
                    {plan.current ? <><BadgeCheck className="w-4 h-4" />{plan.cta}</> : <>{plan.cta}<ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>

                  <div className="border-t border-dashed" style={{ borderColor: `${plan.color}20` }} />

                  {/* Features */}
                  <div className="space-y-2.5 flex-1">
                    <div className="text-[10.5px] font-bold text-[#52525b] uppercase tracking-widest">What's included</div>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        {feature.included ? (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${plan.color}18` }}>
                            <Check className="w-2.5 h-2.5" style={{ color: plan.color }} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-[#1c1c1f]">
                            <XIcon className="w-2.5 h-2.5 text-[#3f3f46]" />
                          </div>
                        )}
                        <span className={`text-[12.5px] leading-snug ${feature.included ? "text-[#d4d4d8]" : "text-[#3f3f46]"}`}>{feature.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Trust Strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-6 pb-4 border-t border-[#1c1c1f]">
            {[{ Icon: Lock, label: "SOC 2 Type II" }, { Icon: Globe, label: "GDPR Compliant" }, { Icon: Clock, label: "99.9% Uptime SLA" }, { Icon: Users, label: "Cancel anytime" }].map(({ Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-[#3f3f46] text-xs">
                <Icon className="w-3.5 h-3.5" /><span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
