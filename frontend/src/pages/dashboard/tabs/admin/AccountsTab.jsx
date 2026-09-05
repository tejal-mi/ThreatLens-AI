import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Download,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authApi, timeAgo } from "@/lib/api";

export default function AccountsTab() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await authApi.getAccounts(token, page, limit);
        setAccounts(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Failed to load accounts: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAccounts();
  }, [token, page, limit]);

  const filteredAccounts = accounts.filter(
    (a) =>
      (a.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.handle || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Computed KPIs
  const totalAccounts = accounts.length;
  const superadminCount = accounts.filter((a) => a.role === "superadmin").length;
  const activeCount = accounts.filter((a) => a.status === "active").length;

  const handleDeleteAccount = async (accountId, name) => {
    if (!confirm(`Delete account "${name}"? This action is irreversible.`)) return;
    try {
      await authApi.deleteAccount(token, accountId);
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
      toast.success(`Account "${name}" deleted`);
    } catch (err) {
      toast.error("Failed to delete account: " + err.message);
    }
  };

  return (
    <div className="space-y-7">
      {/* Top Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Accounts & User Directory</h1>
          <p className="text-xs text-[#8a99ad] mt-1">
            GET /tc-auth/account · role-based access control (RBAC), analyst provisioning & permission directory
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <button
            onClick={() => toast.info("Creating new user account dialog...")}
            className="px-4 py-2 rounded-lg bg-[#2962FF] hover:bg-[#1e4ed8] text-white font-semibold shadow-[0_0_15px_rgba(41,98,255,0.35)] transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New User</span>
          </button>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-4.5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#6EA8DA]" />
          <div className="text-[10.5px] uppercase tracking-wider text-[#8a99ad] font-semibold">Total Accounts</div>
          <div className="text-xl font-bold mt-1.5 text-white">{loading ? "…" : `${totalAccounts} Users`}</div>
          <div className="text-[11px] text-[#8a99ad] mt-1">page {page}</div>
        </div>

        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-4.5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#C8A27A]" />
          <div className="text-[10.5px] uppercase tracking-wider text-[#8a99ad] font-semibold">Superadmins</div>
          <div className="text-xl font-bold mt-1.5 text-white">{loading ? "…" : `${superadminCount} Roles`}</div>
          <div className="text-[11px] text-[#8a99ad] mt-1">elevated privileges</div>
        </div>

        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-4.5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#2C6CB0]" />
          <div className="text-[10.5px] uppercase tracking-wider text-[#8a99ad] font-semibold">Active Users</div>
          <div className="text-xl font-bold mt-1.5 text-white">{loading ? "…" : `${activeCount} Active`}</div>
          <div className="text-[11px] text-[#8a99ad] mt-1">verified standing</div>
        </div>

        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-4.5 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute left-0 top-0 bottom-0 w-[3.5px] bg-[#1D3557] border-r border-[#6EA8DA]/40" />
          <div className="text-[10.5px] uppercase tracking-wider text-[#8a99ad] font-semibold">Non-Admin</div>
          <div className="text-xl font-bold mt-1.5 text-[#6EA8DA]">{loading ? "…" : `${totalAccounts - superadminCount} Users`}</div>
          <div className="text-[11px] text-[#8a99ad] mt-1">standard permissions</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-[#8a99ad] absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search accounts by name, email, handle..."
          className="w-full pl-10 pr-4 py-2 bg-[#10151a] border border-[#283747] rounded-lg text-xs font-mono text-white placeholder-[#6f8390] focus:border-[#38bdf8] focus:outline-none"
        />
      </div>

      {/* Accounts Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-[#1a2330] rounded-xl h-14 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16">
          <WifiOff className="w-8 h-8 mx-auto text-[#8a99ad] mb-3" />
          <p className="font-mono text-sm text-[#8a99ad]">No accounts found</p>
          <p className="font-mono text-xs text-[#6f8390] mt-1">Ensure the backend is running and you have superadmin access</p>
        </div>
      ) : (
        <div className="bg-[#10151a] border border-[#263544] rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between p-3.5 px-4.5 border-b border-[#253240] bg-[#12181f]/60">
            <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              User Accounts & Permissions
            </h2>
            <div className="font-mono text-[10px] text-[#8a99ad]">GET /tc-auth/account</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#253240] text-[10px] font-mono uppercase tracking-wider text-[#8a99ad] bg-[#0c1015]">
                  <th className="py-3 px-4.5">User</th>
                  <th className="py-3 px-4.5">Email & Handle</th>
                  <th className="py-3 px-4.5">Role</th>
                  <th className="py-3 px-4.5">Status</th>
                  <th className="py-3 px-4.5">Created</th>
                  <th className="py-3 px-4.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222e3a]">
                {filteredAccounts.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4.5 align-middle">
                      <div className="flex items-center gap-2.5">
                        {a.avatar_url ? (
                          <img src={a.avatar_url} alt="" className="w-7 h-7 rounded-full" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#2546ff] to-[#38bdf8] text-[#03110c] font-bold text-[10px] font-mono flex items-center justify-center shadow-sm">
                            {(a.name || "?").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-semibold text-white">{a.name}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4.5 align-middle font-mono text-[11px]">
                      <div className="text-[#d8e2e8]">{a.email}</div>
                      <div className="text-[#8a99ad] text-[10px]">@{a.handle}</div>
                    </td>

                    <td className="py-3 px-4.5 align-middle font-mono text-[10px] uppercase">
                      <span
                        className={`px-2 py-0.5 rounded border font-semibold ${
                          a.role === "superadmin"
                            ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                            : "bg-[#38bdf8]/10 border-[#38bdf8]/30 text-[#38bdf8]"
                        }`}
                      >
                        {a.role}
                      </span>
                    </td>

                    <td className="py-3 px-4.5 align-middle font-mono text-[11px] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${a.status === "active" ? "bg-emerald-400" : "bg-[#ff4d4f]"}`} />
                      <span className={a.status === "active" ? "text-emerald-400" : "text-[#ff4d4f]"}>{a.status}</span>
                    </td>

                    <td className="py-3 px-4.5 align-middle font-mono text-[11px] text-[#8a99ad]">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-3 px-4.5 align-middle text-right font-mono">
                      <button
                        onClick={() => toast.info(`Managing permissions for ${a.name}...`)}
                        className="px-3 py-1 rounded bg-[#141b21] hover:bg-[#1a232b] border border-[#2b3947] text-xs text-[#38bdf8] hover:text-white transition-colors mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(a.id, a.name)}
                        className="px-3 py-1 rounded bg-[#141b21] hover:bg-rose-500/20 border border-[#2b3947] hover:border-rose-500/40 text-xs text-[#8a99ad] hover:text-rose-400 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-3 p-4 border-t border-[#253240]">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 rounded-lg border border-[#2b3947] bg-[#10151a] text-[#d8e2e8] font-mono text-xs hover:border-white/[0.2] disabled:opacity-30 transition-all"
            >
              ← Previous
            </button>
            <span className="font-mono text-xs text-[#8a99ad]">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={accounts.length < limit}
              className="px-4 py-2 rounded-lg border border-[#2b3947] bg-[#10151a] text-[#d8e2e8] font-mono text-xs hover:border-white/[0.2] disabled:opacity-30 transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
