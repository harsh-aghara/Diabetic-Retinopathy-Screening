import React, { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Eye,
  Layers,
  Sparkles,
  Camera,
  Activity,
  CheckCircle2,
} from "lucide-react";
import Disclaimer from "../components/layout/Disclaimer";
import LearnMore from "../components/learn/LearnMore";

/**
 * Landing page introducing the Diabetic Retinopathy Retinal Fundus Screening System.
 * @param {{
 *   onStartScreening: () => void
 * }} props
 */
export default function Landing({ onStartScreening }) {
  const [showHeatmap, setShowHeatmap] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-12">
      {/* 2-Column Editorial Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Clinical Brief & Primary CTA (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Architecture & Verification Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>Dual CustomDRCNN Architecture • Automated IQA • Grad-CAM</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="font-heading font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-slate-900 dark:text-slate-50 leading-[1.15]">
              Diabetic Retinopathy Screening with{" "}
              <span className="text-emerald-700 dark:text-emerald-400">Explainable AI</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
              An evidence-based screening instrument assessing retinal fundus photographs. Triages image acquisition quality, screens for referable diabetic retinopathy, classifies 5-stage ICDR disease severity, and visualizes pathological microvascular regions with Grad-CAM heatmaps.
            </p>
          </div>

          {/* Key Clinical & Architectural Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Image Quality Gate
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Automated rule-based IQA checking FOV, focus sharpness, and vessel contrast.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Dual-Model CNN
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  5-block convolutional networks for binary referability and 5-stage ICDR grading.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Grad-CAM Overlays
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Penultimate layer (conv5) visual heatmaps with interactive opacity slider.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Clinic Records & PDF
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  SQLite patient history tracking, search & filter, and publication PDF reports.
                </p>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <div className="pt-2">
            <button
              type="button"
              onClick={onStartScreening}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-lg shadow-emerald-700/20 transition-all focus-visible:ring-4 focus-visible:ring-emerald-500/30 focus-visible:outline-none"
            >
              <span>Start Patient Screening</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right Column: Real Fundus Photograph from Training Dataset (5 Cols) */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="relative w-full max-w-sm aspect-square rounded-3xl bg-slate-950 border border-slate-800/80 shadow-2xl overflow-hidden flex flex-col group">
            {/* Real Fundus Image Frame */}
            <div className="relative flex-1 w-full flex items-center justify-center bg-black overflow-hidden p-2">
              <img
                src={showHeatmap ? "/fundus-hero-prep.png" : "/fundus-hero.jpg"}
                alt="Real retinal fundus photograph from APTOS dataset"
                className="w-full h-full object-contain rounded-2xl transition-all duration-300"
              />
              {showHeatmap && (
                <img
                  src="/fundus-hero-heatmap.png"
                  alt="Real Grad-CAM activation heatmap overlay"
                  className="absolute inset-0 w-full h-full object-contain p-2 pointer-events-none opacity-75 transition-opacity duration-200"
                />
              )}

              {/* Floating Clinical Badge */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-emerald-300 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Real Training Image (APTOS)
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 backdrop-blur-md text-slate-300 border border-white/10">
                  ID: 025a169a0bb0
                </span>
              </div>
            </div>

            {/* Bottom Controls & Mode Toggle */}
            <div className="p-3 bg-slate-900/90 backdrop-blur-md border-t border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-white">Moderate DR</span>
                <span className="text-slate-500">•</span>
                <span className="text-[11px] text-slate-400">ICDR Grade 2</span>
              </div>

              {/* View Toggle Button */}
              <button
                type="button"
                onClick={() => setShowHeatmap((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300 transition-colors shadow-xs"
              >
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>{showHeatmap ? "Show Raw" : "Grad-CAM"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Architectural & Clinical Explanation Accordion */}
      <LearnMore />

      {/* Regulatory & Clinical Disclaimer */}
      <Disclaimer />
    </div>
  );
}
