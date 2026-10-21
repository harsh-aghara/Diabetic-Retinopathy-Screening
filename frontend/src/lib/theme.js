import { CheckCircle2, AlertTriangle, AlertOctagon, Camera } from "lucide-react";

/**
 * Triple-encoded risk design tokens complying with WCAG 2.1 AA (1.4.1 Use of Color).
 * Encodes risk using color + explicit text badge + geometric icon.
 */
export const RISK_TOKENS = {
  Low: {
    level: "Low",
    label: "Low Risk",
    icon: CheckCircle2,
    symbol: "✓",
    color: "#10B981", // Emerald 500
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700",
    surfaceClass: "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/60",
    textClass: "text-emerald-900 dark:text-emerald-200",
    ariaLabel: "Low risk classification: Probability of referable diabetic retinopathy under 35 percent",
    clinicalSummary: "Low likelihood of referable diabetic retinopathy. Recommend routine annual dilated retinal examination.",
  },
  Moderate: {
    level: "Moderate",
    label: "Moderate Risk",
    icon: AlertTriangle,
    symbol: "⚠",
    color: "#F59E0B", // Amber 500
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700",
    surfaceClass: "bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/60",
    textClass: "text-amber-900 dark:text-amber-200",
    ariaLabel: "Moderate risk classification: Probability of referable diabetic retinopathy between 35 and 65 percent",
    clinicalSummary: "Microvascular signs detected. Non-urgent comprehensive ophthalmic evaluation recommended within 2 to 4 months.",
  },
  High: {
    level: "High",
    label: "High Risk",
    icon: AlertOctagon,
    symbol: "!",
    color: "#F43F5E", // Rose 500
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700",
    surfaceClass: "bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/60",
    textClass: "text-rose-900 dark:text-rose-200",
    ariaLabel: "High risk classification: Probability of referable diabetic retinopathy above 65 percent",
    clinicalSummary: "Significant referable retinal lesions detected. Prompt referral to a retina specialist or ophthalmologist is strongly recommended.",
  },
};

/**
 * Image Quality Assessment (IQA) triage design tokens.
 */
export const QUALITY_TOKENS = {
  accept: {
    decision: "accept",
    label: "Gradable",
    badgeLabel: "Diagnostic Quality",
    icon: CheckCircle2,
    symbol: "✓",
    color: "#10B981",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-700",
    surfaceClass: "bg-emerald-50/60 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
    clinicalSummary: "Retinal photograph meets all focus, sharpness, field-of-view, and vessel contrast criteria.",
  },
  "enhance-then-accept": {
    decision: "enhance-then-accept",
    label: "Suboptimal (Enhanced)",
    badgeLabel: "Borderline Quality",
    icon: AlertTriangle,
    symbol: "⚠",
    color: "#F59E0B",
    badgeClass: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-700",
    surfaceClass: "bg-amber-50/60 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    clinicalSummary: "Uneven illumination or low vessel contrast detected. Contrast enhancement applied prior to analysis.",
  },
  "reject-recapture": {
    decision: "reject-recapture",
    label: "Ungradable",
    badgeLabel: "Recapture Required",
    icon: Camera,
    symbol: "✕",
    color: "#F43F5E",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-700",
    surfaceClass: "bg-rose-50/60 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800",
    clinicalSummary: "Image sharpness or field of view is below the diagnostic threshold. A replacement photo is required.",
  },
};

/**
 * ICDR DR 5-stage severity grading tokens.
 */
export const GRADE_TOKENS = {
  0: {
    grade: 0,
    name: "No DR",
    fullName: "No Diabetic Retinopathy",
    color: "#10B981",
    barColor: "bg-emerald-500",
  },
  1: {
    grade: 1,
    name: "Mild",
    fullName: "Mild Non-Proliferative DR",
    color: "#0EA5E9",
    barColor: "bg-sky-500",
  },
  2: {
    grade: 2,
    name: "Moderate",
    fullName: "Moderate Non-Proliferative DR",
    color: "#F59E0B",
    barColor: "bg-amber-500",
  },
  3: {
    grade: 3,
    name: "Severe",
    fullName: "Severe Non-Proliferative DR",
    color: "#F97316",
    barColor: "bg-orange-500",
  },
  4: {
    grade: 4,
    name: "Proliferative",
    fullName: "Proliferative Diabetic Retinopathy",
    color: "#F43F5E",
    barColor: "bg-rose-500",
  },
};

/**
 * Resolve risk level and tokens from numeric probability.
 * @param {number} probability - Float between 0.0 and 1.0
 * @returns {typeof RISK_TOKENS.Low}
 */
export function getRiskTokens(probability) {
  if (probability < 0.35) {
    return RISK_TOKENS.Low;
  } else if (probability <= 0.65) {
    return RISK_TOKENS.Moderate;
  } else {
    return RISK_TOKENS.High;
  }
}

/**
 * Resolve quality tokens from decision string.
 * @param {string} decision
 * @returns {typeof QUALITY_TOKENS.accept}
 */
export function getQualityTokens(decision) {
  return QUALITY_TOKENS[decision] || QUALITY_TOKENS["reject-recapture"];
}
