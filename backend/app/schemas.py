"""Pydantic v2 schemas for Retinal Fundus Diabetic Retinopathy screening API."""

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

QualityDecision = Literal["accept", "enhance-then-accept", "reject-recapture"]
RiskTier = Literal["Low", "Moderate", "High"]
ReferableLabel = Literal["Non-Referable", "Referable"]


class ErrorDetail(BaseModel):
    """Structured error payload schema."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    code: str = Field(description="Machine-readable error identifier code")
    message: str = Field(description="Human-readable clinical or system explanation")


class QualityMetricsSchema(BaseModel):
    """Numerical metrics computed by Image Quality Assessment."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    fov_ratio: float = Field(
        ge=0.0,
        le=1.0,
        description="Retinal field-of-view area proportion relative to whole frame",
    )
    sharpness: float = Field(
        ge=0.0,
        description="Focus and sharpness metric measured by Laplacian variance",
    )
    illumination_var: float = Field(
        ge=0.0,
        description="Illumination uniformity index (std/mean across 3x3 grid)",
    )
    vessel_contrast: float = Field(
        ge=0.0,
        description="Vessel visibility score via Sobel gradient magnitude on green channel",
    )


class QualityResponse(BaseModel):
    """Image Quality Assessment evaluation result."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    decision: QualityDecision = Field(
        description="Clinical acquisition quality triage decision"
    )
    metrics: QualityMetricsSchema = Field(
        description="Detailed quantitative image quality measurements"
    )
    reasons: list[str] = Field(
        default_factory=list,
        description="List of plain-language reasons if degraded or rejected",
    )


class ReferableResult(BaseModel):
    """Binary referable diabetic retinopathy screening prediction."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    probability: float = Field(
        ge=0.0,
        le=1.0,
        description="Estimated probability of referable diabetic retinopathy (grade 2+)",
    )
    label: ReferableLabel = Field(
        description="Categorical label: Non-Referable (0-1) or Referable (2-4)"
    )
    tier: RiskTier = Field(
        description="Risk tier: Low (<0.35), Moderate (0.35-0.65), or High (>0.65)"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Softmax probability assigned to the predicted binary class",
    )


class GradeResult(BaseModel):
    """5-stage multiclass diabetic retinopathy severity grading prediction."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    predicted: int = Field(
        ge=0,
        le=4,
        description="Predicted ICDR grade: 0=No DR, 1=Mild, 2=Moderate, 3=Severe, 4=Proliferative",
    )
    label: str = Field(description="Clinical stage label")
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Softmax probability assigned to predicted grade",
    )
    probabilities: list[float] = Field(
        description="Softmax probability distribution across all 5 DR grades"
    )


class ImagesResult(BaseModel):
    """Preprocessed image and Grad-CAM visual heatmaps as base64 PNG data URLs."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    preprocessed_png: str = Field(
        description="Standardized 224x224 RGB image encoded as data:image/png;base64"
    )
    heatmap_referable_png: str = Field(
        description="Grad-CAM activation overlay for referable class as data:image/png;base64"
    )
    heatmap_grade_png: str = Field(
        description="Grad-CAM activation overlay for predicted grade as data:image/png;base64"
    )


class PredictionResult(BaseModel):
    """Combined model predictions and visual explanations."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    referable: ReferableResult = Field(
        description="Binary referability screening prediction"
    )
    grade: GradeResult = Field(description="5-class disease severity grading")
    models_agree: bool = Field(
        description="True if binary model and multiclass model agree on referability (grade >= 2)"
    )
    images: ImagesResult = Field(
        description="Preprocessed retinal photo and Grad-CAM heatmaps"
    )


class ScreeningResponse(BaseModel):
    """Top-level response payload for POST /predict."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    quality: QualityResponse = Field(
        description="Image Quality Assessment triage result"
    )
    result: PredictionResult | None = Field(
        default=None,
        description="Screening predictions and heatmaps (null if rejected for recapture)",
    )
    record_id: int | None = Field(
        default=None,
        description="Persisted database record ID if patient info was provided",
    )
    patient_id: str | None = Field(
        default=None,
        description="Patient Medical Record Number (MRN) if patient info was provided",
    )


