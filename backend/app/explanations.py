"""Clinical terminology, grade explanations, and recommendations for DR screening."""

from typing import Final, TypedDict

from app.schemas import RiskTier


class GradeExplanation(TypedDict):
    """Metadata describing a diabetic retinopathy ICDR grade."""

    grade: int
    name: str
    short_label: str
    clinical_description: str
    recommendation: str


GRADE_METADATA: Final[dict[int, GradeExplanation]] = {
    0: {
        "grade": 0,
        "name": "No Diabetic Retinopathy",
        "short_label": "No DR",
        "clinical_description": (
            "No visible microvascular abnormalities, hemorrhages, or exudates detected in the fundus field."
        ),
        "recommendation": (
            "Continue routine annual dilated retinal examination and maintain optimal glycemic and blood pressure targets."
        ),
    },
    1: {
        "grade": 1,
        "name": "Mild Non-Proliferative DR",
        "short_label": "Mild",
        "clinical_description": (
            "Microaneurysms only. Early localized outpouchings of retinal capillaries without substantial leakage."
        ),
        "recommendation": (
            "Repeat dilated fundus examination within 6 to 12 months. Review HbA1c, lipid panel, and blood pressure with primary physician."
        ),
    },
    2: {
        "grade": 2,
        "name": "Moderate Non-Proliferative DR",
        "short_label": "Moderate",
        "clinical_description": (
            "More than microaneurysms but less than severe. Presence of blot hemorrhages, hard exudates, or cotton wool spots."
        ),
        "recommendation": (
            "Refer to an ophthalmologist or retina specialist within 2 to 4 months for dilated bio-microscopy and OCT assessment."
        ),
    },
    3: {
        "grade": 3,
        "name": "Severe Non-Proliferative DR",
        "short_label": "Severe",
        "clinical_description": (
            "Severe microvascular ischemia. Meets the 4-2-1 rule: extensive hemorrhages in all 4 quadrants, venous beading in 2+ quadrants, or IRMA in 1+ quadrant."
        ),
        "recommendation": (
            "Urgent referral to a retina specialist within 2 to 4 weeks. High risk of progression to proliferative DR; close monitoring required."
        ),
    },
    4: {
        "grade": 4,
        "name": "Proliferative DR",
        "short_label": "Proliferative",
        "clinical_description": (
            "Pathological neovascularization (abnormal fragile new vessels on retina or optic disc), preretinal/vitreous hemorrhage, or fibrovascular proliferation."
        ),
        "recommendation": (
            "Immediate referral to a retina specialist within 24 to 48 hours for panretinal photocoagulation (PRP) or anti-VEGF therapy evaluation."
        ),
    },
}


def classify_risk_tier(prob_referable: float) -> RiskTier:
    """Classify referable probability into Low, Moderate, or High risk tiers."""
    if prob_referable < 0.35:
        return "Low"
    if prob_referable <= 0.65:
        return "Moderate"
    return "High"
