import React from "react";
import { HelpCircle, Stethoscope, Compass, AlertCircle } from "lucide-react";
import { GRADE_TOKENS } from "../../lib/theme";

/**
 * Clinical interpretation panel translating model outputs into physician-ready guidance.
 * @param {{
 *   grade: {
 *     predicted: number,
 *     label: string,
 *     confidence: number
 *   },
 *   referable: {
 *     probability: number,
 *     tier: string
 *   }
 * }} props
 */
export function WhyPanel({ grade, referable }) {
  const { predicted, label } = grade;
  const token = GRADE_TOKENS[predicted] || GRADE_TOKENS[0];

  const clinicalGuidanceMap = {
    0: {
      description: "No visible microvascular lesions, microaneurysms, or hard exudates detected in this fundus image.",
      nextSteps: "Continue standard annual dilated retinal examinations. Maintain glycemic target (HbA1c < 7%) and blood pressure control.",
      urgency: "Routine (12 Months)",
    },
    1: {
      description: "Isolated microaneurysms identified. Early microvascular alteration without significant capillary leakage.",
      nextSteps: "Repeat dilated fundus examination within 6 to 12 months. Review systemic metabolic markers (HbA1c, lipids, BP) with primary care physician.",
      urgency: "Periodic Review (6–12 Months)",
    },
    2: {
      description: "Microaneurysms accompanied by scattered intraretinal blot hemorrhages, hard exudates, or cotton-wool spots, below the 4-2-1 severe threshold.",
      nextSteps: "Referral to an ophthalmologist or retina specialist within 2 to 4 months for optical coherence tomography (OCT) to rule out diabetic macular edema (DME).",
      urgency: "Specialist Referral (2–4 Months)",
    },
    3: {
      description: "Severe non-proliferative disease meeting 4-2-1 criteria: extensive blot hemorrhages in 4 quadrants, venous beading in 2+ quadrants, or prominent IRMA.",
      nextSteps: "Urgent referral to a retina specialist within 2 to 4 weeks. High impending risk of neovascularization; close specialist surveillance required.",
      urgency: "Urgent Referral (2–4 Weeks)",
    },
    4: {
      description: "Neovascularization (fragile new vessel growth on retina/optic disc) or preretinal/vitreous hemorrhage indicating advanced proliferative diabetic retinopathy.",
      nextSteps: "Immediate referral to a retinal surgeon within 24 to 48 hours for consideration of panretinal photocoagulation (PRP) or intravitreal anti-VEGF injection.",
      urgency: "Immediate Specialist Referral (24–48 Hours)",
    },
  };

  const guidance = clinicalGuidanceMap[predicted] || clinicalGuidanceMap[0];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 print-avoid-break print:p-4 print:border-slate-300 print:shadow-none">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
          Clinical Interpretation & Recommendations
        </h3>
        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
          Evidence-Based Protocol
        </span>
      </div>

      {/* Disease Stage Clinical Breakdown */}
      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Pathological Findings ({token.fullName})
          </h4>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 font-mono">
            Grade {predicted} / 4
          </span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {guidance.description}
        </p>
      </div>

      {/* Actionable Clinical Next Steps */}
      <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
            Recommended Next Steps
          </h4>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100">
            {guidance.urgency}
          </span>
        </div>
        <p className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
          {guidance.nextSteps}
        </p>
      </div>

      {/* Grad-CAM Visual Guidance Helper */}
      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
        <Compass className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>How to read the heatmap:</strong> Red and warm highlighted patches in the Grad-CAM viewer correspond to spatial regions where convolutional filters in block 5 detected microaneurysms, exudate clusters, or vascular distortions.
        </p>
      </div>
    </div>
  );
}
