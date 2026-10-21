import React from "react";
import { BarChart3, Check } from "lucide-react";
import { GRADE_TOKENS } from "../../lib/theme";
import { cn } from "../../lib/utils";

/**
 * 5-class ICDR Diabetic Retinopathy probability distribution bar chart.
 * @param {{
 *   grade: {
 *     predicted: number,
 *     label: string,
 *     confidence: number,
 *     probabilities: number[]
 *   }
 * }} props
 */
export function GradeProbabilityChart({ grade }) {
  const { predicted, probabilities } = grade;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 print-avoid-break print:p-4 print:border-slate-300 print:shadow-none">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          5-Stage ICDR Severity Distribution
        </h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
          Multiclass CNN
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {probabilities.map((prob, idx) => {
          const token = GRADE_TOKENS[idx] || {
            name: `Grade ${idx}`,
            fullName: `Stage ${idx}`,
            color: "#64748B",
            barColor: "bg-slate-500",
          };
          const isPredicted = idx === predicted;
          const percentage = (prob * 100).toFixed(1);

          return (
            <div
              key={idx}
              className={cn(
                "p-2.5 rounded-xl transition-all space-y-1.5",
                isPredicted
                  ? "bg-slate-50 dark:bg-slate-800/80 ring-2 ring-emerald-600/30 dark:ring-emerald-500/40"
                  : "hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
              )}
            >
              {/* Header row: Grade name + Percentage */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold w-4 text-slate-400">
                    {idx}:
                  </span>
                  <span className={cn("font-medium", isPredicted ? "font-bold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300")}>
                    {token.fullName}
                  </span>
                  {isPredicted && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                      <Check className="w-3 h-3" />
                      Predicted
                    </span>
                  )}
                </div>

                <span className="font-mono font-bold tabular-nums text-slate-900 dark:text-white text-xs">
                  {percentage}%
                </span>
              </div>

              {/* Progress Track */}
              <div
                className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(prob * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${token.fullName} probability`}
              >
                <div
                  className={cn("h-full rounded-full transition-all duration-500", token.barColor)}
                  style={{ width: `${Math.max(prob * 100, 1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
        Softmax distribution across International Clinical Diabetic Retinopathy (ICDR) disease stages.
      </div>
    </div>
  );
}
