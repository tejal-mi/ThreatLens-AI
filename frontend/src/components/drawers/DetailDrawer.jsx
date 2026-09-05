import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  FileCode,
  Copy,
  Check,
  Sparkles,
  GitCommit,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export default function DetailDrawer({ isOpen, onClose, data, type = "finding" }) {
  const [copied, setCopied] = useState(false);
  const [aiReview, setAiReview] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  if (!isOpen || !data) return null;

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRunAi = () => {
    setLoadingAi(true);
    toast.info("Analyzing commit diff with ThreatLens AI Neural Engine...");
    setTimeout(() => {
      setLoadingAi(false);
      setAiReview({
        summary: "This commit remediates a critical SQL injection vulnerability by replacing string concatenation with parameterized prepared statement bindings.",
        impact: "An attacker could previously dump all user records and bypass tenant boundaries using unescaped quote characters in the query filter.",
        recommendations: [
          "Always use parameterized binding across all SQL queries.",
          "Add automated AST SAST scanning to CI/CD pipeline.",
        ],
      });
      toast.success("AI Security Review completed!");
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-[#080b12] border-l border-white/[0.1] shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2546ff]/20 text-[#38bdf8] flex items-center justify-center border border-[#38bdf8]/30 shrink-0">
                  {type === "commit" ? <GitCommit className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5 text-rose-400" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white tracking-tight leading-tight">
                    {data.title || data.message || "Security Finding Detail"}
                  </h2>
                  <p className="text-[11px] text-[#8a99ad] font-mono mt-0.5">
                    {type === "commit" ? `Commit ${data.short_sha || data.sha?.slice(0, 7)} · ${data.author_name}` : `${data.cwe || "CWE-89"} · ${data.endpoint || "POST /api"}`}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8a99ad] hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Finding / Commit Metadata Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
              {data.severity && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {data.severity}
                </span>
              )}
              {data.summary?.risk_level && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Risk: {data.summary.risk_level} ({data.summary.risk_score})
                </span>
              )}
              {data.cwe && (
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-mono bg-white/[0.06] text-[#cbd5e1]">
                  {data.cwe}
                </span>
              )}
            </div>
          </div>

          {/* Body Content */}
          <div className="space-y-4 text-xs">
            {/* Root Cause & Explanation */}
            {data.explanation && (
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold text-white uppercase font-mono tracking-wider text-[#38bdf8]">
                  Technical Explanation
                </h3>
                <p className="text-[#cbd5e1] leading-relaxed p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  {data.explanation}
                </p>
              </div>
            )}

            {/* Probe Trace or Evidence */}
            {data.evidence && (
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold text-white uppercase font-mono tracking-wider text-[#8a99ad]">
                  Probe Evidence & Trace
                </h3>
                <pre className="p-3 rounded-xl bg-black/60 border border-white/[0.08] text-[11px] font-mono text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                  {data.evidence}
                </pre>
              </div>
            )}

            {/* Actionable Code Fix Remediation */}
            {data.remediation && (
              <div className="space-y-1.5">
                <h3 className="text-[11px] font-bold text-white uppercase font-mono tracking-wider text-emerald-400">
                  Actionable Remediation
                </h3>
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[#cbd5e1] space-y-2">
                  <p className="font-medium text-white">{data.remediation}</p>
                </div>
              </div>
            )}

            {/* AI Review Trigger & Output */}
            {type === "commit" && (
              <div className="space-y-3 pt-2">
                {!aiReview ? (
                  <button
                    onClick={handleRunAi}
                    disabled={loadingAi}
                    className="w-full py-2.5 rounded-xl bg-[#2546ff] hover:bg-[#0d27c7] text-white text-xs font-bold shadow-[0_0_15px_rgba(37,70,255,0.3)] transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${loadingAi ? "animate-spin" : ""}`} />
                    <span>{loadingAi ? "Generating AI Review..." : "Run AI Security Review"}</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#0a0d15] border border-[#38bdf8]/30 space-y-3 shadow-lg">
                    <div className="flex items-center gap-2 text-[#38bdf8] font-bold text-xs">
                      <Sparkles className="w-4 h-4" />
                      <span>ThreatLens AI Review Receipt</span>
                    </div>

                    <p className="text-[#cbd5e1] leading-relaxed">{aiReview.summary}</p>
                    <p className="text-xs text-amber-300 font-mono">Impact: {aiReview.impact}</p>

                    <div className="space-y-1">
                      <p className="text-[10px] font-mono uppercase text-[#8a99ad]">Recommendations:</p>
                      <ul className="list-disc pl-4 text-[#cbd5e1] space-y-0.5">
                        {aiReview.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
            <button
              onClick={() => {
                handleCopy(JSON.stringify(data, null, 2));
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-semibold text-white border border-white/[0.08] transition-colors flex items-center gap-2"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied JSON" : "Copy Payload"}</span>
            </button>

            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#2546ff] hover:bg-[#0d27c7] text-xs font-bold text-white shadow-[0_0_10px_rgba(37,70,255,0.3)] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
