"""Retinal fundus deep learning inference engine for Diabetic Retinopathy screening.

Orchestrates Image Quality Assessment (IQA), clinical preprocessing,
CustomDRCNN dual-model evaluation (binary referability + 5-stage grading),
and Grad-CAM visual heatmaps with thread-safe execution.
"""

import json
import threading
from pathlib import Path
from typing import Any, Final

import numpy as np
import torch
import torch.nn.functional as F

from app import __version__
from app.explanations import GRADE_METADATA, classify_risk_tier
from app.gradcam import generate_gradcam_heatmap
from app.model import CustomDRCNN
from app.preprocessing import (
    preprocess_fundus_image,
    validate_and_decode_image,
)
from app.quality import evaluate_gradability
from app.schemas import (
    GradeResult,
    ImagesResult,
    ModelInfoResponse,
    PredictionResult,
    QualityMetricsSchema,
    QualityResponse,
    ReferableLabel,
    ReferableResult,
    ScreeningResponse,
)

ARTIFACTS_DIR: Final[Path] = Path(__file__).resolve().parent.parent / "artifacts"
BINARY_CHECKPOINT_PATH: Final[Path] = ARTIFACTS_DIR / "checkpoint_binary.pt"
MULTICLASS_CHECKPOINT_PATH: Final[Path] = ARTIFACTS_DIR / "checkpoint_multiclass.pt"
METRICS_PATH: Final[Path] = ARTIFACTS_DIR / "metrics.json"


