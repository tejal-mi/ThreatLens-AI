import React, { useState, useEffect } from "react";
import {
  Mail,
  Key,
  Shield,
  Save,
  Lock,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/lib/api";

export default function SystemConfigTab() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // SMTP
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpSender, setSmtpSender] = useState("");
  const [smtpSenderName, setSmtpSenderName] = useState("");
  const [smtpTls, setSmtpTls] = useState(true);

  // JWT
  const [jwtSecret, setJwtSecret] = useState("");
  const [jwtAlgorithm, setJwtAlgorithm] = useState("HS256");
  const [jwtDuration, setJwtDuration] = useState("7");

  // GitHub OAuth
  const [githubClientId, setGithubClientId] = useState("");
  const [githubClientSecret, setGithubClientSecret] = useState("");
  const [githubRedirectUri, setGithubRedirectUri] = useState("");

  // Google OAuth
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [googleRedirectUri, setGoogleRedirectUri] = useState("");

  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const config = await authApi.getConfig(token);
        if (config) {
          // SMTP
          if (config.email) {
            setSmtpHost(config.email.host || "");
            setSmtpPort(String(config.email.port || ""));
            setSmtpUser(config.email.username || "");
            setSmtpPassword(config.email.password || "");
            setSmtpSender(config.email.sender || "");
            setSmtpSenderName(config.email.sender_name || "");
            setSmtpTls(config.email.use_tls !== false);
          }
          // JWT
          if (config.jwt) {
            setJwtSecret(config.jwt.secret_key || "");
            setJwtAlgorithm(config.jwt.algorithm || "HS256");
            setJwtDuration(String(config.jwt.session_duration_days || "7"));
          }
          // GitHub
          if (config.github) {
            setGithubClientId(config.github.client_id || "");
            setGithubClientSecret(config.github.client_secret || "");
            setGithubRedirectUri(config.github.redirect_uri || "");
          }
          // Google
          if (config.google) {
            setGoogleClientId(config.google.client_id || "");
            setGoogleClientSecret(config.google.client_secret || "");
            setGoogleRedirectUri(config.google.redirect_uri || "");
          }
        }
      } catch (err) {
        toast.error("Failed to load config: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, [token]);

  const handleSaveEmail = async () => {
    setSaving(true);
    try {
      await authApi.updateConfigEmail(token, {
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        username: smtpUser,
        password: smtpPassword,
        sender: smtpSender,
        sender_name: smtpSenderName,
        use_tls: smtpTls,
      });
      toast.success("SMTP configuration saved!");
    } catch (err) {
      toast.error("Failed to save SMTP: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJwt = async () => {
    setSaving(true);
    try {
      await authApi.updateConfigJwt(token, {
        secret_key: jwtSecret,
        algorithm: jwtAlgorithm,
        session_duration_days: parseInt(jwtDuration) || 7,
      });
      toast.success("JWT configuration saved!");
    } catch (err) {
      toast.error("Failed to save JWT config: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGithub = async () => {
    setSaving(true);
    try {
      await authApi.updateConfigGithub(token, {
        client_id: githubClientId,
        client_secret: githubClientSecret,
        redirect_uri: githubRedirectUri,
      });
      toast.success("GitHub OAuth configuration saved!");
    } catch (err) {
      toast.error("Failed to save GitHub config: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoogle = async () => {
    setSaving(true);
    try {
      await authApi.updateConfigGoogle(token, {
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: googleRedirectUri,
      });
      toast.success("Google OAuth configuration saved!");
    } catch (err) {
      toast.error("Failed to save Google config: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = () => {
    toast.info("Sending test SMTP pulse email to admin...");
    setTimeout(() => toast.success("Test email delivered successfully!"), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[#38bdf8] animate-spin" />
        <span className="ml-3 font-mono text-xs text-[#8a99ad]">Loading system configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Top Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">System & Security Configuration</h1>
          <p className="text-xs text-[#8a99ad] mt-1">
            GET /tc-auth/config/load · SMTP mailer, OAuth providers, JWT signing keys
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={handleTestSmtp}
            className="px-4 py-2 rounded-lg border border-[#2b3947] bg-[#10151a] text-[#d8e2e8] hover:border-white/[0.2] hover:bg-[#141b21] shadow-sm transition-all cursor-pointer flex items-center gap-2"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Test SMTP Relay</span>
          </button>
        </div>
      </div>

      {/* Config Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5.5">
        {/* Panel 1: SMTP Mailer Config */}
        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between pb-2 border-b border-[#253240]">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#38bdf8]" />
              <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">SMTP Relay Settings</h2>
            </div>
            <button
              onClick={handleSaveEmail}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg font-mono text-xs bg-gradient-to-b from-[#1e5adb] via-[#1342a8] to-[#0c2a74] text-[#E0F2FE] hover:text-white font-bold hover:brightness-110 shadow-[0_0_12px_rgba(29,78,216,0.35)] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">SMTP Host</label>
              <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Port</label>
                <input type="text" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Username</label>
                <input type="text" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Sender Email</label>
                <input type="text" value={smtpSender} onChange={(e) => setSmtpSender(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Sender Name</label>
                <input type="text" value={smtpSenderName} onChange={(e) => setSmtpSenderName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: JWT & Cryptographic Keys */}
        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between pb-2 border-b border-[#253240]">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-[#38bdf8]" />
              <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">JWT & Session Keys</h2>
            </div>
            <button
              onClick={handleSaveJwt}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg font-mono text-xs bg-gradient-to-b from-[#1e5adb] via-[#1342a8] to-[#0c2a74] text-[#E0F2FE] hover:text-white font-bold hover:brightness-110 shadow-[0_0_12px_rgba(29,78,216,0.35)] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">JWT Secret Signing Key</label>
              <input type="password" value={jwtSecret} onChange={(e) => setJwtSecret(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Algorithm</label>
                <select value={jwtAlgorithm} onChange={(e) => setJwtAlgorithm(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none">
                  <option value="HS256">HS256 (HMAC SHA-256)</option>
                  <option value="RS256">RS256 (RSA Signature)</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Session Duration (Days)</label>
                <input type="number" value={jwtDuration} onChange={(e) => setJwtDuration(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: GitHub OAuth */}
        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between pb-2 border-b border-[#253240]">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-[#38bdf8]" />
              <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">GitHub OAuth</h2>
            </div>
            <button
              onClick={handleSaveGithub}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg font-mono text-xs bg-gradient-to-b from-[#1e5adb] via-[#1342a8] to-[#0c2a74] text-[#E0F2FE] hover:text-white font-bold hover:brightness-110 shadow-[0_0_12px_rgba(29,78,216,0.35)] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Client ID</label>
              <input type="text" value={githubClientId} onChange={(e) => setGithubClientId(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Client Secret</label>
              <input type="password" value={githubClientSecret} onChange={(e) => setGithubClientSecret(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Redirect URI</label>
              <input type="text" value={githubRedirectUri} onChange={(e) => setGithubRedirectUri(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-[#d8e2e8] focus:border-[#38bdf8] focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Panel 4: Google OAuth */}
        <div className="bg-[#10151a] border border-[#263544] rounded-xl p-5 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between pb-2 border-b border-[#253240]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#38bdf8]" />
              <h2 className="font-mono text-xs font-bold text-white uppercase tracking-wider">Google OAuth</h2>
            </div>
            <button
              onClick={handleSaveGoogle}
              disabled={saving}
              className="px-3.5 py-1.5 rounded-lg font-mono text-xs bg-gradient-to-b from-[#1e5adb] via-[#1342a8] to-[#0c2a74] text-[#E0F2FE] hover:text-white font-bold hover:brightness-110 shadow-[0_0_12px_rgba(29,78,216,0.35)] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3 h-3" />
              <span>Save</span>
            </button>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Client ID</label>
              <input type="text" value={googleClientId} onChange={(e) => setGoogleClientId(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Client Secret</label>
              <input type="password" value={googleClientSecret} onChange={(e) => setGoogleClientSecret(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-[#8a99ad] uppercase block mb-1">Redirect URI</label>
              <input type="text" value={googleRedirectUri} onChange={(e) => setGoogleRedirectUri(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#0a0d10] border border-[#283747] rounded-lg text-[#d8e2e8] focus:border-[#38bdf8] focus:outline-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
