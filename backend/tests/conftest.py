"""Pytest test configuration and fixtures for DR screening test suites."""

import io
from collections.abc import Generator

import cv2
import numpy as np
import pytest
import torch
from app.inference import engine
from app.main import app
from app.model import CustomDRCNN
from fastapi.testclient import TestClient
from PIL import Image


def create_synthetic_fundus_image(
    variant: str = "good", width: int = 320, height: int = 320
) -> bytes:
    """Generate in-memory synthetic fundus image bytes for testing."""
    img: np.ndarray = np.zeros((height, width, 3), dtype=np.uint8)
    center = (width // 2, height // 2)

    if variant == "good":
        # Draw healthy retinal circle
        radius = int(min(width, height) * 0.45)
        cv2.circle(img, center, radius, (20, 80, 200), -1)
        # Optic disc
        disc_center = (int(width * 0.35), height // 2)
        cv2.circle(img, disc_center, 25, (80, 180, 240), -1)
        # Retinal vessels
        for i in range(12):
            cv2.line(
                img,
                disc_center,
                (int(width * 0.8), int(height * 0.15) + i * 20),
                (10, 30, 90),
                2,
            )
        # Texture inside retinal circle
        mask: np.ndarray = np.zeros((height, width), dtype=np.uint8)
        cv2.circle(mask, center, radius, 255, -1)
        np.random.seed(42)
        noise: np.ndarray = np.random.randint(0, 30, (height, width, 3), dtype=np.uint8)
        noise = cv2.bitwise_and(noise, noise, mask=mask)
        img = cv2.add(img, noise)

    elif variant == "blur":
        # Blur variant: low Laplacian sharpness
        radius = int(min(width, height) * 0.45)
        cv2.circle(img, center, radius, (20, 80, 200), -1)
        img = cv2.GaussianBlur(img, (31, 31), 0)

    elif variant == "fov_reject":
        # Tiny circle < 20% FOV
        cv2.circle(img, center, 20, (20, 80, 200), -1)

    elif variant == "enhance":
        # Low vessel contrast
        radius = int(min(width, height) * 0.45)
        cv2.circle(img, center, radius, (50, 100, 180), -1)

    _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 95])
    return bytes(buf)


@pytest.fixture(scope="session", autouse=True)
def initialize_test_models() -> Generator[None, None, None]:
    """Ensure engine is loaded with initialized models for tests."""
    if not engine.is_loaded():
        # Initialize synthetic models if checkpoint files are missing
        torch.manual_seed(42)
        m_bi = CustomDRCNN(num_classes=2)
        m_bi.eval()
        m_multi = CustomDRCNN(num_classes=5)
        m_multi.eval()
        engine._model_binary = m_bi
        engine._model_multiclass = m_multi
        engine._metrics_data = {
            "architecture": "CustomDRCNN",
            "input_size": [224, 224],
            "gradcam_target_layer": "conv5",
        }
    else:
        engine.load_artifacts()
    yield


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Pytest fixture yielding FastAPI TestClient."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def good_fundus_bytes() -> bytes:
    """Valid fundus photograph passing IQA."""
    return create_synthetic_fundus_image("good")


@pytest.fixture
def blur_fundus_bytes() -> bytes:
    """Out-of-focus fundus photograph failing sharpness IQA."""
    return create_synthetic_fundus_image("blur")


@pytest.fixture
def fov_reject_bytes() -> bytes:
    """Fundus photograph with insufficient FOV area (<20%)."""
    return create_synthetic_fundus_image("fov_reject")


@pytest.fixture
def enhance_fundus_bytes() -> bytes:
    """Fundus photograph requiring enhancement (borderline contrast)."""
    return create_synthetic_fundus_image("enhance")


@pytest.fixture
def small_image_bytes() -> bytes:
    """Image with dimension below 256px minimum."""
    return create_synthetic_fundus_image("good", width=128, height=128)


@pytest.fixture
def invalid_format_bytes() -> bytes:
    """Valid image in BMP format, which is not permitted."""
    img = Image.new("RGB", (300, 300), color=(200, 100, 50))
    buf = io.BytesIO()
    img.save(buf, format="BMP")
    return buf.getvalue()


@pytest.fixture
def corrupt_bytes() -> bytes:
    """Arbitrary undecodable byte sequence."""
    return b"\x00\x01\x02\x03CORRUPT_NOT_AN_IMAGE_DATA_HEADER"
