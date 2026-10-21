import React from "react";
import { ArrowLeft, RefreshCw, Printer, AlertOctagon, AlertTriangle, Camera, Eye } from "lucide-react";
import { RiskGauge } from "../components/results/RiskGauge";
import { QualityReport } from "../components/results/QualityReport";
import { GradeProbabilityChart } from "../components/results/GradeProbabilityChart";
import { HeatmapViewer } from "../components/results/HeatmapViewer";
import { WhyPanel } from "../components/results/WhyPanel";
import { getRiskTokens } from "../lib/theme";

/**
 * 12-column clinical screening results workspace.
 * @param {{
 *   screeningData: any,
 *   originalUrl?: string | null,
 *   onNewScreening: () => void
 * }} props
 */
export function ResultPage({ screeningData, originalUrl = null, onNewScreening }) {
  if (!screeningData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          No Screening Data Available
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Please upload a retinal fundus photograph to initiate automated screening.
        </p>
        <button
          type="button"
          onClick={onNewScreening}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800"
        >
          <Camera className="w-4 h-4" />
          Upload Retinal Photo
        </button>
      </div>
    );
  }

  const { quality, result } = screeningData;
  const isRejected = !result;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header Controls Bar (Hidden in print) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 print:hidden">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onNewScreening}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            New Screening
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">
            Retinal Screening Analysis
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
          <button
            type="button"
            onClick={onNewScreening}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Screen Another Image
          </button>
        </div>
      </div>

      {/* Clinical Print Header (Visible only when printed / exported to PDF) */}
      <div className="hidden print:block pb-3 mb-4 border-b-2 border-slate-800 print-avoid-break">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Diabetic Retinopathy Screening Analysis Report
            </h1>
            <p className="text-xs text-slate-600">
              Automated AI Clinical Evaluation, Image Quality Assessment & Explainability
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <span className="font-semibold text-slate-900 uppercase tracking-wider">Confidential Clinical Report</span>
            <p className="font-mono">{new Date().toLocaleDateString(undefined, { dateStyle: "long" })}</p>
          </div>
        </div>
      </div>

      {/* State A: Quality Rejected for Recapture */}
      {isRejected ? (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-rose-900 dark:text-rose-100">
                  Image Rejected: Retake Photograph Required
                </h2>
                <p className="text-sm text-rose-800/90 dark:text-rose-200 leading-relaxed">
                  The automated Image Quality Assessment (IQA) gate flagged this photograph as ungradable. To protect clinical safety, diagnostic neural network inference was halted because low-quality inputs can produce unreliable predictions.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-rose-200 dark:border-rose-800/60 flex items-center justify-between">
              <span className="text-xs text-rose-800 dark:text-rose-300 font-medium">
                Please re-photograph following the acquisition guidelines below.
              </span>
              <button
                type="button"
                onClick={onNewScreening}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
              >
                <Camera className="w-4 h-4" />
                Upload Replacement Photo
              </button>
            </div>
          </div>

          {/* IQA Report Card */}
          <QualityReport quality={quality} />

          {/* Guidance for Retake */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Photographic Retake Checklist
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">1.</span>
                <span>Hold fundus camera steady or rest chin to eliminate motion blur</span>
              </li>
              <li className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">2.</span>
                <span>Center retinal circle within camera viewfinder</span>
              </li>
              <li className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">3.</span>
                <span>Ensure proper pupil dilation or adjust flash brightness</span>
              </li>
              <li className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">4.</span>
                <span>Confirm lens is clean and eyelashes do not obstruct frame</span>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        /* State B: Diagnostic Results Workspace with Quality Advisory Banner */
        <div className="space-y-6">
          {/* Quality Advisory Banner (Option 2: Warn instead of block) */}
          {quality?.decision === "reject-recapture" && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs print-avoid-break print:p-3 print:border-amber-300">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                      Image Quality Advisory: Suboptimal Focus / Sharpness
                    </h2>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      Recapture Recommended
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/80 dark:text-amber-200/90 leading-relaxed">
                    {quality.reasons.length > 0
                      ? quality.reasons.join(" ")
                      : "Image sharpness or field-of-view is below the optimal diagnostic threshold."}{" "}
                    Automated model predictions and Grad-CAM heatmaps are displayed below for clinical reference, but clinical correlation or re-acquisition is advised.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onNewScreening}
                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-amber-950 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800/80 border border-amber-300 dark:border-amber-700 transition-colors print:hidden"
              >
                <Camera className="w-3.5 h-3.5" />
                Retake Photo
              </button>
            </div>
          )}

          {/* 12-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start result-grid-layout">
            {/* Left Column (5 Cols): Risk Gauge, IQA Report, Grade Distribution */}
            <div className="lg:col-span-5 space-y-6">
              <RiskGauge
                referable={result.referable}
                modelsAgree={result.models_agree}
              />
              <QualityReport quality={quality} />
              <GradeProbabilityChart grade={result.grade} />
            </div>

            {/* Right Column (7 Cols): Heatmap Viewer, Clinical WhyPanel */}
            <div className="lg:col-span-7 space-y-6">
              <HeatmapViewer
                images={result.images}
                originalUrl={originalUrl}
                gradeLabel={result.grade.label}
                referableLabel={result.referable.label}
              />
              <WhyPanel
                grade={result.grade}
                referable={result.referable}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
