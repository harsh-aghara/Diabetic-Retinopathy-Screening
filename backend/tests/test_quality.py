"""Unit tests for Image Quality Assessment (IQA) functions."""

import cv2
import numpy as np
from app.quality import (
    compute_fov_ratio,
    compute_illumination_uniformity,
    compute_sharpness,
    compute_vessel_contrast,
    evaluate_gradability,
)


def test_compute_fov_ratio() -> None:
    """Test FOV ratio calculation on black vs filled images."""
    black = np.zeros((100, 100), dtype=np.uint8)
    assert compute_fov_ratio(black) == 0.0

    filled = np.full((100, 100), 200, dtype=np.uint8)
    assert compute_fov_ratio(filled) == 1.0

    half = np.zeros((100, 100), dtype=np.uint8)
    half[:50, :] = 200
    assert compute_fov_ratio(half) == 0.5


def test_compute_sharpness() -> None:
    """Sharp image must yield substantially higher Laplacian variance than blurred."""
    sharp = np.zeros((200, 200), dtype=np.uint8)
    for i in range(0, 200, 10):
        sharp[i : i + 5, :] = 255

    blurred = cv2.GaussianBlur(sharp, (25, 25), 0)

    sharp_score = compute_sharpness(sharp)
    blurred_score = compute_sharpness(blurred)

    assert sharp_score > blurred_score
    assert blurred_score < 25.0


def test_compute_illumination_uniformity() -> None:
    """Uniform image must have low variance index; gradient image must have high."""
    uniform = np.full((300, 300), 128, dtype=np.uint8)
    uniform_score = compute_illumination_uniformity(uniform)
    assert uniform_score < 0.05

    gradient = np.zeros((300, 300), dtype=np.uint8)
    for i in range(300):
        gradient[i, :] = int(i * 255 / 300)
    gradient_score = compute_illumination_uniformity(gradient)
    assert gradient_score > uniform_score


def test_compute_vessel_contrast() -> None:
    """High-contrast line patterns must produce higher Sobel magnitude than flat areas."""
    flat = np.full((100, 100), 100, dtype=np.uint8)
    lines = flat.copy()
    lines[50, :] = 255
    lines[:, 50] = 0

    assert compute_vessel_contrast(lines) > compute_vessel_contrast(flat)


def test_evaluate_gradability_accept() -> None:
    """Well-formed fundus image must be triaged as 'accept' with no reasons."""
    img: np.ndarray = np.zeros((320, 320, 3), dtype=np.uint8)
    cv2.circle(img, (160, 160), 140, (30, 80, 200), -1)
    # Add texture
    np.random.seed(42)
    noise: np.ndarray = np.random.randint(0, 40, (320, 320, 3), dtype=np.uint8)
    img = cv2.add(img, noise)

    decision, metrics, reasons = evaluate_gradability(img)
    assert decision == "accept"
    assert metrics["fov_ratio"] > 0.50
    assert metrics["sharpness"] >= 25.0
    assert len(reasons) == 0


def test_evaluate_gradability_reject_sharpness() -> None:
    """Blurry image must be rejected for recapture."""
    img = np.zeros((320, 320, 3), dtype=np.uint8)
    cv2.circle(img, (160, 160), 140, (30, 80, 200), -1)
    blurred = cv2.GaussianBlur(img, (35, 35), 0)

    decision, metrics, reasons = evaluate_gradability(blurred)
    assert decision == "reject-recapture"
    assert metrics["sharpness"] < 25.0
    assert any("sharpness" in r.lower() for r in reasons)


def test_evaluate_gradability_reject_fov() -> None:
    """Tiny visible field must be rejected for recapture."""
    img = np.zeros((320, 320, 3), dtype=np.uint8)
    cv2.circle(img, (160, 160), 20, (30, 80, 200), -1)

    decision, metrics, reasons = evaluate_gradability(img)
    assert decision == "reject-recapture"
    assert metrics["fov_ratio"] < 0.20
    assert any("field of view" in r.lower() for r in reasons)
