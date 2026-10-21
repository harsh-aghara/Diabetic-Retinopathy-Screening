import React from "react";
import { CheckCircle2, Focus, Sun, Eye } from "lucide-react";

/**
 * Visual guidance panel outlining criteria for clinical fundus photograph gradability.
 */
export function CaptureGuidance() {
  const criteria = [
    {
      icon: Eye,
      title: "Centering & Field of View",
      description: "Retinal circle should occupy > 50% of frame with optic disc and macula visible.",
    },
    {
      icon: Focus,
      title: "Sharp Focus",
      description: "Retinal microvasculature and vessel branches must be distinctly defined without motion blur.",
    },
    {
      icon: Sun,
      title: "Balanced Illumination",
      description: "Avoid excessive camera flash glare, dark perimeter vignetting, or uneven shadow quadrants.",
    },
    {
      icon: CheckCircle2,
      title: "Unobstructed View",
      description: "Free of obscuring eyelashes, eyelid margins, or lens dust artifacts across the macula.",
    },
  ];

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Clinical Acquisition Guidelines
        </h4>
        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          Automated IQA Gated
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {criteria.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h5 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  {item.title}
                </h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
