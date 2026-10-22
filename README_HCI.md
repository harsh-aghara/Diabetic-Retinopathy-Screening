# Human–Computer Interaction (HCI) Design Document: Diabetic Retinopathy Screening System

## Executive Summary
This design document specifies the clinical and cognitive interface architecture for the **RetinaScreen AI** Diabetic Retinopathy (DR) Screening Web Application. 

The application couples automated Image Quality Assessment (IQA), dual-model `CustomDRCNN` neural networks, Gradient-weighted Class Activation Mapping (Grad-CAM), an SQLite clinical database, and pure-Python PDF report generation with a React 18 frontend designed around accessibility (WCAG 2.1 AA), cognitive load minimization, error prevention, and clinical interpretability.

---

## 1. Clinical Problem Statement & User Personas

### 1.1 The Clinical Problem
Diabetic Retinopathy is a microvascular complication of diabetes and the leading cause of preventable blindness among working-age adults worldwide. Early detection through regular retinal screening reduces the risk of severe vision loss by over 90%. However:
- Specialized ophthalmologists and retinal imaging cameras are concentrated in tertiary medical centers.
- Up to 25% of point-of-care retinal photographs in primary clinics are ungradable due to motion blur, poor focus, or uneven lighting, leading to diagnostic delays.
- "Black-box" AI models that output only a risk probability without explaining spatial reasoning or lesion locations are routinely distrusted by clinicians and patients.
- Point-of-care clinics require complete patient demographic tracking, longitudinal records, and standardized printable/downloadable documentation for clinical handover.

### 1.2 Target Personas
1. **Primary Care Practitioner / Clinic Doctor:**
   - Goal: Register patient clinical context (eye, diabetes history, duration), review previous screenings, quickly determine if an acquired fundus photo is gradable, and download an official signed PDF report for referral.
   - Cognitive Need: Clear, immediate triage feedback (`Diagnostic Quality` vs `Recapture Required`), triple-encoded risk tiers, and zero ambiguity on whether specialist referral is required.
2. **Medical Assistant / Photographic Technician:**
   - Goal: Acquire gradable photographs with clear feedback if focus or illumination fails, without feeling blamed by the software.
   - Cognitive Need: Empathetic, actionable photographic retake guidance and real-time form validation.
3. **Patient / Family Caregiver:**
   - Goal: Understand what the risk percentage means and receive a legible, professional diagnostic report they can present to their retinal specialist.
   - Cognitive Need: Empathetic, jargon-free explanations avoiding alarmist language, with visual proof of where the AI looked.

---

## 2. Core HCI Principles & Design Decisions

### 2.1 Progressive Disclosure & Error Prevention in Clinical Intake
To avoid overwhelming clinicians while capturing essential medical record data:
- **Sequential 2-Step Screening Wizard:**
  - `Step 1: Patient Demographic & Clinical Intake` (Name, Age, Biological Sex, Patient ID / MRN, Eye Examined OD/OS/OU, Diabetes Classification & Duration, Attending Clinician, Notes).
  - `Step 2: Fundus Photography Acquisition` (Active patient banner, drag & drop / camera, real-time file validation).
  - `Step 3: Clinical Diagnostic Workspace` (Risk gauge, IQA audit, ICDR probabilities, Grad-CAM viewer, PDF download).