class PatientRecordSummary(BaseModel):
    """Summarized patient screening record for tabular listing."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    id: int = Field(description="Database primary key record ID")
    patient_id: str = Field(description="Unique patient MRN or ID")
    name: str = Field(description="Patient full name")
    age: int = Field(description="Patient age in years")
    gender: str = Field(description="Patient biological sex / gender")
    eye_examined: str | None = Field(default=None, description="Target eye (OD/OS/OU)")
    doctor_name: str | None = Field(default=None, description="Attending clinician name")
    created_at: str = Field(description="Screening examination UTC ISO timestamp")
    quality_decision: str = Field(description="Quality assessment triage decision")
    referable_tier: str | None = Field(default=None, description="Risk tier: Low, Moderate, High")
    referable_label: str | None = Field(default=None, description="Referable or Non-Referable")
    referable_probability: float | None = Field(default=None, description="Probability score")
    referable_confidence: float | None = Field(default=None, description="Binary model confidence")
    grade_predicted: int | None = Field(default=None, description="ICDR severity grade (0-4)")
    grade_label: str | None = Field(default=None, description="ICDR severity clinical label")
    grade_confidence: float | None = Field(default=None, description="Multiclass model confidence")
    preprocessed_image: str | None = Field(default=None, description="Thumbnail data URL")
    heatmap_image: str | None = Field(default=None, description="Grad-CAM thumbnail data URL")


class PatientRecordDetail(BaseModel):
    """Comprehensive screening record including clinical intake and all IQA metrics."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    id: int = Field(description="Database primary key record ID")
    patient_id: str = Field(description="Unique patient MRN or ID")
    name: str = Field(description="Patient full name")
    age: int = Field(description="Patient age in years")
    gender: str = Field(description="Patient biological sex / gender")
    contact: str | None = Field(default=None, description="Patient contact phone or email")
    diabetes_type: str | None = Field(default=None, description="Diabetes classification type")
    diabetes_duration: int | None = Field(default=None, description="Duration in years")
    eye_examined: str | None = Field(default=None, description="Target eye (OD/OS/OU)")
    doctor_name: str | None = Field(default=None, description="Attending clinician name")
    clinical_notes: str | None = Field(default=None, description="Physician clinical notes")
    created_at: str = Field(description="Screening examination UTC ISO timestamp")
    quality_decision: str = Field(description="Quality assessment triage decision")
    quality_reasons: list[str] = Field(default_factory=list, description="Quality issue reasons")
    fov_ratio: float = Field(description="Field-of-view coverage ratio")
    sharpness: float = Field(description="Laplacian variance sharpness")
    illumination_var: float = Field(description="Illumination coefficient of variation")
    vessel_contrast: float = Field(description="Sobel vessel contrast magnitude")
    referable_probability: float | None = Field(default=None, description="Probability score")
    referable_label: str | None = Field(default=None, description="Referable or Non-Referable")
    referable_tier: str | None = Field(default=None, description="Risk tier: Low, Moderate, High")
    referable_confidence: float | None = Field(default=None, description="Binary model confidence")
    grade_predicted: int | None = Field(default=None, description="ICDR severity grade (0-4)")
    grade_label: str | None = Field(default=None, description="ICDR severity clinical label")
    grade_confidence: float | None = Field(default=None, description="Multiclass model confidence")
    grade_probabilities: list[float] = Field(default_factory=list, description="5-class probabilities")
    models_agree: bool | None = Field(default=None, description="Dual CNN concordance")
    preprocessed_image: str | None = Field(default=None, description="Preprocessed image data URL")
    heatmap_image: str | None = Field(default=None, description="Grad-CAM heatmap data URL")
    original_filename: str | None = Field(default=None, description="Original uploaded filename")
    notes: str | None = Field(default=None, description="Screening record notes")


class RecordsStatsResponse(BaseModel):
    """Aggregate statistics for patient screening records dashboard."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    total_screenings: int = Field(description="Total patient screenings recorded")
    high_risk_count: int = Field(description="Number of High Risk / Referable screenings")
    moderate_risk_count: int = Field(description="Number of Moderate Risk screenings")
    low_risk_count: int = Field(description="Number of Low Risk / Normal screenings")
    recapture_count: int = Field(description="Number of rejected / recapture screenings")


class PatientInfoPayload(BaseModel):
    """Patient demographics and clinical metadata for report generation."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    name: str = Field(default="Anonymous Patient")
    patient_id: str = Field(default="N/A")
    age: int | str = Field(default="N/A")
    gender: str = Field(default="N/A")
    eye_examined: str | None = Field(default=None)
    diabetes_type: str | None = Field(default=None)
    diabetes_duration: int | None = Field(default=None)
    doctor_name: str | None = Field(default=None)
    clinical_notes: str | None = Field(default=None)


class ReportPdfRequest(BaseModel):
    """Ad-hoc PDF generation request payload from screening result."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    patient: PatientInfoPayload = Field(default_factory=PatientInfoPayload)
    screening: ScreeningResponse = Field(description="Screening response data")


class HealthResponse(BaseModel):
    """System health check response."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    status: str = Field(description="Service status indicator")
    version: str = Field(description="Application version")
    models_loaded: bool = Field(
        description="True if both binary and multiclass models are loaded in memory"
    )


class ModelInfoResponse(BaseModel):
    """Detailed model metadata and performance metrics."""

    model_config = ConfigDict(frozen=True, extra="forbid")

    architecture: str = Field(description="Neural network architecture description")
    models_loaded: bool = Field(description="Memory residency status of model weights")
    input_size: list[int] = Field(
        description="Expected [height, width] image dimensions"
    )
    gradcam_target_layer: str = Field(description="Penultimate layer used for Grad-CAM")
    binary_model: dict[str, Any] = Field(
        description="Binary model metadata and metrics"
    )
    multiclass_model: dict[str, Any] = Field(
        description="Multiclass model metadata and metrics"
    )
    version: str = Field(description="Model release version")
