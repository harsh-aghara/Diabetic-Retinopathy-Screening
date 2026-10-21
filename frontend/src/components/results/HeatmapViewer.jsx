import React, { useState } from "react";
import { Eye, Layers, Sliders, Columns, Maximize2 } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Interactive Grad-CAM Heatmap Viewer with opacity slider and dual-model toggles.
 * @param {{
 *   images: {
 *     preprocessed_png: string,
 *     heatmap_referable_png: string,
 *     heatmap_grade_png: string
 *   },
 *   originalUrl?: string | null,
 *   gradeLabel?: string
 * }} props
 */
export function HeatmapViewer({
  images,
  originalUrl = null,
  gradeLabel = "Moderate",
  referableLabel = null,
}) {
  const [activeSource, setActiveSource] = useState("grade"); // 'grade' | 'referable'
  const [viewMode, setViewMode] = useState("overlay"); // 'overlay' | 'split' | 'preprocessed' | 'original'
  const [opacity, setOpacity] = useState(65); // 0 - 100

  const activeHeatmap =
    activeSource === "referable"
      ? images.heatmap_referable_png
      : images.heatmap_grade_png;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 print-avoid-break print:p-4 print:border-slate-300 print:shadow-none">
      {/* Top Header & Toggles */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            Visual Explainability (Grad-CAM)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Penultimate layer (conv5) visual attention map highlighting retinal regions driving predictions.
          </p>
        </div>

        {/* Explainability Target Toggle (Screen) */}
        <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => setActiveSource("grade")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              activeSource === "grade"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Grade: {gradeLabel}
          </button>
          <button
            type="button"
            onClick={() => setActiveSource("referable")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              activeSource === "referable"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            {referableLabel ? `Decision: ${referableLabel}` : "Referability"}
          </button>
        </div>

        {/* Print Target Label (PDF only) */}
        <span className="hidden print:inline-block text-xs font-bold px-2.5 py-1 rounded-md border border-slate-300 bg-slate-100 text-slate-800">
          Target: {activeSource === "referable" ? (referableLabel || "Referability") : `Grade ${gradeLabel}`}
        </span>
      </div>

      {/* Screen Interactive Viewer Canvas Area (Hidden in print) */}
      <div className="relative w-full rounded-2xl bg-black overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center min-h-[300px] sm:min-h-[380px] print:hidden">
        {viewMode === "split" ? (
          /* Side-by-Side Split View */
          <div className="w-full h-full grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Preprocessed Fundus
              </span>
              <img
                src={images.preprocessed_png}
                alt="Standardized preprocessed retinal fundus"
                className="w-full max-w-[280px] aspect-square object-contain rounded-lg border border-slate-800"
              />
            </div>
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">
                Grad-CAM Activation Map
              </span>
              <div className="relative w-full max-w-[280px] aspect-square rounded-lg overflow-hidden border border-slate-800">
                <img
                  src={images.preprocessed_png}
                  alt="Standardized preprocessed retinal fundus"
                  className="absolute inset-0 w-full h-full object-contain"
                />
                <img
                  src={activeHeatmap}
                  alt="Grad-CAM activation heatmap"
                  style={{ opacity: opacity / 100 }}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
              </div>
            </div>
          </div>
        ) : viewMode === "original" && originalUrl ? (
          /* Original Raw Upload View */
          <img
            src={originalUrl}
            alt="Original uploaded retinal photo"
            className="w-full max-w-[380px] aspect-square object-contain"
          />
        ) : viewMode === "preprocessed" ? (
          /* Preprocessed Image View Only */
          <img
            src={images.preprocessed_png}
            alt="Preprocessed retinal photo"
            className="w-full max-w-[380px] aspect-square object-contain"
          />
        ) : (
          /* Stacked Overlay Mode (Default) */
          <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center">
            {/* Base Image */}
            <img
              src={images.preprocessed_png}
              alt="Preprocessed retinal base image"
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* Dynamic Heatmap Overlay */}
            <img
              src={activeHeatmap}
              alt="Grad-CAM attention overlay"
              style={{ opacity: opacity / 100 }}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none transition-opacity duration-150"
            />
          </div>
        )}
      </div>

      {/* Dedicated Clinical Print Presentation (Print to PDF only) */}
      {/* Displays side-by-side preprocessed fundus photograph and Grad-CAM overlay */}
      {/* Specifically sized and styled with break-inside: avoid to guarantee zero page-cut issues */}
      <div className="hidden print:block print-avoid-break print-photo-block w-full">
        <div className="flex items-center justify-center gap-6 py-2">
          {/* Panel 1: Standardized Retinal Fundus */}
          <div className="flex flex-col items-center text-center space-y-1.5 print-avoid-break">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
              Preprocessed Retinal Fundus
            </span>
            <div className="w-[220px] h-[220px] rounded-xl overflow-hidden border border-slate-300 bg-black flex items-center justify-center shadow-none">
              <img
                src={images.preprocessed_png}
                alt="Preprocessed Retinal Fundus"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Panel 2: Grad-CAM Explainability Map Overlay */}
          <div className="flex flex-col items-center text-center space-y-1.5 print-avoid-break">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
              Grad-CAM Activation Overlay ({gradeLabel})
            </span>
            <div className="relative w-[220px] h-[220px] rounded-xl overflow-hidden border border-slate-300 bg-black flex items-center justify-center shadow-none">
              <img
                src={images.preprocessed_png}
                alt="Base Fundus"
                className="absolute inset-0 w-full h-full object-contain"
              />
              <img
                src={activeHeatmap}
                alt="Grad-CAM Overlay"
                style={{ opacity: 0.65 }}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls Bar (Hidden in print) */}
      <div className="space-y-3 pt-2 print:hidden">
        {/* Opacity Slider (In overlay and split modes) */}
        {(viewMode === "overlay" || viewMode === "split") && (
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <Sliders className="w-4 h-4 text-slate-500 shrink-0" />
            <label
              htmlFor="heatmap-opacity-slider"
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0"
            >
              Heatmap Opacity:
            </label>
            <input
              id="heatmap-opacity-slider"
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full accent-emerald-600 dark:accent-emerald-400 cursor-pointer"
              aria-label="Grad-CAM heatmap overlay opacity"
              aria-valuenow={opacity}
              aria-valuemin={0}
              aria-valuemax={100}
            />
            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 w-10 text-right">
              {opacity}%
            </span>
          </div>
        )}

        {/* View Mode Switcher & Colormap Legend */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          {/* View Mode Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400 font-medium mr-1">View:</span>
            <button
              type="button"
              onClick={() => setViewMode("overlay")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors font-medium",
                viewMode === "overlay"
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 font-semibold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              )}
            >
              Overlay
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors font-medium",
                viewMode === "split"
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 font-semibold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              )}
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preprocessed")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-colors font-medium",
                viewMode === "preprocessed"
                  ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 font-semibold"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              )}
            >
              Preprocessed
            </button>
            {originalUrl && (
              <button
                type="button"
                onClick={() => setViewMode("original")}
                className={cn(
                  "px-2.5 py-1 rounded-md transition-colors font-medium",
                  viewMode === "original"
                    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/70 dark:text-emerald-200 font-semibold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                )}
              >
                Original Raw
              </button>
            )}
          </div>

          {/* Colormap Legend */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Low Attention</span>
            <div
              className="w-24 h-2.5 rounded-full"
              style={{
                background: "linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)",
              }}
              aria-label="Jet colormap gradient from low attention blue to high attention red"
            />
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Peak Focus</span>
          </div>
        </div>
      </div>
    </div>
  );
}
