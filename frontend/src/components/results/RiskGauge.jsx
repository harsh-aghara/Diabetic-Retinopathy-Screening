import React from "react";
import { CheckCircle2, AlertTriangle, AlertOctagon, ShieldCheck, HelpCircle } from "lucide-react";
import { getRiskTokens } from "../../lib/theme";
import { cn } from "../../lib/utils";

/**
 * Visual referable DR risk gauge with dual-model concordance verification.
 * @param {{
 *   referable: {
 *     probability: number,
 *     label: string,
 *     tier: "Low" | "Moderate" | "High",
 *     confidence: number
 *   },
 *   modelsAgree?: boolean
 * }} props
 */
export function RiskGauge({ referable, modelsAgree = true }) {
  const { probability, label, tier } = referable;
  const tokens = getRiskTokens(probability);
  const Icon = tokens.icon;

  const percentage = Math.round(probability * 100);

  // SVG circular arc geometry
  const radius = 70;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  // Use 240-degree gauge arc
  const arcLength = circumference * (240 / 360);
  const strokeDashoffset = arcLength - (arcLength * probability);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col items-center text-center space-y-4 print-avoid-break print:p-4 print:border-slate-300 print:shadow-none">
      {/* Header */}
      <div className="w-full flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Specialist Referral Risk
        </h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
          Screening Triage
        </span>
      </div>

      {/* Circular Gauge Visualization */}
      <div className="relative w-44 h-44 flex items-center justify-center my-1">
        <svg
          className="w-full h-full transform -rotate-[210deg]"
          viewBox="0 0 180 180"
          aria-hidden="true"
        >
          {/* Background Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset="0"
            strokeLinecap="round"
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Active Value Arc */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="transparent"
            stroke={tokens.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
          <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white">
            {percentage}%
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Referral Risk
          </span>
        </div>
      </div>

      {/* Triple-Encoded Risk Tier Badge */}
      <div className="space-y-2 w-full">
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border",
            tokens.badgeClass
          )}
        >
          <Icon className="w-4 h-4" />
          <span>{tokens.label} ({label})</span>
          <span aria-hidden="true">{tokens.symbol}</span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
          {tokens.clinicalSummary}
        </p>
      </div>

      {/* Dual-Model Concordance Pill */}
      <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800">
        <div
          className={cn(
            "flex items-center justify-between p-2.5 rounded-xl text-xs",
            modelsAgree
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800"
          )}
        >
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Model Cross-Validation:</span>
          </div>
          <span className="font-bold">
            {modelsAgree ? "Concordant ✓" : "Review Advised ⚠"}
          </span>
        </div>
      </div>
    </div>
  );
}
