# Human–Computer Interaction (HCI) Design Document: Diabetic Retinopathy Screening System

## Executive Summary
This design document specifies the clinical and cognitive interface architecture for the **RetinaScreen AI** Diabetic Retinopathy (DR) Screening Web Application. 

The application couples automated Image Quality Assessment (IQA), dual-model `CustomDRCNN` neural networks, and Gradient-weighted Class Activation Mapping (Grad-CAM) with a React 18 frontend designed around accessibility (WCAG 2.1 AA), cognitive load minimization, and clinical interpretability.

---

## 1. Clinical Problem Statement & User Personas

### 1.1 The Clinical Problem
Diabetic Retinopathy is a microvascular complication of diabetes and the leading cause of preventable blindness among working-age adults worldwide. Early detection through regular retinal screening reduces the risk of severe vision loss by over 90%. However:
- Specialized ophthalmologists and retinal imaging cameras are concentrated in tertiary medical centers.
- Up to 25% of point-of-care retinal photographs in primary clinics are ungradable due to motion blur, poor focus, or uneven lighting, leading to diagnostic delays.
- "Black-box" AI models that output only a risk probability without explaining spatial reasoning or lesion locations are routinely distrusted by clinicians and patients.

### 1.2 Target Personas
1. **Primary Care Practitioner / Medical Assistant:**
   - Goal: Quickly determine if an acquired fundus photo is gradable and whether immediate referral to a retina specialist is needed.
   - Cognitive Need: Clear, immediate triage feedback (`Diagnostic Quality` vs `Recapture Required`) without deciphering complex technical parameters.
2. **Patient / Family Caregiver:**
   - Goal: Understand what the risk percentage means, whether they are losing their sight, and what specific medical follow-up is necessary.
   - Cognitive Need: Empathetic, jargon-free explanations avoiding alarmist language, with clear visual proof of where the AI looked.

---

## 2. Core HCI Principles & Design Decisions

### 2.1 Safety-First Automated Quality Triage (IQA)
To prevent clinical misdiagnosis caused by motion blur or improper framing:
- **Pre-Inference Gating:** Every uploaded fundus photograph is passed through 4 deterministic computer-vision metrics:
  - *Field-of-View (FOV) ratio* (Threshold $\ge 20\%$)
  - *Laplacian Sharpness Variance* (Threshold $\ge 25.0$)
  - *Illumination Uniformity* (Threshold $\le 0.45$)
  - *Green Channel Sobel Contrast* (Threshold $\ge 8.0$)
- **Graceful Failure State:** If an image is blurry or off-center, the system immediately returns a `reject-recapture` decision with `result: null`. Instead of displaying a confusing model output, it guides the clinical operator through a 4-point photographic retake checklist.

### 2.2 Triple Encoding for Accessibility (WCAG 2.1 AA)
Relying on color alone to communicate risk levels violates WCAG Guideline 1.4.1 (Use of Color). Every risk tier and quality state incorporates triple redundant encoding:
1. **Color Palette:** Emerald (`#10B981`) for Low Risk / Diagnostic Quality, Amber (`#F59E0B`) for Moderate Risk / Suboptimal Quality, Rose (`#F43F5E`) for High Risk / Recapture Required.
2. **Text Label:** Explicit text badge stating "Low Risk", "Moderate Risk", or "High Risk".
3. **Geometric Icon & Symbol:** Distinct icons (`CheckCircle2` ✓, `AlertTriangle` ⚠, `AlertOctagon` ! / `Camera` ✕) ensuring clarity for color-vision-deficient users.

### 2.3 Interactive Visual Explainability (Grad-CAM)
Explainability is not presented as a static afterthought, but as an interactive diagnostic workspace:
- **Client-Side Alpha Blending:** The backend computes an RGBA activation map where background pixels have zero alpha. An interactive browser slider allows clinicians to adjust heatmap opacity from 0% to 100% in real time.
- **Dual Perspective Toggles:** Operators can switch between the binary referability model's heatmap and the 5-stage multiclass model's heatmap to inspect how focal lesions influence both global triage and severity staging.
- **Side-by-Side & Overlay Modes:** Supports stacked overlay directly on the retinal photograph or a dual-column comparison mode.

