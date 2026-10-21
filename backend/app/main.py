"""Diabetic Retinopathy Screening FastAPI Backend Application.

Provides clinical screening endpoints for retinal fundus photographs:
- GET /health: Service liveness, version, and model residency verification
- GET /model/info: Active CNN architecture, Grad-CAM layer, and validation metrics
- POST /predict: Multipart retinal fundus upload with IQA, inference, and Grad-CAM
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated, Final

from fastapi import FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.inference import engine
from app.preprocessing import MAX_UPLOAD_SIZE_BYTES, ImageValidationError
from app.schemas import (
    HealthResponse,
    ModelInfoResponse,
    ScreeningResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context manager for startup and shutdown hooks."""
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
async def predict(file: Annotated[UploadFile, File()]) -> ScreeningResponse:
    """Screen a single retinal fundus image for diabetic retinopathy.

    Performs:
    1. In-memory validation and decoding (JPEG / PNG, <10 MB, >=256px, <=50 MP).
    2. Rule-based Image Quality Assessment (FOV, sharpness, illumination, contrast).
    3. Dual-model CustomDRCNN inference (referability risk + 5-stage ICDR grading).
    4. Grad-CAM visual explainability heatmap generation on conv5 layer.
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
        return engine.predict(content)
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