- **Fitts's Law & Touch Affordance:** Segmented selection buttons (min 44px height) for biological sex (`Male`, `Female`, `Other`) and target eye (`OD - Right Eye`, `OS - Left Eye`, `OU - Both Eyes`).
- **Error Prevention (Nielsen Heuristic #5):**
  - Real-time inline bounds validation on age (`1-120`) and name length (`>=2 chars`).
  - Auto-generated unique Medical Record Number (MRN) format (`PT-YYYYMM-XXXX`) with a one-click regeneration button.
- **Recognition Over Recall (Nielsen Heuristic #6):** The active patient's name, age, examined eye, and MRN persist as an anchor banner on both the upload and results pages, eliminating cognitive memory strain.

### 2.2 Safety-First Automated Quality Triage (IQA)
To prevent clinical misdiagnosis caused by motion blur or improper framing:
- **Pre-Inference Gating:** Every uploaded fundus photograph is passed through 4 deterministic computer-vision metrics:
  - *Field-of-View (FOV) ratio* (Threshold $\ge 20\%$)
  - *Laplacian Sharpness Variance* (Threshold $\ge 25.0$)
  - *Illumination Uniformity* (Threshold $\le 0.45$)
  - *Green Channel Sobel Contrast* (Threshold $\ge 8.0$)
- **Graceful Failure State:** If an image is blurry or off-center, the system immediately returns a `reject-recapture` decision with `result: null`. Instead of displaying a confusing model output, it guides the clinical operator through a 4-point photographic retake checklist.

### 2.3 Triple Encoding for Accessibility (WCAG 2.1 AA)
Relying on color alone to communicate risk levels violates WCAG Guideline 1.4.1 (Use of Color). Every risk tier, quality state, and record badge incorporates triple redundant encoding:
1. **Color Palette:** Emerald (`#10B981`) for Low Risk / Diagnostic Quality, Amber (`#F59E0B`) for Moderate Risk / Suboptimal Quality, Rose (`#F43F5E`) for High Risk / Recapture Required.
2. **Text Label:** Explicit text badge stating "Low Risk", "Moderate Risk", or "High Risk".
3. **Geometric Icon & Symbol:** Distinct icons (`CheckCircle2` ✓, `AlertTriangle` ⚠, `AlertOctagon` ! / `Camera` ✕) ensuring clarity for color-vision-deficient users.

### 2.4 Interactive Visual Explainability (Grad-CAM)
Explainability is not presented as a static afterthought, but as an interactive diagnostic workspace:
- **Client-Side Alpha Blending:** The backend computes an RGBA activation map where background pixels have zero alpha. An interactive browser slider allows clinicians to adjust heatmap opacity from 0% to 100% in real time.
- **Dual Perspective Toggles:** Operators can switch between the binary referability model's heatmap and the 5-stage multiclass model's heatmap to inspect how focal lesions influence both global triage and severity staging.
- **Side-by-Side & Overlay Modes:** Supports stacked overlay directly on the retinal photograph or a dual-column comparison mode.

### 2.5 Clinic Records Dashboard for Doctors
- **Summary Metric Cards:** Total Screened, High Risk (Rose), Moderate Risk (Amber), Low Risk (Emerald), and Needs Retake (Slate).
- **Search & Filter:** Real-time client-side search across Patient Name and MRN, with instant risk tier filter pills (`All`, `High Risk`, `Moderate`, `Low Risk`, `Needs Retake`).
- **Comprehensive Inspection Modal:** Doctors can click any historical patient record to inspect demographics, fundus photo, Grad-CAM activation heatmap, and IQA metrics.
- **Safety Confirmations:** Destructive actions (record deletion) require explicit user confirmation.

### 2.6 Publication-Grade Clinical PDF Generation
- Generated on-demand via standard PDF 1.4 pure-Python engine (`zlib`, `struct`, `PIL.Image`).
- Includes hospital/clinic header, patient intake demographics, triple-encoded diagnostic triage status, preprocessed fundus photo and Grad-CAM heatmap side-by-side, 4-metric IQA audit table, recommended referral action plan, and clinician signature sign-off.

---

## 3. Screen States & Interaction Workflow

```
[ Landing Page ] ──────────────────────────────────────────┐
      │ (Click "Start Patient Screening")                   │ (Click "Patient Records")
      ▼                                                     ▼
[ Patient Intake Page (Step 1) ]                   [ Clinic Records Page ]
      ├── Demographics (Name, Age, Sex, MRN)         ├── 4 Aggregate Metric Cards
      ├── Target Eye (OD Right, OS Left, OU Both)    ├── Search by Name / MRN
      ├── Clinical History & Clinician               ├── Risk Tier Filters
      └── "Proceed to Fundus Photography"            ├── Data Table with Triple Encoding
            │                                        ├── Inspection Modal (Photo + Heatmap)
            ▼                                        └── Direct PDF Report Download
[ Fundus Upload Page (Step 2) ]
      ├── Active Patient Anchor Banner (with "Edit" action)
      ├── Drag & Drop Zone / Mobile Camera Capture
      ├── Client-Side Validation (<10MB, JPEG/PNG, min 256px)
      └── "Analyze Retinal Image" Action Button
            │
            ▼ (Submits to POST /predict with patient metadata)
[ Analysis Progress State ]
      └── Indeterminate pulse & loader with honest cancellation option
            │
      ┌─────┴────────────────────────────────────────────────┐
      ▼                                                      ▼
[ Result: Rejected State ]                         [ Result: Gradable State ]
  ├── Active Patient Demographics Banner             ├── Active Patient Demographics Banner
  ├── Prominent Retake Alert                         ├── Referable Risk Gauge
  ├── Failed Metrics Highlighted                     ├── Dual-Model Concordance
  ├── 4-Point Retake Checklist                       ├── IQA Quantitative Report
  ├── "Upload Replacement Photo" Action              ├── 5-Stage ICDR Bar Chart
  ├── "Download Clinical PDF" Action                 ├── Interactive Heatmap Viewer
  └── "View in Patient Records" Action               ├── Clinical WhyPanel
                                                     ├── "Download Clinical PDF" Action
                                                     └── "View in Patient Records" Action
```

---

## 4. Frontend Component Architecture

```
frontend/src/
├── components/
│   ├── layout/
│   │   ├── Navbar.jsx                # Brand title, dark/light toggle, API status, Records nav
│   │   └── Disclaimer.jsx            # Clinical decision support notice
│   ├── patient/
│   │   └── PatientIntakeForm.jsx     # Step 1: Patient demographics, eye exam, clinical intake
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
│   └── useScreening.js               # Upload lifecycle & AbortController with patientData
├── lib/
│   ├── api.js                        # Typed fetch wrapper with records & PDF endpoints
│   ├── theme.js                      # WCAG tokens & quality colors
│   ├── utils.js                      # cn() & formatBytes()
│   └── validateImage.js              # Client-side validation utility
└── pages/
    ├── Landing.jsx                   # Overview & stylized vector illustration
    ├── UploadPage.jsx                # Step 2: Active patient banner & fundus upload
    ├── ResultPage.jsx                # Step 3: Patient header, 12-col results, PDF download
    └── RecordsPage.jsx               # Clinical records dashboard, metrics, search & modal
```

---

## 5. Automated Verification Gates

The application enforces automated quality gates:
- **Zero Dead Code:** Vulture passes with zero dead code reported (`vulture app tests --min-confidence 70`).
- **Type Safety:** Backend passes `mypy app tests` with `strict = True` across all 18 source files.
- **Unit & Integration Tests:** Pytest passes 100% of test suites (32 tests passing) including SQLite CRUD, search/filtering, and PDF generation.
- **Clean Linting:** Backend passes `ruff check app tests` with zero warnings.
- **Frontend Compilation:** Vite bundles production assets cleanly with zero warnings (`npm run build`).

---

## 6. Regulatory & Ethical Disclaimer
RetinaScreen AI is an investigational software instrument designed exclusively for clinical decision support and risk awareness. It does not provide definitive medical diagnoses and cannot substitute for dilated biomicroscopy by an ophthalmologist or retina specialist.