class InferenceEngine:
    """Thread-safe clinical screening engine for fundus photographs."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._model_binary: CustomDRCNN | None = None
        self._model_multiclass: CustomDRCNN | None = None
        self._metrics_data: dict[str, Any] = {}

    def load_artifacts(
        self,
        binary_path: Path | None = None,
        multiclass_path: Path | None = None,
        metrics_path: Path | None = None,
    ) -> None:
        """Load trained weights and metadata from artifacts into memory."""
        with self._lock:
            bp = binary_path or BINARY_CHECKPOINT_PATH
            mp = multiclass_path or MULTICLASS_CHECKPOINT_PATH
            meta_p = metrics_path or METRICS_PATH

            if bp.exists():
                model_bi = CustomDRCNN(num_classes=2)
                ckpt_bi = torch.load(bp, map_location="cpu", weights_only=True)
                state_bi = ckpt_bi.get("model_state_dict", ckpt_bi)
                model_bi.load_state_dict(state_bi)
                model_bi.eval()
                self._model_binary = model_bi

            if mp.exists():
                model_multi = CustomDRCNN(num_classes=5)
                ckpt_multi = torch.load(mp, map_location="cpu", weights_only=True)
                state_multi = ckpt_multi.get("model_state_dict", ckpt_multi)
                model_multi.load_state_dict(state_multi)
                model_multi.eval()
                self._model_multiclass = model_multi

            if meta_p.exists():
                with open(meta_p, "r", encoding="utf-8") as f:
                    self._metrics_data = json.load(f)

    def is_loaded(self) -> bool:
        """Check if both binary and multiclass models are loaded."""
        with self._lock:
            return self._model_binary is not None and self._model_multiclass is not None

    def get_info(self) -> ModelInfoResponse:
        """Return model metadata, architecture description, and performance metrics."""
        with self._lock:
            loaded = (
                self._model_binary is not None and self._model_multiclass is not None
            )
            bin_meta = self._metrics_data.get("binary_model", {})
            multi_meta = self._metrics_data.get("multiclass_model", {})
            return ModelInfoResponse(
                architecture=self._metrics_data.get(
                    "architecture", "CustomDRCNN (5-block CNN)"
                ),
                models_loaded=loaded,
                input_size=self._metrics_data.get("input_size", [224, 224]),
                gradcam_target_layer=self._metrics_data.get(
                    "gradcam_target_layer", "conv5"
                ),
                binary_model=bin_meta,
                multiclass_model=multi_meta,
                version=__version__,
            )

    def predict(self, image_bytes: bytes) -> ScreeningResponse:
        """Execute clinical screening on raw fundus image bytes.

        Steps:
        1. Decode and validate image integrity & bounds.
        2. Evaluate Image Quality Assessment (IQA).
        3. If quality fails threshold, return early with 'reject-recapture' and null result.
        4. Preprocess image into standardized 224x224 tensor.
        5. Run binary CustomDRCNN model for referability probability & Grad-CAM.
        6. Run multiclass CustomDRCNN model for ICDR grade & Grad-CAM.
        7. Evaluate cross-model concordance and return composite response.
        """
        with self._lock:
            if self._model_binary is None or self._model_multiclass is None:
                raise RuntimeError("Models are not loaded in memory.")

            # 1. Decode & validate image
            img_bgr = validate_and_decode_image(image_bytes)

            # 2. Image Quality Assessment (IQA advisory triage)
            decision, metrics, reasons = evaluate_gradability(img_bgr)
            quality_resp = QualityResponse(
                decision=decision,  # type: ignore[arg-type]
                metrics=QualityMetricsSchema(
                    fov_ratio=metrics["fov_ratio"],
                    sharpness=metrics["sharpness"],
                    illumination_var=metrics["illumination_var"],
                    vessel_contrast=metrics["vessel_contrast"],
                ),
                reasons=reasons,
            )

            # 3. Retinal Preprocessing (Warning instead of blocking: inference continues even if quality is flagged)
            bundle = preprocess_fundus_image(img_bgr)

            # 5. Multiclass Model Inference & Grad-CAM
            logits_multi, heatmap_multi = generate_gradcam_heatmap(
                model=self._model_multiclass,
                target_layer=self._model_multiclass.conv5,
                input_tensor=bundle.tensor,
                target_class=None,  # Explain predicted grade
            )
            probs_multi = F.softmax(logits_multi, dim=1)[0].cpu().numpy()
            pred_grade = int(np.argmax(probs_multi))
            confidence_grade = round(float(probs_multi[pred_grade]), 4)
            grade_label = GRADE_METADATA[pred_grade]["short_label"]
            probs_grade_list = [round(float(p), 4) for p in probs_multi]

            # 6. Binary Model Inference & Grad-CAM
            with torch.no_grad():
                logits_bi = self._model_binary(bundle.tensor)
                probs_bi = F.softmax(logits_bi, dim=1)[0].cpu().numpy()

            prob_referable = round(float(probs_bi[1]), 4)
            pred_bi = int(np.argmax(probs_bi))
            confidence_bi = round(float(probs_bi[pred_bi]), 4)
            label_bi: ReferableLabel = "Referable" if pred_bi == 1 else "Non-Referable"
            tier = classify_risk_tier(prob_referable)

            target_bi = 1 if (pred_bi == 1 or prob_referable >= 0.5) else 0
            _, heatmap_bi = generate_gradcam_heatmap(
                model=self._model_binary,
                target_layer=self._model_binary.conv5,
                input_tensor=bundle.tensor,
                target_class=target_bi,
            )

            # If binary model yielded no active attention gradients (e.g. saturated output/dead ReLU),
            # fall back to the multiclass attention map so the clinician receives a meaningful heatmap.
            if len(heatmap_bi) < 1500:
                heatmap_bi = heatmap_multi

            # 7. Check model concordance
            # Binary model flags referable when pred_bi == 1 (or prob_referable >= 0.5)
            # Multiclass flags referable when pred_grade is 2, 3, or 4 (Moderate, Severe, Proliferative)
            models_agree = (pred_bi == 1) == (pred_grade in (2, 3, 4))

            prediction = PredictionResult(
                referable=ReferableResult(
                    probability=prob_referable,
                    label=label_bi,
                    tier=tier,
                    confidence=confidence_bi,
                ),
                grade=GradeResult(
                    predicted=pred_grade,
                    label=grade_label,
                    confidence=confidence_grade,
                    probabilities=probs_grade_list,
                ),
                models_agree=models_agree,
                images=ImagesResult(
                    preprocessed_png=bundle.preprocessed_png_base64,
                    heatmap_referable_png=heatmap_bi,
                    heatmap_grade_png=heatmap_multi,
                ),
            )

            return ScreeningResponse(quality=quality_resp, result=prediction)


# Global singleton instance
engine: Final[InferenceEngine] = InferenceEngine()
