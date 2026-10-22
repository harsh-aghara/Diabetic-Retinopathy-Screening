import React, { useEffect, useState } from "react";
import { Eye, Moon, Sun, RefreshCw, ClipboardList, Plus } from "lucide-react";
import { checkHealth, getModelInfo } from "../../lib/api";

export default function Navbar({ currentScreen, onNavigate }) {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme");
      if (stored) return stored === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const [backendStatus, setBackendStatus] = useState("checking"); // 'online' | 'offline' | 'checking'
  const [modelMeta, setModelMeta] = useState(null);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [darkMode]);

  // Query backend status & model metadata
  useEffect(() => {
    let mounted = true;

    async function probeBackend() {
      try {
        const health = await checkHealth();
        const info = await getModelInfo();
        if (mounted) {
          setBackendStatus(health.status === "healthy" ? "online" : "offline");
          setModelMeta(info);
        }
      } catch {
        if (mounted) {
          setBackendStatus("offline");
        }
      }
    }

    probeBackend();
    const interval = setInterval(probeBackend, 30000); // 30s probe
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & System Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate("landing")}
            className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-lg p-1"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-700 dark:bg-emerald-600 flex items-center justify-center text-white shadow-sm shadow-emerald-700/20">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <span className="font-heading font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 block">
                RetinaScreen AI
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block -mt-0.5">
                Clinical DR Screening System
              </span>
            </div>
          </button>
        </div>

        {/* Right Section: Model State Badge, Nav Links, Dark/Light Toggle */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Active Model Indicator Badge */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            {backendStatus === "online" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  CustomDRCNN Models Active
                </span>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Dual CNN + Grad-CAM
                </span>
              </>
            ) : backendStatus === "checking" ? (
              <>
                <RefreshCw className="w-3 h-3 text-slate-400 animate-spin" />
                <span className="text-slate-500">Connecting to API...</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-700 dark:text-rose-400 font-medium">
                  Screening API Offline (port 8000)
                </span>
              </>
            )}
          </div>

          {/* Overview Link */}
          {currentScreen !== "landing" && (
            <button
              onClick={() => onNavigate("landing")}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Overview
            </button>
          )}

          {/* Patient Records Navigation Link */}
          <button
            onClick={() => onNavigate("records")}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              currentScreen === "records"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Patient Records</span>
          </button>

          {/* Start Screening Button */}
          {currentScreen !== "patient-intake" && currentScreen !== "upload" && (
            <button
              onClick={() => onNavigate("patient-intake")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 px-3.5 py-1.5 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Screening</span>
            </button>
          )}

          {/* Dark / Light Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>
    </header>
  );
}
