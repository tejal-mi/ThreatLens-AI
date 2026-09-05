import { AlertCircle, Home } from "lucide-react";
import React from "react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#07090d] text-white p-4">
      <div className="w-full max-w-md border border-white/10 rounded-2xl bg-[#0b0e14]/90 backdrop-blur-md p-6 text-center space-y-4 shadow-2xl">
        <div className="flex justify-center">
          <AlertCircle className="h-12 w-12 text-rose-500" />
        </div>

        <h1 className="text-2xl font-bold font-display text-white">404 - Route Not Found</h1>
        <p className="text-sm text-[#8a99ad]">
          The security route you requested does not exist or has been relocated.
        </p>

        <Link
          href="/"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2546ff] hover:bg-[#0d27c7] px-4 py-3 text-sm font-semibold text-white transition-colors cursor-pointer shadow-[0_0_15px_rgba(37,70,255,0.25)] border border-white/10"
        >
          <Home className="w-4 h-4" /> Return to ThreatLens
        </Link>
      </div>
    </div>
  );
}
