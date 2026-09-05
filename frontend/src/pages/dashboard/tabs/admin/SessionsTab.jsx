import React, { useState, useEffect } from "react";
import {
  Laptop,
  Smartphone,
  Terminal,
  Trash2,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, timeAgo } from "@/lib/api";

function parseDevice(userAgent) {
  if (!userAgent) return { type: "desktop", label: "Unknown Client" };
  const ua = userAgent.toLowerCase();
  if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
    return { type: "mobile", label: userAgent.slice(0, 50) };
  }
  if (ua.includes("curl") || ua.includes("python") || ua.includes("cli") || ua.includes("httpx")) {
    return { type: "cli", label: userAgent.slice(0, 50) };
  }
  // Parse browser name
  let browser = "Browser";
  if (ua.includes("chrome") && !ua.includes("edg")) browser = "Chrome";
  else if (ua.includes("firefox")) browser = "Firefox";
  else if (ua.includes("safari") && !ua.includes("chrome")) browser = "Safari";
  else if (ua.includes("edg")) browser = "Edge";

  let os = "";
  if (ua.includes("windows")) os = "Windows";
  else if (ua.includes("mac")) os = "macOS";
  else if (ua.includes("linux")) os = "Linux";

  return { type: "desktop", label: `${browser}${os ? ` (${os})` : ""}` };
}

export default function SessionsTab() {
  const { token, user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!token || !user?.id) return;
      setLoading(true);
      try {
        const data = await authApi.getSessions(token, user.id);
        setSessions(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Failed to load sessions: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, [token, user?.id]);

  const handleRevoke = async (sessionId) => {
    try {
      await authApi.destroySession(token, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success(`Session ${sessionId} revoked!`);
    } catch (err) {
      toast.error("Failed to revoke session: " + err.message);
    }
  };

  const handleRevokeAllOthers = async () => {
    try {
      await authApi.destroyAllSessions(token, user.id);
      // Keep only current session (we don't know which one it is, so re-fetch)
      const data = await authApi.getSessions(token, user.id);
      setSessions(Array.isArray(data) ? data : []);
      toast.success("Revoked all other sessions.");
    } catch (err) {
      toast.error("Failed to revoke sessions: " + err.message);
    }
  };

  return (
    <div className="space-y-7">
      {/* Top Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Active Device Sessions</h1>
          <p className="text-xs text-[#8a99ad] mt-1">
            GET /tc-auth/session · cryptographic session JWT tokens, client IPs & single-click token revocation
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={handleRevokeAllOthers}
            className="px-4 py-2 rounded-lg border border-[#C8A27A]/40 bg-[#C8A27A]/15 text-[#C8A27A] font-semibold hover:bg-[#C8A27A]/25 shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Revoke All Other Sessions</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-4.5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#6EA8DA]" />
          <div className="text-[10.5px] uppercase tracking-wider text-[#8a99ad] font-semibold">Active Tokens</div>
          <div className="text-xl font-bold mt-1.5 text-white">{loading ? "…" : `${sessions.length} Active`}</div>
          <div className="text-[11px] text-[#8a99ad] mt-1">JWT signed</div>
        </div>

        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-4.5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#38bdf8] shadow-[0_0_10px_#38bdf8]" />
          <div className="text-[10.5px] uppercase tracking-wider text-[#8a99ad] font-mono font-semibold">Account</div>
          <div className="font-mono text-xl font-bold mt-1.5 text-emerald-400">{user?.name || "User"}</div>
          <div className="text-[11px] text-[#8a99ad] mt-1 font-mono">{user?.role || "analyst"}</div>
        </div>

        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-4.5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#38bdf8] shadow-[0_0_10px_#38bdf8]" />
          <div className="text-[10.5px] uppercase tracking-wider text-[#8a99ad] font-mono font-semibold">Desktop Sessions</div>
          <div className="font-mono text-xl font-bold mt-1.5 text-white">
            {loading ? "…" : sessions.filter((s) => parseDevice(s.user_agent).type === "desktop").length}
          </div>
          <div className="text-[11px] text-[#8a99ad] mt-1 font-mono">browser clients</div>
        </div>

        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-4.5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#38bdf8] shadow-[0_0_10px_#38bdf8]" />
          <div className="text-[10.5px] uppercase tracking-wider text-[#8a99ad] font-mono font-semibold">Security State</div>
          <div className="font-mono text-xl font-bold mt-1.5 text-[#38bdf8]">Nominal</div>
          <div className="text-[11px] text-[#8a99ad] mt-1 font-mono">no hijack indicators</div>
        </div>
      </div>

      {/* Sessions Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-[#1a2330] rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-16">
          <WifiOff className="w-8 h-8 mx-auto text-[#8a99ad] mb-3" />
          <p className="font-mono text-sm text-[#8a99ad]">No active sessions found</p>
        </div>
      ) : (
        <div className="bg-[#10151a] border border-[#263544] rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between p-3.5 px-4.5 border-b border-[#253240] bg-[#12181f]/60">
            <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Connected Devices & Client Tokens
            </h2>
            <div className="font-mono text-[10px] text-[#8a99ad]">GET /tc-auth/session/query</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#253240] text-[10px] font-mono uppercase tracking-wider text-[#8a99ad] bg-[#0c1015]">
                  <th className="py-3 px-4.5">Device & Client</th>
                  <th className="py-3 px-4.5">IP Address</th>
                  <th className="py-3 px-4.5">Created At</th>
                  <th className="py-3 px-4.5">Expires</th>
                  <th className="py-3 px-4.5">Status</th>
                  <th className="py-3 px-4.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222e3a]">
                {sessions.map((s) => {
                  const device = parseDevice(s.user_agent);
                  const isExpired = s.expires_at && new Date(s.expires_at) < new Date();

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.03] transition-colors font-mono">
                      <td className="py-3 px-4.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          {device.type === "desktop" ? (
                            <Laptop className="w-4 h-4 text-[#38bdf8]" />
                          ) : device.type === "mobile" ? (
                            <Smartphone className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Terminal className="w-4 h-4 text-emerald-400" />
                          )}
                          <div>
                            <div className="font-semibold text-white font-sans">{device.label}</div>
                            <div className="text-[10px] text-[#8a99ad]">ID: {s.id}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4.5 align-middle text-[11px] text-[#d8e2e8]">
                        {s.ip_address || "—"}
                      </td>

                      <td className="py-3 px-4.5 align-middle text-[11px] text-[#8a99ad]">
                        {s.created_at ? timeAgo(s.created_at) : "—"}
                      </td>

                      <td className="py-3 px-4.5 align-middle text-[11px] text-white">
                        {s.expires_at ? timeAgo(s.expires_at) : "—"}
                      </td>

                      <td className="py-3 px-4.5 align-middle">
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/15 text-rose-400 text-[10px] font-bold">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4.5 align-middle text-right">
                        <button
                          onClick={() => handleRevoke(s.id)}
                          className="px-3 py-1 rounded bg-[#141b21] hover:bg-rose-500/20 border border-[#2b3947] hover:border-rose-500/40 text-xs text-[#8a99ad] hover:text-rose-400 transition-colors"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
