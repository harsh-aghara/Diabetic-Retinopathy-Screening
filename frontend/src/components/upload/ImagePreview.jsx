import React from "react";
import { RefreshCw, Trash2, CheckCircle, FileText } from "lucide-react";
import { formatBytes } from "../../lib/utils";

/**
 * Image preview card displaying file details and replacement controls.
 * @param {{
 *   file: File,
 *   previewUrl: string,
 *   dimensions?: { width: number, height: number } | null,
 *   onReplace: () => void,
 *   onRemove: () => void,
 *   disabled?: boolean
 * }} props
 */
export function ImagePreview({
  file,
  previewUrl,
  dimensions = null,
  onReplace,
  onRemove,
  disabled = false,
}) {
  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Thumbnail Preview */}
        <div className="relative w-36 h-36 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-200 dark:border-slate-800 shadow-inner group">
          <img
            src={previewUrl}
            alt="Selected retinal fundus photograph preview"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
          <div className="absolute top-2 right-2 bg-emerald-600/90 text-white rounded-full p-1 shadow">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* File Metadata */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
            Ready for Analysis
          </div>

          <h4 className="text-base font-semibold text-slate-900 dark:text-white truncate max-w-md" title={file.name}>
            {file.name}
          </h4>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 max-w-sm">
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
              <FileText className="w-4 h-4 text-slate-400" />
              <span>
                <strong className="text-slate-700 dark:text-slate-300">Size:</strong> {formatBytes(file.size)}
              </span>
            </div>
            {dimensions && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg">
                <span className="font-mono text-slate-400">px</span>
                <span>
                  <strong className="text-slate-700 dark:text-slate-300">Dim:</strong> {dimensions.width}×{dimensions.height}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 italic">
            Image will be checked by rule-based Image Quality Assessment (IQA) prior to model inference.
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onReplace}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Choose Different Image
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Remove
        </button>
      </div>
    </div>
  );
}
