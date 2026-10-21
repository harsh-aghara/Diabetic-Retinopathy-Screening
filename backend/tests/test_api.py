"""Integration tests for FastAPI endpoints: /health, /model/info, and /predict."""

from app.inference import engine
from app.preprocessing import MAX_UPLOAD_SIZE_BYTES
from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    """GET /health returns 200, status healthy, and models_loaded=True."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["models_loaded"] is True
    assert "version" in data


def test_model_info(client: TestClient) -> None:
    """GET /model/info returns 200 with CustomDRCNN architecture metadata."""
    response = client.get("/model/info")
    assert response.status_code == 200
    data = response.json()
    assert data["models_loaded"] is True
    assert data["input_size"] == [224, 224]
    assert data["gradcam_target_layer"] == "conv5"
    assert "CustomDRCNN" in data["architecture"]


def test_predict_good_image(client: TestClient, good_fundus_bytes: bytes) -> None:
    """POST /predict with valid fundus photo returns 200 with complete screening payload."""
    files = {"file": ("fundus.jpg", good_fundus_bytes, "image/jpeg")}
    response = client.post("/predict", files=files)

    assert response.status_code == 200
    data = response.json()

    assert data["quality"]["decision"] == "accept"
    assert data["result"] is not None

    referable = data["result"]["referable"]
    assert "probability" in referable
    assert referable["label"] in ("Referable", "Non-Referable")
    assert referable["tier"] in ("Low", "Moderate", "High")

    grade = data["result"]["grade"]
    assert 0 <= grade["predicted"] <= 4
    assert len(grade["probabilities"]) == 5

    images = data["result"]["images"]
    assert images["preprocessed_png"].startswith("data:image/png;base64,")
    assert images["heatmap_referable_png"].startswith("data:image/png;base64,")
    assert images["heatmap_grade_png"].startswith("data:image/png;base64,")


def test_predict_rejected_image_returns_200_with_advisory_quality(
    client: TestClient, blur_fundus_bytes: bytes
) -> None:
    """POST /predict with blurry image returns 200 with decision reject-recapture and valid result."""
    files = {"file": ("blurry.jpg", blur_fundus_bytes, "image/jpeg")}
    response = client.post("/predict", files=files)

    assert response.status_code == 200
    data = response.json()

    assert data["quality"]["decision"] == "reject-recapture"
    assert data["result"] is not None
    assert len(data["quality"]["reasons"]) > 0
    assert "grade" in data["result"]


def test_predict_unsupported_format(
    client: TestClient, invalid_format_bytes: bytes
) -> None:
    """POST /predict with BMP format returns 415 unsupported_type."""
    files = {"file": ("test.bmp", invalid_format_bytes, "image/bmp")}
    response = client.post("/predict", files=files)

    assert response.status_code == 415
    data = response.json()
    assert data["detail"]["code"] == "unsupported_type"


def test_predict_image_too_small(client: TestClient, small_image_bytes: bytes) -> None:
    """POST /predict with sub-256px image returns 422 image_too_small."""
    files = {"file": ("tiny.jpg", small_image_bytes, "image/jpeg")}
    response = client.post("/predict", files=files)

    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "image_too_small"


def test_predict_corrupt_file(client: TestClient, corrupt_bytes: bytes) -> None:
    """POST /predict with corrupt byte payload returns 422 undecodable_image."""
    files = {"file": ("corrupt.jpg", corrupt_bytes, "image/jpeg")}
    response = client.post("/predict", files=files)

    assert response.status_code == 422
    data = response.json()
    assert data["detail"]["code"] == "undecodable_image"


def test_predict_file_too_large(client: TestClient) -> None:
    """POST /predict with file > 10MB returns 413 file_too_large."""
    oversized = b"A" * (MAX_UPLOAD_SIZE_BYTES + 50)
    files = {"file": ("large.jpg", oversized, "image/jpeg")}
    response = client.post("/predict", files=files)

    assert response.status_code == 413
    data = response.json()
    assert data["detail"]["code"] == "file_too_large"


def test_predict_model_unavailable(
    client: TestClient, good_fundus_bytes: bytes
) -> None:
    """POST /predict returns 503 if models are unloaded."""
    saved_bi = engine._model_binary
    saved_multi = engine._model_multiclass
    try:
        engine._model_binary = None
        engine._model_multiclass = None

        files = {"file": ("fundus.jpg", good_fundus_bytes, "image/jpeg")}
        response = client.post("/predict", files=files)

        assert response.status_code == 503
        data = response.json()
        assert data["detail"]["code"] == "model_unavailable"
    finally:
        engine._model_binary = saved_bi
        engine._model_multiclass = saved_multi
