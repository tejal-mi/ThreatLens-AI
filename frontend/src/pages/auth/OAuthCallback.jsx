import { useAuth } from "@/contexts/AuthContext";
import { authApi, parseJwt } from "@/lib/api";
import { ShieldAlert, Sparkles, AlertTriangle } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function OAuthCallback() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState(null);

  useEffect(() => {
    const processOAuth = async () => {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash
        );

        const token =
          searchParams.get("access_token") ||
          searchParams.get("token") ||
          hashParams.get("access_token") ||
          hashParams.get("token");

        if (!token) {
          const errorParam = searchParams.get("error") || searchParams.get("error_description");
          throw new Error(errorParam || "No authentication access token received from OAuth provider.");
        }

        // Parse JWT payload as base account
        const payload = parseJwt(token);
        let account = {
          id: payload?.account_id || payload?.id || 1,
          uid: payload?.sub || "user",
          name: payload?.name || payload?.sub || "Security Analyst",
          handle: payload?.handle || payload?.sub || "analyst",
          email: payload?.email || "analyst@threatlens.io",
          role: payload?.role || "analyst",
        };

        // Attempt to fetch full account info from backend
        try {
          const me = await authApi.getMe(token);
          if (me?.account) {
            account = me.account;
          }
        } catch {
          // Use JWT decoded payload if backend /me is unreachable
        }

        // Save JWT & account into state and localStorage
        login(token, account);
        toast.success(`Welcome back, ${account.name || "Analyst"}!`);

        // Redirect directly to dashboard
        setLocation("/dashboard");
      } catch (err) {
        setError(err.message || "Failed to complete authentication.");
        toast.error("OAuth authentication failed");
      }
    };

    processOAuth();
  }, [login, setLocation]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#07090d] text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-xl border border-rose-500/30 bg-[#10151a] text-center space-y-4 shadow-[0_0_30px_rgba(244,63,94,0.15)]">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold font-mono">Authentication Error</h2>
          <p className="text-xs font-mono text-[#8a99ad] leading-relaxed">{error}</p>
          <div className="pt-2">
            <button
              onClick={() => setLocation("/login")}
              className="px-5 py-2 rounded-lg bg-gradient-to-b from-[#1e5adb] via-[#1342a8] to-[#0c2a74] text-[#E0F2FE] hover:text-white font-bold text-xs font-mono hover:brightness-110 shadow-[0_0_15px_rgba(29,78,216,0.35)] transition-all cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090d] text-white flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="relative w-12 h-12 mx-auto">
          <Sparkles className="w-12 h-12 text-[#38bdf8] animate-spin" />
        </div>
        <h3 className="font-mono text-sm font-bold text-white tracking-wider uppercase">Verifying OAuth Receipt</h3>
        <p className="text-xs font-mono text-[#8a99ad]">Storing access token JWT & loading dashboard workspace...</p>
      </div>
    </div>
  );
}