---

## 3. Screen States & Interaction Workflow

```
[ Landing Page ]
      │ (Click "Upload Retinal Photograph")
      ▼
[ Upload Page ]
      ├── Drag & Drop Zone / Mobile Camera Capture
      ├── Image Validation (<10MB, JPEG/PNG, min 256px)
      ├── Real-Time Image Preview & File Meta
      └── "Analyze Retinal Image" Action Button
            │
            ▼ (Submits to POST /predict)
[ Analysis Progress State ]
      └── Indeterminate pulse & loader with honest cancellation option
            │
      ┌─────┴────────────────────────────────────────────────┐
      ▼                                                      ▼
[ Result: Rejected State ]                         [ Result: Gradable State ]
  ├── Prominent Retake Alert                         ├── Referable Risk Gauge
  ├── Failed Metrics Highlighted                     ├── Dual-Model Concordance
  ├── 4-Point Retake Checklist                       ├── IQA Quantitative Report
  └── "Upload Replacement Photo" Action              ├── 5-Stage ICDR Bar Chart
                                                     ├── Interactive Heatmap Viewer
                                                     └── Clinical WhyPanel
```

---

## 4. Frontend Component Architecture

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx                # Brand title, dark/light toggle, API status
│   │   └── Disclaimer.jsx            # Clinical decision support notice
│   ├── upload/
│   │   ├── ImageDropzone.jsx         # Accessible drag/drop & camera capture
│   │   ├── ImagePreview.jsx          # Thumbnail, file size, replace/remove buttons
│   │   └── CaptureGuidance.jsx       # 4-point acquisition guidelines
│   ├── results/
│   │   ├── RiskGauge.jsx             # Referable probability gauge & concordance
│   │   ├── QualityReport.jsx         # IQA metrics in tabular format
│   │   ├── GradeProbabilityChart.jsx # 5-class ICDR probability bars
│   │   ├── HeatmapViewer.jsx         # Grad-CAM overlay, opacity slider, split view
│   │   └── WhyPanel.jsx              # Clinical findings & specialist referral timeline
│   └── learn/
│       └── LearnMore.jsx             # CNN architecture & IQA explanation accordions
├── hooks/
│   └── useScreening.js               # Upload lifecycle & AbortController
├── lib/
│   ├── api.js                        # Typed fetch wrapper with ApiError
│   ├── theme.js                      # WCAG tokens & quality colors
│   ├── utils.js                      # cn() & formatBytes()
│   └── validateImage.js              # Client-side validation utility
└── pages/
    ├── Landing.jsx                   # Overview & stylized vector illustration
    ├── UploadPage.jsx                # Single upload workspace
    └── ResultPage.jsx                # 12-column clinical results layout
```

---

## 5. Automated Verification Gates

The application enforces automated quality gates:
- **Zero Dead Code:** Grep test proving zero legacy tabular survey identifiers exist in the repository.
- **Type Safety:** Backend passes `mypy app tests` with `strict = True`.
- **Unit & Integration Tests:** Pytest passes 100% of test suites with synthetic in-memory fixtures.
- **Clean Linting:** Backend passes `ruff check app tests` and `vulture app tests --min-confidence 70`.
- **Frontend Compilation:** Vite bundles production assets cleanly with zero warnings (`npm run build`).

---

## 6. Regulatory & Ethical Disclaimer
RetinaScreen AI is an investigational software instrument designed exclusively for clinical decision support and risk awareness. It does not provide definitive medical diagnoses and cannot substitute for dilated biomicroscopy by an ophthalmologist or retina specialist.
