"""Unit tests for retinal image validation and clinical preprocessing."""

import numpy as np
import pytest
from app.preprocessing import (
    MAX_UPLOAD_SIZE_BYTES,
    ImageValidationError,
    crop_fundus_circle,
    preprocess_fundus_image,
    validate_and_decode_image,
)


def test_validate_and_decode_image_valid(good_fundus_bytes: bytes) -> None:
    """Valid JPEG bytes decode into a 3-channel BGR numpy array."""
    bgr = validate_and_decode_image(good_fundus_bytes)
    assert isinstance(bgr, np.ndarray)
    assert bgr.ndim == 3
    assert bgr.shape[2] == 3


def test_validate_and_decode_unsupported_format(invalid_format_bytes: bytes) -> None:
    """BMP or non-JPEG/PNG format raises unsupported_type."""
    with pytest.raises(ImageValidationError) as exc_info:
        validate_and_decode_image(invalid_format_bytes)
    assert exc_info.value.code == "unsupported_type"


def test_validate_and_decode_undecodable(corrupt_bytes: bytes) -> None:
    """Garbage bytes raise undecodable_image."""
    with pytest.raises(ImageValidationError) as exc_info:
        validate_and_decode_image(corrupt_bytes)
    assert exc_info.value.code == "undecodable_image"


def test_validate_and_decode_too_small(small_image_bytes: bytes) -> None:
    """Image with dimension below 256px raises image_too_small."""
    with pytest.raises(ImageValidationError) as exc_info:
        validate_and_decode_image(small_image_bytes)
    assert exc_info.value.code == "image_too_small"


def test_validate_and_decode_too_large() -> None:
    """Bytes exceeding 10MB raise file_too_large."""
    oversized = b"0" * (MAX_UPLOAD_SIZE_BYTES + 10)
    with pytest.raises(ImageValidationError) as exc_info:
        validate_and_decode_image(oversized)
    assert exc_info.value.code == "file_too_large"


def test_crop_fundus_circle() -> None:
    """Fundus circle crop removes surrounding black borders."""
    canvas = np.zeros((400, 400, 3), dtype=np.uint8)
    canvas[100:300, 100:300] = 200  # Central square
    cropped = crop_fundus_circle(canvas, tol=7)

    assert cropped.shape[0] == 200
    assert cropped.shape[1] == 200


def test_preprocess_fundus_image(good_fundus_bytes: bytes) -> None:
    """Preprocessing outputs standardized 224x224 RGB, tensor, and base64 PNG."""
    bgr = validate_and_decode_image(good_fundus_bytes)
    bundle = preprocess_fundus_image(bgr)

    assert bundle.preprocessed_rgb.shape == (224, 224, 3)
    assert bundle.tensor.shape == (1, 3, 224, 224)
    assert bundle.preprocessed_png_base64.startswith("data:image/png;base64,")
