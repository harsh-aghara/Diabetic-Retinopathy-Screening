"""SQLite Database Storage and Clinical Records Repository for Diabetic Retinopathy Screening."""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from collections.abc import Generator
from contextlib import contextmanager
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

# Default database path in backend/data/screening.db
DEFAULT_DB_DIR = Path(__file__).resolve().parent.parent / "data"
DEFAULT_DB_PATH = DEFAULT_DB_DIR / "screening.db"

_CURRENT_DB_PATH: Path = DEFAULT_DB_PATH


def set_db_path(path: Path | str) -> None:
    """Set the active SQLite database path (useful for testing)."""
    global _CURRENT_DB_PATH
    _CURRENT_DB_PATH = Path(path)


def get_db_path() -> Path:
    """Return the active SQLite database path."""
    db_env = os.environ.get("SCREENING_DB_PATH")
    if db_env:
        return Path(db_env)
    return _CURRENT_DB_PATH


@contextmanager
def get_db_connection() -> Generator[sqlite3.Connection, None, None]:
    """Provide a transactional SQLite database connection with row factory."""
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(db_path: Path | str | None = None) -> None:
    """Initialize database tables and indices."""
    if db_path is not None:
        set_db_path(db_path)

    with get_db_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS patients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                age INTEGER NOT NULL,
                gender TEXT NOT NULL,
                contact TEXT,
                diabetes_type TEXT,
                diabetes_duration INTEGER,
                eye_examined TEXT,
                doctor_name TEXT,
                clinical_notes TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS screening_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                quality_decision TEXT NOT NULL,
                quality_reasons TEXT NOT NULL,
                fov_ratio REAL NOT NULL,
                sharpness REAL NOT NULL,
                illumination_var REAL NOT NULL,
                vessel_contrast REAL NOT NULL,
                referable_probability REAL,
                referable_label TEXT,
                referable_tier TEXT,
                referable_confidence REAL,
                grade_predicted INTEGER,
                grade_label TEXT,
                grade_confidence REAL,
                grade_probabilities TEXT,
                models_agree INTEGER,
                preprocessed_image TEXT,
                heatmap_image TEXT,
                original_filename TEXT,
                notes TEXT,
                FOREIGN KEY(patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_records_patient_id ON screening_records(patient_id);
            CREATE INDEX IF NOT EXISTS idx_records_created_at ON screening_records(created_at DESC);
            CREATE INDEX IF NOT EXISTS idx_records_referable_tier ON screening_records(referable_tier);
            """
        )


def save_screening_record(
    patient_data: dict[str, Any],
    screening_result: dict[str, Any],
    original_filename: str = "retinal_image.jpg",
) -> int:
    """Persist patient demographic intake and screening outcome.

    Returns the inserted screening record ID.
    """
    now_iso = datetime.now(UTC).isoformat()
    patient_id = str(patient_data.get("patient_id") or f"PT-{datetime.now(UTC).strftime('%Y%m')}-{uuid.uuid4().hex[:12].upper()}")
    name = str(patient_data.get("name", "Anonymous Patient")).strip()
    age = int(patient_data.get("age", 0))
    gender = str(patient_data.get("gender", "Unknown"))
    contact = patient_data.get("contact")
    diabetes_type = patient_data.get("diabetes_type")
    diabetes_duration = patient_data.get("diabetes_duration")
    eye_examined = patient_data.get("eye_examined")
    doctor_name = patient_data.get("doctor_name")
    clinical_notes = patient_data.get("clinical_notes")

    quality = screening_result.get("quality", {})
    quality_decision = str(quality.get("decision", "accept"))
    quality_reasons = json.dumps(quality.get("reasons", []))
    metrics = quality.get("metrics", {})
    fov_ratio = float(metrics.get("fov_ratio", 0.0))
    sharpness = float(metrics.get("sharpness", 0.0))
    illumination_var = float(metrics.get("illumination_var", 0.0))
    vessel_contrast = float(metrics.get("vessel_contrast", 0.0))

    result = screening_result.get("result")
    referable_prob = None
    referable_label = None
    referable_tier = None
    referable_conf = None
    grade_pred = None
    grade_lbl = None
    grade_conf = None
    grade_probs_str = None
    models_agree_int = None
    preprocessed_img = None
    heatmap_img = None

    if result:
        referable = result.get("referable", {})
        referable_prob = float(referable.get("probability", 0.0))
        referable_label = str(referable.get("label", ""))
        referable_tier = str(referable.get("tier", "Low"))
        referable_conf = float(referable.get("confidence", 0.0))

        grade = result.get("grade", {})
        grade_pred = int(grade.get("predicted", 0))
        grade_lbl = str(grade.get("label", ""))
        grade_conf = float(grade.get("confidence", 0.0))
        grade_probs_str = json.dumps(grade.get("probabilities", []))

        models_agree_int = 1 if result.get("models_agree") else 0

        images = result.get("images", {})
        preprocessed_img = images.get("preprocessed_png")
        heatmap_img = images.get("heatmap_referable_png") or images.get("heatmap_grade_png")

    with get_db_connection() as conn:
        # Insert or update patient
        conn.execute(
            """
            INSERT INTO patients (
                patient_id, name, age, gender, contact, diabetes_type,
                diabetes_duration, eye_examined, doctor_name, clinical_notes,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(patient_id) DO UPDATE SET
                name = excluded.name,
                age = excluded.age,
                gender = excluded.gender,
                contact = COALESCE(excluded.contact, patients.contact),
                diabetes_type = COALESCE(excluded.diabetes_type, patients.diabetes_type),
                diabetes_duration = COALESCE(excluded.diabetes_duration, patients.diabetes_duration),
                eye_examined = COALESCE(excluded.eye_examined, patients.eye_examined),
                doctor_name = COALESCE(excluded.doctor_name, patients.doctor_name),
                clinical_notes = COALESCE(excluded.clinical_notes, patients.clinical_notes),
                updated_at = excluded.updated_at;
            """,
            (
                patient_id,
                name,
                age,
                gender,
                contact,
                diabetes_type,
                diabetes_duration,
                eye_examined,
                doctor_name,
                clinical_notes,
                now_iso,
                now_iso,
            ),
        )

        cursor = conn.execute(
            """
            INSERT INTO screening_records (
                patient_id, created_at, quality_decision, quality_reasons,
                fov_ratio, sharpness, illumination_var, vessel_contrast,
                referable_probability, referable_label, referable_tier,
                referable_confidence, grade_predicted, grade_label,
                grade_confidence, grade_probabilities, models_agree,
                preprocessed_image, heatmap_image, original_filename, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                patient_id,
                now_iso,
                quality_decision,
                quality_reasons,
                fov_ratio,
                sharpness,
                illumination_var,
                vessel_contrast,
                referable_prob,
                referable_label,
                referable_tier,
                referable_conf,
                grade_pred,
                grade_lbl,
                grade_conf,
                grade_probs_str,
                models_agree_int,
                preprocessed_img,
                heatmap_img,
                original_filename,
                clinical_notes,
            ),
        )
        return int(cursor.lastrowid or 0)


def list_records(
    search: str | None = None,
    tier: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """List screening records joined with patient details, with search and tier filters."""
    query = """
        SELECT
            r.id,
            r.patient_id,
            p.name,
            p.age,
            p.gender,
            p.eye_examined,
            p.doctor_name,
            r.created_at,
            r.quality_decision,
            r.referable_tier,
            r.referable_label,
            r.referable_probability,
            r.referable_confidence,
            r.grade_predicted,
            r.grade_label,
            r.grade_confidence,
            r.preprocessed_image,
            r.heatmap_image
        FROM screening_records r
        JOIN patients p ON r.patient_id = p.patient_id
        WHERE 1=1
    """
    params: list[Any] = []

    if search:
        search_pattern = f"%{search.strip()}%"
        query += " AND (p.name LIKE ? OR p.patient_id LIKE ?)"
        params.extend([search_pattern, search_pattern])

    if tier:
        if tier.lower() == "reject":
            query += " AND r.quality_decision = 'reject-recapture'"
        else:
            query += " AND r.referable_tier = ? AND (r.quality_decision IS NULL OR r.quality_decision != 'reject-recapture')"
            params.append(tier.capitalize())

    query += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    with get_db_connection() as conn:
        rows = conn.execute(query, params).fetchall()
        return [dict(row) for row in rows]


def get_record_by_id(record_id: int) -> dict[str, Any] | None:
    """Retrieve full screening record and patient details by record ID."""
    query = """
        SELECT
            r.*,
            p.name,
            p.age,
            p.gender,
            p.contact,
            p.diabetes_type,
            p.diabetes_duration,
            p.eye_examined,
            p.doctor_name,
            p.clinical_notes
        FROM screening_records r
        JOIN patients p ON r.patient_id = p.patient_id
        WHERE r.id = ?
    """
    with get_db_connection() as conn:
        row = conn.execute(query, (record_id,)).fetchone()
        if not row:
            return None
        data = dict(row)
        # Parse JSON fields
        try:
            data["quality_reasons"] = json.loads(data.get("quality_reasons") or "[]")
        except (json.JSONDecodeError, TypeError, ValueError):
            data["quality_reasons"] = []
        try:
            data["grade_probabilities"] = json.loads(data.get("grade_probabilities") or "[]")
        except (json.JSONDecodeError, TypeError, ValueError):
            data["grade_probabilities"] = []
        data["models_agree"] = bool(data.get("models_agree"))
        return data


def delete_record(record_id: int) -> bool:
    """Delete a screening record by ID. Returns True if deleted."""
    with get_db_connection() as conn:
        cursor = conn.execute("DELETE FROM screening_records WHERE id = ?", (record_id,))
        return cursor.rowcount > 0


def get_statistics() -> dict[str, int]:
    """Calculate summary statistics for clinical records."""
    with get_db_connection() as conn:
        total = conn.execute("SELECT COUNT(*) FROM screening_records").fetchone()[0]
        high_risk = conn.execute(
            "SELECT COUNT(*) FROM screening_records WHERE referable_tier = 'High' AND (quality_decision IS NULL OR quality_decision != 'reject-recapture')"
        ).fetchone()[0]
        moderate_risk = conn.execute(
            "SELECT COUNT(*) FROM screening_records WHERE referable_tier = 'Moderate' AND (quality_decision IS NULL OR quality_decision != 'reject-recapture')"
        ).fetchone()[0]
        low_risk = conn.execute(
            "SELECT COUNT(*) FROM screening_records WHERE referable_tier = 'Low' AND (quality_decision IS NULL OR quality_decision != 'reject-recapture')"
        ).fetchone()[0]
        recapture = conn.execute(
            "SELECT COUNT(*) FROM screening_records WHERE quality_decision = 'reject-recapture'"
        ).fetchone()[0]

        return {
            "total_screenings": int(total),
            "high_risk_count": int(high_risk),
            "moderate_risk_count": int(moderate_risk),
            "low_risk_count": int(low_risk),
            "recapture_count": int(recapture),
        }
