"""Retinal fundus image decoding, validation, and clinical preprocessing pipeline."""

import base64
import io
from typing import Final, NamedTuple

import cv2
import numpy as np
import torch
from PIL import Image

MAX_UPLOAD_SIZE_BYTES: Final[int] = 10 * 1024 * 1024  # 10 MB
MIN_IMAGE_SIDE_PX: Final[int] = 256
MAX_IMAGE_PIXELS: Final[int] = 50_000_000  # 50 Megapixels

IMAGENET_MEAN: Final[list[float]] = [0.485, 0.456, 0.406]
IMAGENET_STD: Final[list[float]] = [0.229, 0.224, 0.225]


class ImageValidationError(Exception):
    """Raised when an uploaded image fails validation."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


class ProcessedImageBundle(NamedTuple):
    """Container holding raw BGR array, preprocessed RGB array, normalized tensor, and base64 PNG."""

    raw_bgr: np.ndarray
    preprocessed_rgb: np.ndarray
    tensor: torch.Tensor
    preprocessed_png_base64: str


def validate_and_decode_image(data: bytes) -> np.ndarray:
    """Validate image bytes and decode into a BGR numpy array.

    Raises:
        ImageValidationError: for size violations, unsupported format, or corrupt data.
    """
    if len(data) > MAX_UPLOAD_SIZE_BYTES:
        raise ImageValidationError(
            code="file_too_large",
            message=f"Uploaded file exceeds maximum permitted size of 10 MB ({len(data) / (1024 * 1024):.1f} MB received).",
        )

    # Use Pillow to inspect format and header safety
    try:
        with Image.open(io.BytesIO(data)) as pil_img:
            format_name = pil_img.format
            w, h = pil_img.size

            if format_name not in ("JPEG", "PNG"):
                raise ImageValidationError(
                    code="unsupported_type",
                    message=f"Unsupported image format '{format_name}'. Only JPEG and PNG fundus photographs are accepted.",
                )

            if w * h > MAX_IMAGE_PIXELS:
                raise ImageValidationError(
                    code="image_too_large_pixels",
                    message=f"Image resolution ({w}x{h} = {w * h:,} pixels) exceeds the 50 megapixel safety limit.",
                )

            if min(w, h) < MIN_IMAGE_SIDE_PX:
                raise ImageValidationError(
                    code="image_too_small",
                    message=f"Image dimensions ({w}x{h}) are too small for diagnostic screening; shortest side must be at least {MIN_IMAGE_SIDE_PX} pixels.",
                )
    except ImageValidationError:
        raise
    except Exception as exc:
        raise ImageValidationError(
            code="undecodable_image",
            message="Image bytes could not be decoded. The file may be corrupt or not a valid image.",
        ) from exc

    # Decode image in-memory to BGR
    np_arr = np.frombuffer(data, dtype=np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ImageValidationError(
            code="undecodable_image",
            message="OpenCV could not decode image bitmap from provided bytes.",
        )

    return img_bgr


def crop_fov_circle(img: np.ndarray) -> np.ndarray:
    """Crop circular fundus bounding box using luminance threshold."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 10, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if contours:
        c = max(contours, key=cv2.contourArea)
        x, y, w, h = cv2.boundingRect(c)
        return img[y : y + h, x : x + w]
    return img


def pad_aspect_preserve(
    img: np.ndarray, target_size: tuple[int, int] = (512, 512)
) -> np.ndarray:
    """Resize maintaining aspect ratio and zero-pad to canonical canvas."""
    h, w = img.shape[:2]
    target_w, target_h = target_size
    scale = min(target_w / w, target_h / h)
    nw, nh = int(w * scale), int(h * scale)

    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_AREA)
    canvas = np.zeros(
        (target_h, target_w, 3) if img.ndim == 3 else (target_h, target_w),
        dtype=np.uint8,
    )

    top = (target_h - nh) // 2
    left = (target_w - nw) // 2
    canvas[top : top + nh, left : left + nw] = resized
    return canvas


def apply_ben_graham(img: np.ndarray, sigma: int = 10) -> np.ndarray:
    """Ben Graham's method: subtract local Gaussian average to normalize illumination."""
    blur = cv2.GaussianBlur(img, (0, 0), sigma)
    return cv2.addWeighted(img, 4, blur, -4, 128)


def apply_clahe(img: np.ndarray) -> np.ndarray:
    """Apply CLAHE on the L-channel in LAB color space."""
    if img.ndim == 2:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(img)
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    cl = clahe.apply(l)
    limg = cv2.merge((cl, a, b))
    return cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)


def correct_illumination(img: np.ndarray) -> np.ndarray:
    """Large-kernel Gaussian background subtraction for illumination correction."""
    background = cv2.GaussianBlur(img, (0, 0), 30)
    return cv2.addWeighted(img, 1.5, background, -0.5, 0)


