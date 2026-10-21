"""Image Quality Assessment (IQA) for Retinal Fundus Photographs.

Rule-based clinical gradability assessment implementing 4 core metrics:
1. Field of View (FOV) ratio: area of retinal disc vs total image frame.
2. Sharpness / Focus: Laplacian variance across the grayscale image.
3. Illumination uniformity: standard deviation of mean luminance across a 3x3 grid.
4. Vessel contrast: Sobel gradient magnitude on the green channel.
"""

from typing import Final, TypedDict

import cv2
import numpy as np


class QualityMetrics(TypedDict):
    """Raw computed metrics for Image Quality Assessment."""

    fov_ratio: float
    sharpness: float
    illumination_var: float
    vessel_contrast: float


FOV_REJECT_THRESHOLD: Final[float] = 0.20
SHARPNESS_REJECT_THRESHOLD: Final[float] = 25.0
ILLUM_VAR_ENHANCE_THRESHOLD: Final[float] = 0.45
CONTRAST_ENHANCE_THRESHOLD: Final[float] = 8.0


def compute_fov_ratio(img_gray: np.ndarray, threshold: int = 10) -> float:
    """Compute the ratio of non-background retinal field-of-view to total frame."""
    mask = img_gray > threshold
    fov_pixels = int(np.sum(mask))
    total_pixels = img_gray.shape[0] * img_gray.shape[1]
    if total_pixels == 0:
        return 0.0
    return float(fov_pixels / total_pixels)


def compute_sharpness(img_gray: np.ndarray) -> float:
    """Compute focus/sharpness metric via Laplacian variance."""
    laplacian: np.ndarray = cv2.Laplacian(img_gray, cv2.CV_64F)
    return float(laplacian.var())


def compute_illumination_uniformity(img_gray: np.ndarray) -> float:
    """Compute illumination uniformity across 3x3 grid zones."""
    h, w = img_gray.shape[:2]
    grid_h, grid_w = h // 3, w // 3
    if grid_h == 0 or grid_w == 0:
        return 0.0

    means: list[float] = []
    for i in range(3):
        for j in range(3):
            patch = img_gray[
                i * grid_h : (i + 1) * grid_h, j * grid_w : (j + 1) * grid_w
            ]
            means.append(float(np.mean(patch)))

    mean_val = float(np.mean(means))
    std_val = float(np.std(means))
    return float(std_val / (mean_val + 1e-6))


def compute_vessel_contrast(img_green: np.ndarray) -> float:
    """Compute vessel visibility and contrast score using Sobel gradient on green channel."""
    sobelx: np.ndarray = cv2.Sobel(img_green, cv2.CV_64F, 1, 0, ksize=3)
    sobely: np.ndarray = cv2.Sobel(img_green, cv2.CV_64F, 0, 1, ksize=3)
    grad_mag: np.ndarray = np.sqrt(sobelx**2 + sobely**2)
    return float(np.mean(grad_mag))


def evaluate_gradability(
    img_bgr: np.ndarray,
) -> tuple[str, QualityMetrics, list[str]]:
    """Composite rule-based IQA scoring and categorization.

    Returns:
        tuple containing:
        - decision: 'accept', 'enhance-then-accept', or 'reject-recapture'
        - metrics: dictionary of measured values
        - reasons: list of plain-language degradation or rejection reasons
    """
    green = img_bgr[:, :, 1]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    fov = round(compute_fov_ratio(gray), 3)
    sharpness = round(compute_sharpness(gray), 1)
    illum_var = round(compute_illumination_uniformity(gray), 3)
    contrast = round(compute_vessel_contrast(green), 2)

    metrics: QualityMetrics = {
        "fov_ratio": fov,
        "sharpness": sharpness,
        "illumination_var": illum_var,
        "vessel_contrast": contrast,
    }

    reasons: list[str] = []

    # Rule-based decision boundaries
    if fov < FOV_REJECT_THRESHOLD:
        reasons.append(
            f"Field of view is severely constricted ({fov:.1%} vs 20.0% minimum); retina is under-exposed or off-center."
        )
    if sharpness < SHARPNESS_REJECT_THRESHOLD:
        reasons.append(
            f"Image sharpness ({sharpness:.1f}) is below diagnostic threshold (25.0 minimum); camera was out of focus or motion blur occurred."
        )

    if reasons:
        return "reject-recapture", metrics, reasons

    # Enhancement boundaries
    if illum_var > ILLUM_VAR_ENHANCE_THRESHOLD:
        reasons.append(
            f"Illumination uniformity index ({illum_var:.2f}) indicates uneven lighting across quadrants (threshold 0.45)."
        )
    if contrast < CONTRAST_ENHANCE_THRESHOLD:
        reasons.append(
            f"Vessel contrast ({contrast:.1f}) is low (threshold 8.0); microvascular structures have reduced visibility."
        )

    if reasons:
        return "enhance-then-accept", metrics, reasons

    return "accept", metrics, []
