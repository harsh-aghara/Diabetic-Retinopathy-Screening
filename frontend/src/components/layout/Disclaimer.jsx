import React from "react";
import { ShieldAlert } from "lucide-react";

/**
 * Persistent clinical screening notice emphasizing non-diagnostic status.
 */
export default function Disclaimer({ className = "" }) {
  return (
    <aside
      role="note"
      aria-label="Clinical Disclaimer"
      className={`rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400 ${className}`}
    >
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 mb-0.5">
            Clinical Decision Support Aid — Not a Standalone Medical Diagnosis
          </p>
          <p>
            This automated instrument screens retinal fundus photographs using deep convolutional neural networks (CustomDRCNN) and automated Image Quality Assessment (IQA). It is intended solely for clinical triage and risk awareness, and does not replace a comprehensive dilated eye examination, slit-lamp biomicroscopy, or optical coherence tomography (OCT) by a licensed ophthalmologist or retina specialist.
          </p>
        </div>
      </div>
    </aside>
  );
}
