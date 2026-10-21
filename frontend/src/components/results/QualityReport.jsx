import React from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, Camera, Info } from "lucide-react";
import { getQualityTokens } from "../../lib/theme";
import { cn } from "../../lib/utils";

/**
 * Image Quality Assessment report card displaying clinical gradability triage and metrics.
 * @param {{
 *   quality: {
 *     decision: "accept" | "enhance-then-accept" | "reject-recapture",
 *     metrics: {
 *       fov_ratio: number,
 *       sharpness: number,
 *       illumination_var: number,
 *       vessel_contrast: number
 *     },
 *     reasons: string[]
 *   }
 * }} props
 */
export function QualityReport({ quality }) {
  const { decision, metrics, reasons } = quality;
  const tokens = getQualityTokens(decision);
  const Icon = tokens.icon;

  const metricCards = [
    {
      label: "Field of View (FOV)",
      value: `${(metrics.fov_ratio * 100).toFixed(1)}%`,
      threshold: "Min 20.0%",
      passed: metrics.fov_ratio >= 0.20,
      description: "Retinal area inside frame",
    },
    {
      label: "Focus Sharpness",
      value: metrics.sharpness.toFixed(1),
      threshold: "Min 25.0",
      passed: metrics.sharpness >= 25.0,
      description: "Laplacian edge variance",
    },
    {
      label: "Illumination Variance",
      value: metrics.illumination_var.toFixed(2),
      threshold: "Max 0.45",
      passed: metrics.illumination_var <= 0.45,
      description: "3×3 quadrant uniformity",
    },
    {
      label: "Vessel Contrast",
      value: metrics.vessel_contrast.toFixed(1),
      threshold: "Min 8.0",
      passed: metrics.vessel_contrast >= 8.0,
      description: "Green channel Sobel gradient",
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 print-avoid-break print:p-4 print:border-slate-300 print:shadow-none">
      {/* Triage Decision Banner */}
      <div className={cn("p-4 rounded-xl border flex items-start gap-3.5", tokens.surfaceClass)}>
        <div className={cn("p-2 rounded-lg shrink-0", tokens.badgeClass)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Image Quality Assessment:
            </h4>
            <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border", tokens.badgeClass)}>
              {tokens.badgeLabel}
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {tokens.clinicalSummary}
          </p>
        </div>
      </div>

      {/* Numerical Metrics in Tabular Format */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Automated Gradability Measurements
        </h5>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {metricCards.map((m, idx) => (
            <div
              key={idx}
              className="p-2.5 sm:p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-between"
            >
              {/* Header with Title and Status Dot */}
              <div className="flex items-start justify-between gap-1 h-9">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-snug">
                  {m.label}
                </span>
                <span
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0 mt-1",
                    m.passed ? "bg-emerald-500" : "bg-rose-500"
                  )}
                  title={m.passed ? "Metric within acceptable range" : "Metric failed threshold"}
                />
              </div>

              {/* Metric Value */}
              <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white py-1">
                {m.value}
              </div>

              {/* Target Row */}
              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-1 whitespace-nowrap pt-1.5 border-t border-slate-200 dark:border-slate-700">
                <span className="shrink-0 text-slate-400">Target:</span>
                <span className="font-mono font-medium whitespace-nowrap text-slate-700 dark:text-slate-300">
                  {m.threshold}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Degradation / Rejection Reasons */}
      {reasons && reasons.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
          <div className="font-semibold flex items-center gap-1.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            Quality Flags Identified:
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
