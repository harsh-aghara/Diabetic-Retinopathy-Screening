import React, { useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  Download,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Eye,
  User,
  FolderHeart,
  Loader2,
  Calendar,
  Activity,
  FileCheck,
} from "lucide-react";
import { RiskGauge } from "../components/results/RiskGauge";
import { QualityReport } from "../components/results/QualityReport";
import { GradeProbabilityChart } from "../components/results/GradeProbabilityChart";
import { HeatmapViewer } from "../components/results/HeatmapViewer";
import { WhyPanel } from "../components/results/WhyPanel";
import { downloadRecordPdf, downloadAdHocPdf } from "../lib/api";

/**
 * 12-column clinical screening results workspace.
 * Displays patient demographics header, AI predictions, Grad-CAM explainability,
 * and handles official PDF report generation and clinical records navigation.
 *
 * @param {{
 *   screeningData: any,
 *   originalUrl?: string | null,
 *   patientData?: any,
 *   onNewScreening: () => void,
 *   onViewRecords?: () => void
 * }} props
 */
export function ResultPage({
  screeningData,
  originalUrl = null,
  patientData = null,
  onNewScreening,
  onViewRecords,
}) {
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  const { quality, result, record_id, patient_id } = screeningData;
  const isRejected = !result;

  // Resolved patient info from prop or response
  const resolvedPatient = {
    name: patientData?.name || "Anonymous Patient",
    patient_id: patient_id || patientData?.patient_id || "PT-DEMO",
    age: patientData?.age !== undefined ? patientData.age : "N/A",
    gender: patientData?.gender || "Unknown",
    eye_examined: patientData?.eye_examined || "Right Eye (OD)",
    diabetes_type: patientData?.diabetes_type || "Type 2",
    diabetes_duration: patientData?.diabetes_duration,
    doctor_name: patientData?.doctor_name || "Staff Clinician",
    clinical_notes: patientData?.clinical_notes || "",
  };

  // Handle PDF report generation
  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      if (record_id) {
        await downloadRecordPdf(record_id, `DR_Report_${resolvedPatient.patient_id}.pdf`);
      } else {
        await downloadAdHocPdf(resolvedPatient, screeningData, `DR_Report_${resolvedPatient.patient_id}.pdf`);
      }
    } catch (err) {
      alert("Failed to download clinical PDF report: " + err.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

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

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Download Official PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-emerald-800 dark:text-emerald-200 bg-emerald-100 dark:bg-emerald-950/80 hover:bg-emerald-200 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 transition-colors shadow-xs"
            title="Download publication-grade PDF clinical report"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Clinical PDF</span>
              </>
            )}
          </button>

          {/* View in Records Button */}
          {onViewRecords && (
            <button
              type="button"
              onClick={onViewRecords}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <FolderHeart className="w-3.5 h-3.5 text-emerald-600" />
              Patient Records
            </button>
          )}

          {/* Browser Print / Save PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>

          {/* New Screening Shortcut */}
          <button
            type="button"
            onClick={onNewScreening}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Next Patient
          </button>
        </div>
      </div>

      {/* Clinical Print Header (Visible only when printed) */}
      <div className="hidden print:block pb-3 mb-4 border-b-2 border-slate-800 print-avoid-break">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              RetinaScreen AI - Diabetic Retinopathy Diagnostic Report
            </h1>
            <p className="text-xs text-slate-600">
              Automated Dual CNN Retinal Evaluation, Image Quality Assessment & Explainability
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <span className="font-semibold text-slate-900 uppercase tracking-wider">Confidential Clinical Report</span>
            <p className="font-mono">{new Date().toLocaleDateString(undefined, { dateStyle: "long" })}</p>
          </div>
        </div>
      </div>

      {/* Patient Demographics Banner (HCI: Recognition over Recall) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs print-avoid-break space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                  {resolvedPatient.name}
                </h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {resolvedPatient.patient_id}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {record_id && (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                <FileCheck className="w-3.5 h-3.5" />
                Saved in Records (ID #{record_id})
              </span>
            )}
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">
              Exam Date: {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Demographics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">Age & Biological Sex</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {resolvedPatient.age} yrs • {resolvedPatient.gender}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Target Eye</span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              {resolvedPatient.eye_examined}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Diabetes History</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {resolvedPatient.diabetes_type || "None"}{" "}
              {resolvedPatient.diabetes_duration ? `(${resolvedPatient.diabetes_duration} yrs)` : ""}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">Attending Clinician</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {resolvedPatient.doctor_name}
            </span>
          </div>
          {resolvedPatient.clinical_notes && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-400 block font-medium">Clinical Notes:</span>
              <p className="text-slate-700 dark:text-slate-300 italic">{resolvedPatient.clinical_notes}</p>
            </div>
          )}
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
        /* State B: Diagnostic Results Workspace */
        <div className="space-y-6">
          {/* Exactly ONE clearly visible warning when photo quality is suboptimal */}
          {quality?.decision === "reject-recapture" ? (
            <div className="p-5 sm:p-6 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print-avoid-break">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-amber-950 dark:text-amber-100">
                      Image Quality Suboptimal: Retake Photograph Required
                    </h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                      Ungradable
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/90 dark:text-amber-200/90 leading-relaxed max-w-2xl">
                    {quality.reasons.length > 0
                      ? quality.reasons.join(" ")
                      : "The fundus photograph does not meet minimum sharpness or illumination thresholds."}{" "}
                    Automated diagnosis and confidence scores are withheld to protect clinical accuracy. Please re-photograph the patient's retinal fundus.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center shrink-0 print:hidden">
                <button
                  type="button"
                  onClick={onNewScreening}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-amber-700 hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500 shadow-xs transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Retake Photo
                </button>
              </div>
            </div>
          ) : (
            /* Primary Clinician Diagnosis & Action Summary (Only for Optimal Quality Photos) */
            (() => {
              const gradeNum = result.grade.predicted;
              const confPct = Math.round(result.grade.confidence * 100);

              let diagTitle = "Stage 0: No Diabetic Retinopathy Detected";
              let actionText = "Routine Annual Retinal Screening; Maintain Glycemic Control (HbA1c < 7%)";
              let badgeBg = "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700";
              let StatusIcon = CheckCircle2;

              if (gradeNum === 4) {
                diagTitle = "Stage 4: Proliferative Diabetic Retinopathy";
                actionText = "Immediate Vitreoretinal Specialist Referral (24–48 Hours) for PRP/Anti-VEGF therapy";
                badgeBg = "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700";
                StatusIcon = AlertOctagon;
              } else if (gradeNum === 3) {
                diagTitle = "Stage 3: Severe Non-Proliferative DR";
                actionText = "Urgent Retina Specialist Referral within 2–4 Weeks; high risk of neovascularization";
                badgeBg = "bg-orange-50 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700";
                StatusIcon = AlertOctagon;
              } else if (gradeNum === 2) {
                diagTitle = "Stage 2: Moderate Non-Proliferative DR";
                actionText = "Specialist Referral within 3–6 Months for OCT to evaluate macular edema";
                badgeBg = "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700";
                StatusIcon = AlertTriangle;
              } else if (gradeNum === 1) {
                diagTitle = "Stage 1: Mild Non-Proliferative DR";
                actionText = "Periodic Clinical Follow-up in 6–12 Months with Primary Care Metabolic Review";
                badgeBg = "bg-sky-50 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-700";
                StatusIcon = CheckCircle2;
              }

              return (
                <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 print-avoid-break">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeBg}`}>
                        <StatusIcon className="w-4 h-4 shrink-0" />
                        <span>{diagTitle}</span>
                        <span className="font-semibold opacity-90">({confPct}% confidence)</span>
                      </span>

                      {/* Photo Quality Tag */}
                      {quality?.decision === "enhance-then-accept" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                          <span className="w-2 h-2 rounded-full bg-sky-500" />
                          Enhanced Quality
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Optimal Photo Clarity
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">Clinical Action: </span>
                      {actionText}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto shrink-0 print:hidden">
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={downloadingPdf}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 transition-colors shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Official PDF Report
                    </button>
                  </div>
                </div>
              );
            })()
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