def normalize_color(img: np.ndarray) -> np.ndarray:
    """Per-channel mean-variance color normalization."""
    result = img.astype(np.float32)
    if img.ndim == 3:
        for i in range(img.shape[2]):
            channel = result[:, :, i]
            mean, std = float(np.mean(channel)), float(np.std(channel))
            if std > 0:
                result[:, :, i] = (channel - mean) / std * 50 + 128
    else:
        mean, std = float(np.mean(result)), float(np.std(result))
        if std > 0:
            result = (result - mean) / std * 50 + 128
    return np.clip(result, 0, 255).astype(np.uint8)


def crop_fundus_circle(img_rgb: np.ndarray, tol: int = 7) -> np.ndarray:
    """Crop black non-retinal boundary borders surrounding the fundus circle."""
    if img_rgb.ndim == 2:
        mask = img_rgb > tol
        return img_rgb[np.ix_(mask.any(1), mask.any(0))]
    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    mask = gray > tol
    check_any = mask.any(axis=1)
    if not check_any.any():
        return img_rgb

    return img_rgb[np.ix_(mask.any(axis=1), mask.any(axis=0))]


def preprocess_fundus_image(img_bgr: np.ndarray) -> ProcessedImageBundle:
    """Run the complete two-stage clinical preprocessing pipeline.

    Stage 1 (notebooks/preprosessor.ipynb):
    - Crop FOV circle
    - Median blur noise reduction (3x3)
    - Gaussian illumination correction
    - Ben Graham local contrast enhancement
    - LAB CLAHE
    - Per-channel color normalization
    - Aspect-preserving pad to 512x512

    Stage 2 (notebooks/code2_2.ipynb):
    - BGR to RGB conversion
    - Circular fundus FOV border cropping
    - Gaussian blur (3x3)
    - Green channel CLAHE (clip=2.0, tile=(8,8))
    - Unsharp masking
    - Resize to 224x224
    - Normalization [0, 1] followed by ImageNet mean/std standardization
    """
    # Early resolution management for very large images (prevents RAM spikes)
    max_dim = max(img_bgr.shape[:2])
    if max_dim > 1024:
        scale = 1024.0 / max_dim
        img_bgr = cv2.resize(
            img_bgr,
            (int(img_bgr.shape[1] * scale), int(img_bgr.shape[0] * scale)),
            interpolation=cv2.INTER_AREA,
        )

    # Stage 1: Dataset Preprocessing Pipeline
    out = img_bgr.copy()
    out = crop_fov_circle(out)
    out = cv2.medianBlur(out, 3)
    out = correct_illumination(out)
    out = apply_ben_graham(out)
    out = apply_clahe(out)
    out = normalize_color(out)
    out = pad_aspect_preserve(out, (512, 512))

    # Stage 2: In-Memory Model Preprocessing
    img_rgb = cv2.cvtColor(out, cv2.COLOR_BGR2RGB)
    img_cropped = crop_fundus_circle(img_rgb)
    blurred = cv2.GaussianBlur(img_cropped, (3, 3), 0)

    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    enhanced = blurred.copy()
    enhanced[:, :, 1] = clahe.apply(enhanced[:, :, 1])

    gaussian = cv2.GaussianBlur(enhanced, (0, 0), 2.0)
    sharpened = cv2.addWeighted(enhanced, 1.5, gaussian, -0.5, 0)
    preprocessed_rgb = cv2.resize(sharpened, (224, 224), interpolation=cv2.INTER_AREA)

    # Encode preprocessed RGB as base64 PNG data URL
    preprocessed_bgr = cv2.cvtColor(preprocessed_rgb, cv2.COLOR_RGB2BGR)
    success, buffer = cv2.imencode(".png", preprocessed_bgr)
    if not success:
        raise RuntimeError("Failed to encode preprocessed image to PNG format.")
    png_b64 = "data:image/png;base64," + base64.b64encode(buffer).decode("ascii")

    # Stage 3: Normalize [0, 1] and standardize via ImageNet mean/std
    img_norm = preprocessed_rgb.astype(np.float32) / 255.0
    tensor = torch.tensor(img_norm, dtype=torch.float32).permute(
        2, 0, 1
    )  # (3, 224, 224)

    mean_tensor = torch.tensor(IMAGENET_MEAN, dtype=torch.float32).view(3, 1, 1)
    std_tensor = torch.tensor(IMAGENET_STD, dtype=torch.float32).view(3, 1, 1)
    standardized_tensor = (tensor - mean_tensor) / std_tensor
    tensor_batch = standardized_tensor.unsqueeze(0)  # (1, 3, 224, 224)

    return ProcessedImageBundle(
        raw_bgr=img_bgr,
        preprocessed_rgb=preprocessed_rgb,
        tensor=tensor_batch,
        preprocessed_png_base64=png_b64,
    )
