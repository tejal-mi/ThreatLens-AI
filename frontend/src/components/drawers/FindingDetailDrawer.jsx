import React, { useState } from "react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  FileText,
  FileCode,
  MoreHorizontal,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  User,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export default function FindingDetailDrawer({ isOpen, onClose, finding }) {
  const [status, setStatus] = useState("In Progress");

  if (!isOpen || !finding) return null;

  const handleResolve = () => {
    setStatus("Resolved");
    toast.success(`Finding ${finding.id} marked as Resolved!`);
  };

  const handleRequestRetest = () => {
    toast.info(`Requesting SecTest AI automated re-probe for ${finding.id}...`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Slide-over Drawer (Directly matching video at 00:04 - 00:05) */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0f1118] border-l border-white/[0.1] shadow-2xl flex flex-col justify-between p-6 overflow-y-auto animate-in slide-in-from-right duration-200 space-y-6">
          {/* Top Header: ID + Action Buttons + Close */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white font-['Sora',sans-serif] tracking-tight">
                {finding.id || "FND-0874"}
              </h2>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8a99ad] hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resolved & Request Retest Buttons matching video */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleResolve}
                className="py-2 px-3 rounded-xl bg-gradient-to-r from-[#ff4d2d] to-[#f97316] hover:from-[#e03e1e] hover:to-[#ea580c] text-white font-bold text-xs shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolved</span>
              </button>

              <button
                onClick={handleRequestRetest}
                className="py-2 px-3 rounded-xl bg-[#181a24] hover:bg-[#202330] border border-white/[0.08] text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Request Retest</span>
              </button>
            </div>
          </div>

          {/* Section 1: Summary Grid (Matching video) */}
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#f97316]" />
              <span>Summary</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#07090e] border border-white/[0.06] space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#8a99ad]">STATUS:</span>
                <span className="text-white font-semibold flex items-center gap-1.5 bg-white/[0.04] px-2 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]" />
                  <span>{status}</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8a99ad]">ASSET:</span>
                <span className="text-white font-semibold">{finding.asset || "internal-portal"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8a99ad]">SEVERITY:</span>
                <span className="text-amber-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded bg-amber-400" />
                  <span>{finding.severity || "Medium"}</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8a99ad]">CVSS SCORE:</span>
                <span className="text-white font-bold">{finding.cvss || "3.4"}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8a99ad]">ASSIGNED TO:</span>
                <span className="text-[#38bdf8] font-semibold flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-md bg-[#f97316] text-[8px] font-bold text-white flex items-center justify-center">
                    RS
                  </span>
                  <span>Raya Sanders</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8a99ad]">FIX DATE:</span>
                <span className="text-white">{finding.date || "2025-05-11"}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Evidence & Probe Attachments (Matching video) */}
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <FileCode className="w-3.5 h-3.5 text-[#38bdf8]" />
              <span>Evidence</span>
            </div>

            <div className="space-y-2">
              {[
                { name: "pli-scan.csv", size: "0.75 MB" },
                { name: "dsar-log.csv", size: "1.7 MB" },
                { name: "breach-note.docx", size: "1.8 MB" },
              ].map((file, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-[#07090e] border border-white/[0.06] flex items-center justify-between text-xs font-mono group hover:border-white/[0.14] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-4 h-4 text-[#8a99ad] shrink-0 group-hover:text-white" />
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{file.name}</p>
                      <p className="text-[10px] text-[#8a99ad]">{file.size}</p>
                    </div>
                  </div>

                  <button className="text-[#8a99ad] hover:text-white p-1 rounded">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Chronological Audit History (Directly matching video) */}
          <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>History</span>
            </div>

            <div className="space-y-2.5 text-xs text-[#cbd5e1]">
              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-white/40 mt-1.5 shrink-0" />
                <p>
                  <strong className="text-white">Raya Sanders</strong> created the issue.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#f97316] mt-1.5 shrink-0" />
                <p>
                  <strong className="text-white">Raya Sanders</strong> changed status from Triaged to In Progress.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <p>
                  <strong className="text-white">Raya Sanders</strong> set severity to Medium.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8] mt-1.5 shrink-0" />
                <p>
                  <strong className="text-white">Raya Sanders</strong> self-assigned the issue.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <p>
                  <strong className="text-white">Raya Sanders</strong> updated the description of the finding.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="pt-4 border-t border-white/[0.06]">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-white border border-white/[0.08] transition-colors"
            >
              Close Panel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
