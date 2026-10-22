"""Tests for SQLite Clinical Records and PDF Report Generation endpoints."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import pytest
from app.db import init_db, set_db_path
from app.main import app
from fastapi.testclient import TestClient
from PIL import Image


@pytest.fixture(autouse=True)
def setup_test_db(tmp_path: Path) -> Any:
    """Isolate SQLite database to a temporary file for each test."""
    db_file = tmp_path / "test_screening.db"
    set_db_path(db_file)
    init_db(db_file)
    yield
    # Cleanup if needed
    if db_file.exists():
        db_file.unlink()


def create_synthetic_fundus_bytes(color: tuple[int, int, int] = (180, 80, 30)) -> bytes:
    """Generate synthetic 256x256 RGB image with retinal disk."""
    img = Image.new("RGB", (256, 256), color=(5, 5, 5))
    from PIL import ImageDraw

    draw = ImageDraw.Draw(img)
    draw.ellipse([20, 20, 236, 236], fill=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def test_predict_with_patient_intake_stores_in_db() -> None:
    """Test that submitting patient info alongside fundus photo persists to SQLite."""
    img_bytes = create_synthetic_fundus_bytes()

    with TestClient(app) as client:
        response = client.post(
            "/predict",
            files={"file": ("retina_test.jpg", img_bytes, "image/jpeg")},
            data={
                "patient_name": "Arthur Dent",
                "patient_age": "42",
                "patient_gender": "Male",
                "patient_id": "MRN-4200",
                "eye_examined": "Right Eye (OD)",
                "diabetes_type": "Type 2",
                "diabetes_duration": "5",
                "doctor_name": "Dr. McCoy",
                "clinical_notes": "Routine diabetic fundus screening.",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert "quality" in data
        assert data.get("record_id") is not None
        assert data.get("patient_id") == "MRN-4200"

        record_id = data["record_id"]

        # Check records list
        rec_list_resp = client.get("/records")
        assert rec_list_resp.status_code == 200
        records = rec_list_resp.json()
        assert len(records) >= 1
        matching = [r for r in records if r["id"] == record_id]
        assert len(matching) == 1
        assert matching[0]["name"] == "Arthur Dent"
        assert matching[0]["patient_id"] == "MRN-4200"
        assert matching[0]["age"] == 42
        assert matching[0]["gender"] == "Male"
        assert matching[0]["eye_examined"] == "Right Eye (OD)"

        # Check stats
        stats_resp = client.get("/records/stats")
        assert stats_resp.status_code == 200
        stats = stats_resp.json()
        assert stats["total_screenings"] >= 1

        # Check single record detail
        detail_resp = client.get(f"/records/{record_id}")
        assert detail_resp.status_code == 200
        detail = detail_resp.json()
        assert detail["doctor_name"] == "Dr. McCoy"
        assert detail["clinical_notes"] == "Routine diabetic fundus screening."
        assert detail["diabetes_type"] == "Type 2"
        assert detail["fov_ratio"] > 0

        # Check PDF download
        pdf_resp = client.get(f"/records/{record_id}/pdf")
        assert pdf_resp.status_code == 200
        assert pdf_resp.headers["content-type"] == "application/pdf"
        assert pdf_resp.content.startswith(b"%PDF-1.4")
        assert len(pdf_resp.content) > 1000

        # Check delete
        del_resp = client.delete(f"/records/{record_id}")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "deleted"

        # Check 404 after delete
        not_found_resp = client.get(f"/records/{record_id}")
        assert not_found_resp.status_code == 404


def test_records_search_and_filter() -> None:
    """Test search query and tier filtering on records endpoint."""
    img_bytes = create_synthetic_fundus_bytes()

    with TestClient(app) as client:
        # Submit two patients
        client.post(
            "/predict",
            files={"file": ("p1.jpg", img_bytes, "image/jpeg")},
            data={"patient_name": "Alice Walker", "patient_id": "AW-100", "patient_age": "35"},
        )
        client.post(
            "/predict",
            files={"file": ("p2.jpg", img_bytes, "image/jpeg")},
            data={"patient_name": "Bob Vance", "patient_id": "BV-200", "patient_age": "60"},
        )

        # Search by name
        res_alice = client.get("/records?search=Alice")
        assert res_alice.status_code == 200
        names = [r["name"] for r in res_alice.json()]
        assert "Alice Walker" in names
        assert "Bob Vance" not in names

        # Search by MRN
        res_mrn = client.get("/records?search=BV-200")
        assert res_mrn.status_code == 200
        mrns = [r["patient_id"] for r in res_mrn.json()]
        assert "BV-200" in mrns
        assert "AW-100" not in mrns


def test_ad_hoc_pdf_generation() -> None:
    """Test POST /reports/pdf for immediate client-side PDF generation."""
    with TestClient(app) as client:
        payload = {
            "patient": {
                "name": "Clara Oswald",
                "patient_id": "CO-7788",
                "age": 29,
                "gender": "Female",
                "eye_examined": "Left Eye (OS)",
                "diabetes_type": "Type 1",
                "diabetes_duration": 4,
                "doctor_name": "Dr. Who",
                "clinical_notes": "No microaneurysms detected on exam.",
            },
            "screening": {
                "quality": {
                    "decision": "accept",
                    "metrics": {
                        "fov_ratio": 0.78,
                        "sharpness": 55.2,
                        "illumination_var": 0.22,
                        "vessel_contrast": 18.5,
                    },
                    "reasons": [],
                },
                "result": {
                    "referable": {
                        "probability": 0.08,
                        "label": "Non-Referable",
                        "tier": "Low",
                        "confidence": 0.92,
                    },
                    "grade": {
                        "predicted": 0,
                        "label": "No Apparent Diabetic Retinopathy",
                        "confidence": 0.96,
                        "probabilities": [0.96, 0.02, 0.01, 0.005, 0.005],
                    },
                    "models_agree": True,
                    "images": {
                        "preprocessed_png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                        "heatmap_referable_png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                        "heatmap_grade_png": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    },
                },
            },
        }

        resp = client.post("/reports/pdf", json=payload)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF-1.4")
        assert len(resp.content) > 1000
