"""Unit tests for the InferenceEngine and CustomDRCNN prediction pipeline."""

import base64

import cv2
import numpy as np
from app.explanations import classify_risk_tier
from app.inference import engine


def test_inference_engine_is_loaded() -> None:
    """Inference engine must report models loaded."""
    assert engine.is_loaded() is True


def test_inference_engine_get_info() -> None:
    """get_info must report CustomDRCNN architecture and input dimensions."""
    info = engine.get_info()
    assert info.models_loaded is True
    assert info.input_size == [224, 224]
    assert info.gradcam_target_layer == "conv5"
    assert "CustomDRCNN" in info.architecture


def test_inference_predict_good_image(good_fundus_bytes: bytes) -> None:
    """Valid fundus image must yield accepted quality and complete prediction result."""
    response = engine.predict(good_fundus_bytes)

    assert response.quality.decision == "accept"
    assert response.result is not None

    # Binary prediction checks
    referable = response.result.referable
    assert 0.0 <= referable.probability <= 1.0
    assert referable.label in ("Referable", "Non-Referable")
    assert referable.tier in ("Low", "Moderate", "High")
    assert 0.0 <= referable.confidence <= 1.0

    # Grade prediction checks
    grade = response.result.grade
    assert 0 <= grade.predicted <= 4
    assert len(grade.probabilities) == 5
    assert round(sum(grade.probabilities), 2) == 1.0
    assert grade.label in ("No DR", "Mild", "Moderate", "Severe", "Proliferative")

    # Images checks
    images = response.result.images
    assert images.preprocessed_png.startswith("data:image/png;base64,")
    assert images.heatmap_referable_png.startswith("data:image/png;base64,")
    assert images.heatmap_grade_png.startswith("data:image/png;base64,")

    def decode_alpha(b64_str: str) -> np.ndarray:
        data = base64.b64decode(b64_str.split(",", 1)[1])
        arr = np.frombuffer(data, np.uint8)
        decoded = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
        assert decoded is not None
        return decoded[:, :, 3]

    ref_alpha = decode_alpha(images.heatmap_referable_png)
    grade_alpha = decode_alpha(images.heatmap_grade_png)

    assert ref_alpha.shape == (224, 224)
    assert grade_alpha.shape == (224, 224)
    assert grade_alpha.max() > 0


def test_inference_predict_proliferative_training_sample() -> None:
    """Canonical test case 262ad704319c.png (Ground truth: Diagnosis 4 - Proliferative DR)."""
    from pathlib import Path

    sample_path = (
        Path(__file__).resolve().parent.parent.parent
        / "aptos2019-blindness-detection"
        / "train_images"
        / "262ad704319c.png"
    )
    if not sample_path.exists():
        return

    with open(sample_path, "rb") as f:
        img_bytes = f.read()

    response = engine.predict(img_bytes)
    assert response.quality.decision == "accept"
    assert response.result is not None
    assert response.result.grade.predicted == 4
    assert response.result.grade.label == "Proliferative"
    assert response.result.grade.confidence > 0.90
    assert response.result.referable.label == "Referable"


def test_inference_predict_blurred_image(blur_fundus_bytes: bytes) -> None:
    """Blurred fundus image yields advisory reject-recapture decision with diagnostic result."""
    response = engine.predict(blur_fundus_bytes)

    assert response.quality.decision == "reject-recapture"
    assert response.result is not None
    assert len(response.quality.reasons) > 0


def test_classify_risk_tier() -> None:
    """Risk tier threshold classification."""
    assert classify_risk_tier(0.10) == "Low"
    assert classify_risk_tier(0.349) == "Low"
    assert classify_risk_tier(0.35) == "Moderate"
    assert classify_risk_tier(0.50) == "Moderate"
    assert classify_risk_tier(0.65) == "Moderate"
    assert classify_risk_tier(0.651) == "High"
    assert classify_risk_tier(0.99) == "High"
