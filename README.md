# Diabetic Retinopathy Screening System with Explainable AI (FastAPI + React 18)

Production-grade clinical decision support application for automated Diabetic Retinopathy (DR) screening from retinal fundus photographs. Integrates rule-based Image Quality Assessment (IQA), dual-model `CustomDRCNN` deep convolutional networks, and Gradient-weighted Class Activation Mapping (Grad-CAM) visual explainability with an accessible React 18 frontend.

---

## Architecture & System Overview

```
                      [ Retinal Fundus Photo ]
                                 │
                                 ▼
                     Image Quality Assessment (IQA)
                 ┌───────────────┴───────────────┐
           [ Fails Gate ]                 [ Passes Gate ]
                 │                               │
                 ▼                               ▼
       reject-recapture               Clinical Preprocessing
       (Result: null)            (Crop, CLAHE, Unsharp, ImageNet)
                                                 │
                                 ┌───────────────┴───────────────┐
                                 ▼                               ▼
                      Binary CustomDRCNN               Multiclass CustomDRCNN
                     (Referable vs Non-Ref)           (ICDR Stages 0 through 4)
                                 │                               │
                                 ▼                               ▼
                      Grad-CAM Heatmap (conv5)        Grad-CAM Heatmap (conv5)
                                 └───────────────┬───────────────┘
                                                 ▼
                                     [ Unified JSON Contract ]
                                                 │
                                                 ▼
                                     React 18 HCI Interface
                            (Gauge, IQA Metrics, Heatmap Slider)
```

### 1. Key Capabilities
- **Automated Image Quality Gate (IQA):** Evaluates Field-of-View ratio (`> 0.20`), focus sharpness via Laplacian variance (`> 25.0`), illumination uniformity across a 3×3 grid (`< 0.45`), and green-channel Sobel vessel contrast (`> 8.0`). Rejects blurry/occluded images before inference to protect clinical safety.
- **Dual-Model Deep Learning:**
  - **Binary Model:** Screens for Referable DR (grades 2–4) vs Non-Referable (grades 0–1).
  - **Multiclass Model:** Predicts 5-stage International Clinical Diabetic Retinopathy (ICDR) disease severity (0: No DR, 1: Mild, 2: Moderate, 3: Severe, 4: Proliferative).
  - **Concordance Verification:** Automatically checks whether both models agree on referability.
- **Grad-CAM Visual Heatmaps:** Single-pass forward/backward gradients from the penultimate `conv5` layer produce 224×224 transparent RGBA heatmaps.
- **Human-Centered Interface (HCI):**
  - Interactive client-side opacity slider (0–100%) and view toggles (Overlay, Side-by-Side, Preprocessed, Raw).
  - Triple-encoded risk tiers (Color + Text Badge + Geometric Icon) adhering to WCAG 2.1 AA.
  - Plain-language clinical findings and actionable referral timelines.

---

## Directory Structure

```
Diabetic-Retinopathy-Screening/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             # FastAPI endpoints (/health, /model/info, /predict)
│   │   ├── model.py            # Verbatim CustomDRCNN 5-block CNN architecture
│   │   ├── quality.py          # 4 IQA metrics & evaluate_gradability
│   │   ├── preprocessing.py    # 7-step retinal fundus preprocessing pipeline
│   │   ├── gradcam.py          # Single-pass hook-based Grad-CAM generator
│   │   ├── schemas.py          # Strict Pydantic v2 schemas
│   │   ├── explanations.py     # ICDR grade metadata & referral guidance
│   │   └── inference.py        # Thread-safe dual-model inference engine
│   ├── artifacts/
│   │   ├── checkpoint_binary.pt      # Binary model weights (torch.save dict)
│   │   ├── checkpoint_multiclass.pt  # Multiclass model weights (torch.save dict)
│   │   └── metrics.json              # Model architecture metadata & metrics
│   ├── tests/
│   │   ├── conftest.py               # In-memory synthetic fundus fixtures
│   │   ├── test_quality.py           # Unit tests for IQA boundaries
│   │   ├── test_preprocessing.py     # Unit tests for decoding & validation
│   │   ├── test_inference.py         # Unit tests for prediction & concordance
│   │   └── test_api.py               # Integration tests for all HTTP endpoints
│   ├── mypy.ini                      # Strict static typing configuration
│   ├── pytest.ini                    # Pytest configuration
│   └── requirements.txt              # Pinned Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/               # Navbar & clinical disclaimer
│   │   │   ├── upload/               # ImageDropzone, ImagePreview, CaptureGuidance
│   │   │   ├── results/              # HeatmapViewer, QualityReport, GradeChart, RiskGauge, WhyPanel
│   │   │   └── learn/                # LearnMore educational accordion
│   │   ├── hooks/
│   │   │   └── useScreening.js       # Upload lifecycle & AbortController hook
│   │   ├── lib/
│   │   │   ├── api.js                # Multipart fetch client with ApiError
│   │   │   ├── theme.js              # Triple-encoded tokens & quality colors
│   │   │   ├── utils.js              # cn() & formatBytes()
│   │   │   └── validateImage.js      # Client-side validation (<10MB, min 256px)
│   │   ├── pages/
│   │   │   ├── Landing.jsx           # Retinal screening overview & vector SVG
│   │   │   ├── UploadPage.jsx        # Single-step fundus upload target
│   │   │   └── ResultPage.jsx        # 12-column clinical results workspace
│   │   ├── App.jsx                   # Navigation state orchestrator
│   │   └── main.jsx                  # React DOM mount point
│   ├── package.json
│   └── vite.config.js
├── Makefile                    # Developer workflow automation (install, test, dev, build)
└── README.md
```

---

## Model Weights Setup (Required for Backend & Tests)

