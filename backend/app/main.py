"""Diabetic Retinopathy Screening FastAPI Backend Application.

Provides clinical screening endpoints for retinal fundus photographs:
- GET /health: Service liveness, version, and model residency verification
- GET /model/info: Active CNN architecture, Grad-CAM layer, and validation metrics
- POST /predict: Retinal fundus upload with patient intake, IQA, inference, Grad-CAM, & DB persistence
- GET /records: Search, filter, and list historical patient screenings
- GET /records/stats: Clinical dashboard summary statistics
- GET /records/{record_id}: Full patient screening report & explainability
- DELETE /records/{record_id}: Remove a screening record
- GET /records/{record_id}/pdf: Stream official clinical PDF report
- POST /reports/pdf: Ad-hoc PDF generation from screening response
"""

import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated, Any, Final

from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.db import (
    delete_record,
    get_record_by_id,
    get_statistics,
    init_db,
    list_records,
    save_screening_record,
)
from app.inference import engine
from app.pdf_report import generate_screening_pdf
from app.preprocessing import MAX_UPLOAD_SIZE_BYTES, ImageValidationError
from app.schemas import (
    HealthResponse,
    ModelInfoResponse,
    PatientRecordDetail,
    PatientRecordSummary,
    RecordsStatsResponse,
    ReportPdfRequest,
    ScreeningResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context manager for startup and shutdown hooks."""
    init_db()
    engine.load_artifacts()
    yield


app: Final[FastAPI] = FastAPI(
    title="Diabetic Retinopathy Screening API",
    description=(
        "Production-grade clinical retinal screening API powered by CustomDRCNN "
        "models, automated rule-based Image Quality Assessment (IQA), and Grad-CAM visual heatmaps."
    ),
    version=__version__,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS configuration allowing React Vite frontend development & production hosts
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health & Liveness Check",
    tags=["System"],
)
def health_check() -> HealthResponse:
    """Verify backend API service health, version, and model residency."""
    return HealthResponse(
        status="healthy",
        version=__version__,
        models_loaded=engine.is_loaded(),
    )


@app.get(
    "/model/info",
    response_model=ModelInfoResponse,
    summary="Model Architecture & Metadata",
    tags=["Model"],
)
def get_model_info() -> ModelInfoResponse:
    """Retrieve active model architecture, Grad-CAM target layer, and validation metrics."""
    return engine.get_info()


@app.post(
    "/predict",
    response_model=ScreeningResponse,
    summary="Screen Retinal Fundus Image for Diabetic Retinopathy",
    tags=["Inference"],
)
async def predict(
    file: Annotated[UploadFile, File()],
    patient_name: Annotated[str | None, Form()] = None,
    patient_age: Annotated[int | None, Form()] = None,
    patient_gender: Annotated[str | None, Form()] = None,
    patient_id: Annotated[str | None, Form()] = None,
    contact: Annotated[str | None, Form()] = None,
    diabetes_type: Annotated[str | None, Form()] = None,
    diabetes_duration: Annotated[int | None, Form()] = None,
    eye_examined: Annotated[str | None, Form()] = None,
    doctor_name: Annotated[str | None, Form()] = None,
    clinical_notes: Annotated[str | None, Form()] = None,
) -> ScreeningResponse:
    """Screen a single retinal fundus image for diabetic retinopathy.

    Performs:
    1. In-memory validation and decoding (JPEG / PNG, <10 MB, >=256px, <=50 MP).
    2. Rule-based Image Quality Assessment (FOV, sharpness, illumination, contrast).
    3. Dual-model CustomDRCNN inference (referability risk + 5-stage ICDR grading).
    4. Grad-CAM visual explainability heatmap generation on conv5 layer.
    5. Automatic persistence to SQLite database if patient metadata is supplied.
    """
    if not engine.is_loaded():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "model_unavailable",
                "message": "Screening models are not currently loaded in memory.",
            },
        )

    # Read uploaded bytes with size ceiling guard
    content = await file.read(MAX_UPLOAD_SIZE_BYTES + 1)
    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail={
                "code": "file_too_large",
                "message": (
                    f"Uploaded file exceeds maximum permitted size of 10 MB "
                    f"({len(content) / (1024 * 1024):.1f} MB received)."
                ),
            },
        )

    try:
        screening = engine.predict(content)
    except ImageValidationError as exc:
        status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        if exc.code == "file_too_large":
            status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        elif exc.code == "unsupported_type":
            status_code = status.HTTP_415_UNSUPPORTED_MEDIA_TYPE
        elif exc.code in (
            "undecodable_image",
            "image_too_small",
            "image_too_large_pixels",
        ):
            status_code = status.HTTP_422_UNPROCESSABLE_ENTITY

        raise HTTPException(
            status_code=status_code,
            detail={"code": exc.code, "message": exc.message},
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "code": "internal_error",
                "message": f"Screening pipeline error: {exc!s}",
            },
        ) from exc

    # Persist to SQLite if patient metadata is present
    if patient_name or patient_id or (patient_age is not None):
        pid = patient_id or f"PT-{datetime.now(UTC).strftime('%Y%m')}-{uuid.uuid4().hex[:12].upper()}"
        pdata = {
            "name": (patient_name or "Anonymous Patient").strip(),
            "age": patient_age or 0,
            "gender": patient_gender or "Unknown",
            "patient_id": pid,
            "contact": contact,
            "diabetes_type": diabetes_type,
            "diabetes_duration": diabetes_duration,
            "eye_examined": eye_examined,
            "doctor_name": doctor_name,
            "clinical_notes": clinical_notes,
        }
        record_id = save_screening_record(
            patient_data=pdata,
            screening_result=screening.model_dump(),
            original_filename=file.filename or "retinal_image.jpg",
        )
        return ScreeningResponse(
            quality=screening.quality,
            result=screening.result,
            record_id=record_id,
            patient_id=pid,
        )

    return screening


@app.get(
    "/records",
    response_model=list[PatientRecordSummary],
    summary="List Patient Screening Records",
    tags=["Clinical Records"],
)
def get_records(
    search: Annotated[str | None, Query(description="Search by patient name or MRN")] = None,
    tier: Annotated[str | None, Query(description="Filter by risk tier or 'reject'")] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[PatientRecordSummary]:
    """Retrieve historical patient screening records with optional search and tier filter."""
    rows = list_records(search=search, tier=tier, limit=limit, offset=offset)
    return [PatientRecordSummary(**r) for r in rows]


@app.get(
    "/records/stats",
    response_model=RecordsStatsResponse,
    summary="Patient Screening Statistics",
    tags=["Clinical Records"],
)
def get_records_stats() -> RecordsStatsResponse:
    """Retrieve aggregate screening statistics across all clinical records."""
    stats = get_statistics()
    return RecordsStatsResponse(**stats)


@app.get(
    "/records/{record_id}",
    response_model=PatientRecordDetail,
    summary="Retrieve Detailed Screening Record",
    tags=["Clinical Records"],
)
def get_record(record_id: int) -> PatientRecordDetail:
    """Retrieve full clinical screening record by ID, including metrics and thumbnails."""
    record = get_record_by_id(record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "record_not_found",
                "message": f"Screening record {record_id} was not found.",
            },
        )
    return PatientRecordDetail(**record)


@app.delete(
    "/records/{record_id}",
    summary="Delete a Screening Record",
    tags=["Clinical Records"],
)
def remove_record(record_id: int) -> dict[str, Any]:
    """Delete a screening record by ID."""
    deleted = delete_record(record_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "record_not_found",
                "message": f"Screening record {record_id} not found or already deleted.",
            },
        )
    return {"status": "deleted", "id": record_id}


@app.get(
    "/records/{record_id}/pdf",
    summary="Download Official Clinical PDF Report",
    tags=["Clinical Records"],
)
def download_record_pdf(record_id: int) -> Response:
    """Generate and download a publication-grade PDF clinical report for a stored record."""
    record = get_record_by_id(record_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "record_not_found",
                "message": f"Screening record {record_id} was not found.",
            },
        )

    pdf_bytes = generate_screening_pdf(record)
    patient_id = record.get("patient_id", "Patient")
    filename = f"DR_Screening_Report_{patient_id}_Rec{record_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@app.post(
    "/reports/pdf",
    summary="Generate Clinical PDF Report From Screening Result",
    tags=["Clinical Records"],
)
def generate_pdf_from_result(payload: ReportPdfRequest) -> Response:
    """Generate a downloadable PDF screening report from active screening data in-memory."""
    screening = payload.screening
    patient = payload.patient

    record_dict: dict[str, Any] = {
        "name": patient.name,
        "patient_id": patient.patient_id,
        "age": patient.age,
        "gender": patient.gender,
        "eye_examined": patient.eye_examined,
        "diabetes_type": patient.diabetes_type,
        "diabetes_duration": patient.diabetes_duration,
        "doctor_name": patient.doctor_name,
        "clinical_notes": patient.clinical_notes,
        "created_at": datetime.now(UTC).isoformat(),
        "quality_decision": screening.quality.decision,
        "fov_ratio": screening.quality.metrics.fov_ratio,
        "sharpness": screening.quality.metrics.sharpness,
        "illumination_var": screening.quality.metrics.illumination_var,
        "vessel_contrast": screening.quality.metrics.vessel_contrast,
    }

    if screening.result:
        res = screening.result
        record_dict.update(
            {
                "referable_probability": res.referable.probability,
                "referable_label": res.referable.label,
                "referable_tier": res.referable.tier,
                "referable_confidence": res.referable.confidence,
                "grade_predicted": res.grade.predicted,
                "grade_label": res.grade.label,
                "grade_confidence": res.grade.confidence,
                "grade_probabilities": res.grade.probabilities,
                "models_agree": res.models_agree,
                "preprocessed_image": res.images.preprocessed_png,
                "heatmap_image": res.images.heatmap_referable_png or res.images.heatmap_grade_png,
            }
        )

    pdf_bytes = generate_screening_pdf(record_dict)
    filename = f"DR_Screening_Report_{patient.patient_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )
