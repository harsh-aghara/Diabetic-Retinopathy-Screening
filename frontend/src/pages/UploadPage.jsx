import React, { useRef } from "react";
import { ArrowLeft, Sparkles, Loader2, AlertCircle, ShieldAlert } from "lucide-react";
import { ImageDropzone } from "../components/upload/ImageDropzone";
import { ImagePreview } from "../components/upload/ImagePreview";
import { CaptureGuidance } from "../components/upload/CaptureGuidance";

/**
 * Single-step image upload and analysis launch page.
 * @param {{
 *   screening: ReturnType<import("../hooks/useScreening").useScreening>,
 *   onBack: () => void,
 *   onAnalysisComplete: (result: any) => void
 * }} props
 */
export function UploadPage({ screening, onBack, onAnalysisComplete }) {
  const {
    file,
    previewUrl,
    dimensions,
    status,
    isAnalyzing,
    error,
    selectFile,
    clearFile,
    analyze,
    cancelAnalysis,
  } = screening;

  const dropzoneRef = useRef(null);

  const handleStartAnalysis = async () => {
    const data = await analyze();
    if (data) {
      onAnalysisComplete(data);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation & Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>

        <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
          Screening Step 1 of 1
        </span>
      </div>

      <div className="space-y-2 text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Upload Retinal Fundus Photograph
        </h1>
        <p className="text-sm md:text-base text-slate-600 dark:text-slate-400 max-w-2xl">
          Provide a single color retinal fundus image. The system assesses image quality, screens for referable diabetic retinopathy, classifies ICDR stage, and highlights microvascular regions of interest.
        </p>
      </div>

      {/* Upload Target or Selected Image Preview */}
      <div className="space-y-6">
        {!file ? (
          <ImageDropzone
            onFileSelected={selectFile}
            disabled={isAnalyzing}
            error={status === "error" ? error : null}
          />
        ) : (
          <ImagePreview
            file={file}
            previewUrl={previewUrl}
            dimensions={dimensions}
            onReplace={() => {
              clearFile();
              // Focus dropzone after reset
              setTimeout(() => dropzoneRef.current?.click(), 50);
            }}
            onRemove={clearFile}
            disabled={isAnalyzing}
          />
        )}

        {/* Clinical Capture Guidance */}
        <CaptureGuidance />

        {/* Global Error Banner (e.g. Server or API failures) */}
        {error && status === "error" && file && (
          <div
            role="alert"
            className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-3 text-rose-900 dark:text-rose-200 text-sm"
          >
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h5 className="font-semibold">
                {error.code ? `Analysis Failed (${error.code})` : "Analysis Request Failed"}
              </h5>
              <p className="text-xs leading-relaxed">{error.message}</p>
            </div>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
            Photos are evaluated in-memory and are never stored on disk or logged.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isAnalyzing && (
              <button
                type="button"
                onClick={cancelAnalysis}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium rounded-xl text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              onClick={handleStartAnalysis}
              disabled={!file || isAnalyzing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl text-white bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-4 focus-visible:ring-emerald-500/30 focus-visible:outline-none"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Evaluating Image & Grad-CAM...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Retinal Image</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
