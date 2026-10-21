import React, { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, Layers, ShieldCheck, Eye, Compass } from "lucide-react";

/**
 * Educational accordion component detailing CustomDRCNN architecture, IQA, and Grad-CAM.
 */
export default function LearnMore() {
  const [openSection, setOpenSection] = useState(null);

  const toggle = (sectionId) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-base text-slate-900 dark:text-slate-100">
            Learn More: How the DR Screening Pipeline Works
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Plain-English explanation of the CustomDRCNN architecture, IQA triage, and Grad-CAM heatmaps.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {/* Accordion 1: CustomDRCNN 5-Block Architecture */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => toggle("architecture")}
            className="w-full p-3.5 text-left flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              1. The 5-Block CustomDRCNN Deep Learning Architecture
            </span>
            {openSection === "architecture" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSection === "architecture" && (
            <div className="p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p>
                The core classification engine uses a tailored 5-block Convolutional Neural Network (CNN) specifically calibrated for high-resolution retinal fundus photographs:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
                <li>
                  <strong>Channel Progression:</strong> 3 (RGB) → 8 → 16 → 32 → 64 → 128 feature maps.
                </li>
                <li>
                  <strong>Spatial Downsampling:</strong> Max-pooling (224×224 → 112×112 → 56×56) after blocks 2 and 3 preserves fine microaneurysm details while compressing global spatial structure.
                </li>
                <li>
                  <strong>Regularization:</strong> Batch normalization and 50% dropout prevent overfitting to specific clinical acquisition artifacts.
                </li>
                <li>
                  <strong>Dual Heads:</strong> A binary model screens for referable DR (ICDR Grade 2+), while a multiclass model stratifies the 5 severity tiers (No DR to Proliferative DR).
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Accordion 2: Automated Image Quality Assessment (IQA) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => toggle("iqa")}
            className="w-full p-3.5 text-left flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" />
              2. Pre-Inference Image Quality Assessment (IQA)
            </span>
            {openSection === "iqa" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSection === "iqa" && (
            <div className="p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p>
                Prior to model evaluation, every image is subjected to a mathematical 4-metric quality gate to guard against false-negative diagnostic errors caused by blur or poor illumination:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
                <li>
                  <strong>Field of View Ratio (FOV &gt; 20%):</strong> Verifies that the retinal disc is sufficiently exposed and centered.
                </li>
                <li>
                  <strong>Laplacian Sharpness Variance (&gt; 25.0):</strong> Measures edge steepness to reject out-of-focus photographs and motion blur.
                </li>
                <li>
                  <strong>Illumination Uniformity (&lt; 0.45):</strong> Evaluates mean brightness consistency across a 3×3 grid to flag uneven lighting or flash glare.
                </li>
                <li>
                  <strong>Green Channel Sobel Contrast (&gt; 8.0):</strong> Assesses microvascular visibility since hemoglobin absorbs green wavelength light most strongly.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Accordion 3: Grad-CAM Explainability */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => toggle("gradcam")}
            className="w-full p-3.5 text-left flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Compass className="w-4 h-4 text-emerald-600" />
              3. Visual Interpretability via Grad-CAM
            </span>
            {openSection === "gradcam" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSection === "gradcam" && (
            <div className="p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p>
                Gradient-weighted Class Activation Mapping (Grad-CAM) converts complex multi-channel convolutional activations into an interpretable spatial heat map:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400">
                <li>
                  <strong>conv5 Penultimate Layer:</strong> Hooks attached to block 5 calculate the exact gradient of the output prediction score with respect to each of the 128 feature maps.
                </li>
                <li>
                  <strong>Global Importance Pooling:</strong> Gradients are pooled to compute a importance weight for each filter, followed by a positive ReLU rectification.
                </li>
                <li>
                  <strong>Client-Side Alpha Blending:</strong> Rendered as an RGBA PNG where zero-activation pixels remain transparent, enabling continuous opacity adjustments in the browser.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Accordion 4: Clinical Triage vs Diagnostic Scope */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => toggle("scope")}
            className="w-full p-3.5 text-left flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              4. Screening Instrument vs Confirmatory Diagnosis
            </span>
            {openSection === "scope" ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {openSection === "scope" && (
            <div className="p-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300 space-y-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p>
                This application is designed as an <strong>investigational clinical decision support screening tool</strong>, not a standalone diagnostic instrument.
              </p>
              <p>
                A "Referable" classification indicates elevated statistical risk of vision-threatening pathology warranting dilated biomicroscopy and optical coherence tomography (OCT) by a licensed ophthalmologist or retina specialist.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
