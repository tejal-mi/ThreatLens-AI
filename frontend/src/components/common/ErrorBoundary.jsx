import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#06080d] text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-2xl bg-[#0a0d15] border border-white/10 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-[#f43f5e]/15 text-[#f43f5e] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Something went wrong</h2>
              <p className="text-xs text-[#8a99ad] mt-1">
                {this.state.error?.message || "An unexpected error occurred in the security workspace."}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2546ff] hover:bg-[#0d27c7] text-white text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reload Platform
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