The screening backend relies on trained PyTorch weights for the `CustomDRCNN` dual-network pipeline. Because individual checkpoint files are ~197 MB each (exceeding GitHub's 100 MB tracking limit), they are excluded from git tracking via `.gitignore` and must be placed into `backend/artifacts/`.

### Expected Directory Layout

```
Diabetic-Retinopathy-Screening/
└── backend/
    └── artifacts/
        ├── .gitkeep
        ├── metrics.json
        ├── checkpoint_binary.pt       # <-- Place binary model weights here (~196.4 MB)
        └── checkpoint_multiclass.pt   # <-- Place multiclass model weights here (~196.4 MB)
```

| Checkpoint File | Size | Architecture | Purpose in Screening Pipeline |
|---|---|---|---|
| `checkpoint_binary.pt` | ~196.4 MB | `CustomDRCNN(num_classes=2)` | Binary referability triage score (Referable vs. Non-Referable) & Grad-CAM |
| `checkpoint_multiclass.pt` | ~196.4 MB | `CustomDRCNN(num_classes=5)` | 5-stage ICDR disease severity distribution (Stages 0–4) & Grad-CAM |

### Setup Steps for Contributors

1. **Obtain the Checkpoints:**
   - Download `checkpoint_binary.pt` and `checkpoint_multiclass.pt` from the project's [GitHub Releases](https://github.com/harsh-aghara/Diabetic-Retinopathy-Screening/releases) or your team's shared drive.
2. **Place Files in `backend/artifacts/`:**
   ```bash
   # Ensure target directory exists
   mkdir -p backend/artifacts

   # Copy the downloaded files into backend/artifacts/
   cp /path/to/downloads/checkpoint_binary.pt backend/artifacts/
   cp /path/to/downloads/checkpoint_multiclass.pt backend/artifacts/
   ```
3. **Verify Installation:**
   Run the built-in verification check:
   ```bash
   make verify-weights
   ```
   Or run the full test suite to verify model loading and inference:
   ```bash
   make test
   ```

---

## Quickstart & Installation

### Using Make (Recommended)

```bash
# 1. Install all dependencies (backend virtualenv + frontend npm)
make install

# 2. Run test suite & static type checks
make test
make lint

# 3. Launch development servers (in separate terminal tabs)
make dev-backend   # FastAPI server on http://localhost:8000
make dev-frontend  # Vite React on http://localhost:5173

# 4. Build frontend for production
make build
```

### Manual Setup

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run test suite & static type check
pytest -v
mypy app tests

# Launch API server on http://localhost:8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server on http://localhost:5173
npm run dev

# Or build for production
npm run build
```

---

## API Contract

### Error Responses
All error responses return structured details:
```json
{
  "detail": {
    "code": "unsupported_type",
    "message": "Unsupported image format 'BMP'. Only JPEG and PNG fundus photographs are accepted."
  }
}
```

| HTTP Status | Error Code | Trigger Condition |
|---|---|---|
| 413 | `file_too_large` | Uploaded image > 10 MB |
| 415 | `unsupported_type` | File format is not JPEG or PNG |
| 422 | `undecodable_image` | Corrupt or invalid image bitmap |
| 422 | `image_too_small` | Shorter image dimension < 256 px |
| 422 | `image_too_large_pixels` | Image resolution > 50 Megapixels |
| 503 | `model_unavailable` | Screening models unloaded in memory |

### POST /predict
Accepts `multipart/form-data` with one field named `file`.

**Successful Gradable Response (200 OK):**
```json
{
  "quality": {
    "decision": "accept",
    "metrics": {
      "fov_ratio": 0.71,
      "sharpness": 142.3,
      "illumination_var": 0.18,
      "vessel_contrast": 14.6
    },
    "reasons": []
  },
  "result": {
    "referable": {
      "probability": 0.74,
      "label": "Referable",
      "tier": "High",
      "confidence": 0.74
    },
    "grade": {
      "predicted": 2,
      "label": "Moderate",
      "confidence": 0.58,
      "probabilities": [0.05, 0.12, 0.58, 0.17, 0.08]
    },
    "models_agree": true,
    "images": {
      "preprocessed_png": "data:image/png;base64,...",
      "heatmap_referable_png": "data:image/png;base64,...",
      "heatmap_grade_png": "data:image/png;base64,..."
    }
  }
}
```

**Quality Rejected Response (200 OK, result is null):**
```json
{
  "quality": {
    "decision": "reject-recapture",
    "metrics": {
      "fov_ratio": 0.12,
      "sharpness": 8.4,
      "illumination_var": 0.52,
      "vessel_contrast": 4.1
    },
    "reasons": [
      "Image sharpness (8.4) is below diagnostic threshold (25.0 minimum); camera was out of focus or motion blur occurred."
    ]
  },
  "result": null
}
```

---

## Verification & Automated Quality Gates

Every component passes strict automated gates:
1. **Pytest:** 100% test coverage across IQA, preprocessing, inference, and API endpoints (`pytest -v`).
2. **Mypy:** Strict static typing verification with no missing annotations (`mypy app tests` with `strict = True`).
3. **Ruff & Vulture:** Zero linting errors and zero dead code (`ruff check app tests`, `vulture app tests --min-confidence 70`).
4. **Vite Build:** Production bundling with zero compilation warnings (`npm run build`).
5. **Zero Dead Code:** Automated grep verifying zero legacy tabular survey identifiers exist in the repository.

---

## Clinical Disclaimer
This system is an investigational clinical decision support screening tool, not a standalone diagnostic instrument. Predictions indicate statistical risk and must always be verified through comprehensive dilated biomicroscopy by a licensed ophthalmologist or retina specialist.
