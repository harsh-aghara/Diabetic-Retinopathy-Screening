"""Seed realistic Indian patient demographic records and retinal fundus screenings from APTOS 2019 dataset."""

import sqlite3
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

from app.db import init_db, save_screening_record, set_db_path
from app.inference import engine

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "screening.db"
APTOS_DIR = Path(__file__).resolve().parent.parent.parent / "aptos2019-blindness-detection" / "train_images"

# 10 Indian Patients (with 2 patients having 2 visits each -> 12 total screenings)
PATIENT_SCREENINGS: list[dict[str, Any]] = [
    # Patient 1: Rajesh Sharma (1 visit)
    {
        "patient": {
            "name": "Rajesh Sharma",
            "patient_id": "PT-2026-DEL101",
            "age": 58,
            "gender": "Male",
            "contact": "+91 98101 23456",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 8,
            "doctor_name": "Dr. Ananya Roy, MS (Ophth)",
            "clinical_notes": "Routine annual fundus checkup. HbA1c 6.8%. Visual acuity 20/20 in both eyes.",
        },
        "image_file": "002c21358ce6.png",
        "created_at": (datetime.now(UTC) - timedelta(days=2)).isoformat(),
    },

    # Patient 2: Sunita Rao (1 visit)
    {
        "patient": {
            "name": "Sunita Rao",
            "patient_id": "PT-2026-BLR102",
            "age": 52,
            "gender": "Female",
            "contact": "+91 98450 87654",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 4,
            "doctor_name": "Dr. K. S. Venkatesh, MD",
            "clinical_notes": "Blood sugar well regulated on oral Metformin. No complaints of blurriness.",
        },
        "image_file": "005b95c28852.png",
        "created_at": (datetime.now(UTC) - timedelta(days=5)).isoformat(),
    },

    # Patient 3: Priya Patel (REVISIT 1 - Initial Screening)
    {
        "patient": {
            "name": "Priya Patel",
            "patient_id": "PT-2026-AHM103",
            "age": 47,
            "gender": "Female",
            "contact": "+91 98251 34910",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 11,
            "doctor_name": "Dr. Ramesh Joshi, DO",
            "clinical_notes": "Initial visit. Reports occasional floaters in right eye. Microaneurysm surveillance.",
        },
        "image_file": "0024cdab0c1e.png",
        "created_at": (datetime.now(UTC) - timedelta(days=120)).isoformat(),
    },

    # Patient 3: Priya Patel (REVISIT 2 - 4-Month Follow-up Checkup)
    {
        "patient": {
            "name": "Priya Patel",
            "patient_id": "PT-2026-AHM103",
            "age": 47,
            "gender": "Female",
            "contact": "+91 98251 34910",
            "eye_examined": "Left Eye (OS)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 11,
            "doctor_name": "Dr. Ramesh Joshi, DO",
            "clinical_notes": "Follow-up visit at 4 months. Contralateral left eye fundus photographic screening.",
        },
        "image_file": "00cb6555d108.png",
        "created_at": (datetime.now(UTC) - timedelta(days=3)).isoformat(),
    },

    # Patient 4: Amit Verma (REVISIT 1 - Initial Diagnostic Scan)
    {
        "patient": {
            "name": "Amit Verma",
            "patient_id": "PT-2026-LKO104",
            "age": 63,
            "gender": "Male",
            "contact": "+91 94150 91823",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 16,
            "doctor_name": "Dr. Vivek Saxena, MS",
            "clinical_notes": "Patient reports reading blurriness. Uncontrolled diabetes (HbA1c 8.9%).",
        },
        "image_file": "000c1434d8d7.png",
        "created_at": (datetime.now(UTC) - timedelta(days=90)).isoformat(),
    },

    # Patient 4: Amit Verma (REVISIT 2 - 3-Month Monitoring Follow-up)
    {
        "patient": {
            "name": "Amit Verma",
            "patient_id": "PT-2026-LKO104",
            "age": 63,
            "gender": "Male",
            "contact": "+91 94150 91823",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 16,
            "doctor_name": "Dr. Vivek Saxena, MS",
            "clinical_notes": "Follow-up visit. Assessing vascular changes before laser photocoagulation.",
        },
        "image_file": "00a8624548a9.png",
        "created_at": (datetime.now(UTC) - timedelta(days=1)).isoformat(),
    },

    # Patient 5: Vikram Malhotra (1 visit)
    {
        "patient": {
            "name": "Vikram Malhotra",
            "patient_id": "PT-2026-CHD105",
            "age": 49,
            "gender": "Male",
            "contact": "+91 98720 45192",
            "eye_examined": "Left Eye (OS)",
            "diabetes_type": "Type 1",
            "diabetes_duration": 18,
            "doctor_name": "Dr. Gurpreet Singh, MD",
            "clinical_notes": "Type 1 diabetic on insulin pump. Annual dilated fundus screening.",
        },
        "image_file": "0097f532ac9f.png",
        "created_at": (datetime.now(UTC) - timedelta(days=6)).isoformat(),
    },

    # Patient 6: Ananya Mukherjee (1 visit)
    {
        "patient": {
            "name": "Ananya Mukherjee",
            "patient_id": "PT-2026-KOL106",
            "age": 38,
            "gender": "Female",
            "contact": "+91 98301 76234",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Gestational",
            "diabetes_duration": 1,
            "doctor_name": "Dr. Subhashish Roy, MS",
            "clinical_notes": "Gestational diabetes screening in week 32. Normal visual acuity.",
        },
        "image_file": "00cc2b75cddd.png",
        "created_at": (datetime.now(UTC) - timedelta(days=8)).isoformat(),
    },

    # Patient 7: Suresh Nair (1 visit)
    {
        "patient": {
            "name": "Suresh Nair",
            "patient_id": "PT-2026-COI107",
            "age": 66,
            "gender": "Male",
            "contact": "+91 94471 62534",
            "eye_examined": "Both Eyes (OU)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 14,
            "doctor_name": "Dr. Radhika Menon, MS (Ophth)",
            "clinical_notes": "Reports mild night vision distortion. Blood pressure 142/88. Bilateral screening.",
        },
        "image_file": "00b74780d31d.png",
        "created_at": (datetime.now(UTC) - timedelta(days=12)).isoformat(),
    },

    # Patient 8: Deepa Sundaram (1 visit)
    {
        "patient": {
            "name": "Deepa Sundaram",
            "patient_id": "PT-2026-MAA108",
            "age": 44,
            "gender": "Female",
            "contact": "+91 98402 18932",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 7,
            "doctor_name": "Dr. T. S. Balasubramanian, MD",
            "clinical_notes": "Referred from primary health center. Blot hemorrhages and exudates suspected.",
        },
        "image_file": "0104b032c141.png",
        "created_at": (datetime.now(UTC) - timedelta(days=15)).isoformat(),
    },

    # Patient 9: Harish Kulkarni (1 visit)
    {
        "patient": {
            "name": "Harish Kulkarni",
            "patient_id": "PT-2026-PUN109",
            "age": 57,
            "gender": "Male",
            "contact": "+91 98220 54312",
            "eye_examined": "Left Eye (OS)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 21,
            "doctor_name": "Dr. Milind Deshpande, MS",
            "clinical_notes": "Urgent retinal evaluation for proliferative changes and neovascularization.",
        },
        "image_file": "001639a390f0.png",
        "created_at": (datetime.now(UTC) - timedelta(days=18)).isoformat(),
    },

    # Patient 10: Meenakshi Iyer (1 visit)
    {
        "patient": {
            "name": "Meenakshi Iyer",
            "patient_id": "PT-2026-HYD110",
            "age": 61,
            "gender": "Female",
            "contact": "+91 98490 32187",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 19,
            "doctor_name": "Dr. P. V. Ramana, MS (Ophth)",
            "clinical_notes": "High risk proliferative DR evaluation. Neovascularization and fibrous proliferation.",
        },
        "image_file": "0083ee8054ee.png",
        "created_at": (datetime.now(UTC) - timedelta(days=22)).isoformat(),
    },

    # Patient 11: Kavita Krishnan (1 visit - Stage 0: No DR, High Clarity Photo)
    {
        "patient": {
            "name": "Kavita Krishnan",
            "patient_id": "PT-2026-CHE111",
            "age": 46,
            "gender": "Female",
            "contact": "+91 98401 56789",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 5,
            "doctor_name": "Dr. V. Ramanathan, MS",
            "clinical_notes": "Routine annual checkup. High quality clear fundus photograph. No visual symptoms.",
        },
        "image_file": "00cc2b75cddd.png",
        "created_at": (datetime.now(UTC) - timedelta(hours=8)).isoformat(),
    },

    # Patient 12: Naveen Choudhury (1 visit - Stage 1: Mild DR, High Clarity Photo)
    {
        "patient": {
            "name": "Naveen Choudhury",
            "patient_id": "PT-2026-GHY112",
            "age": 53,
            "gender": "Male",
            "contact": "+91 94350 23412",
            "eye_examined": "Left Eye (OS)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 9,
            "doctor_name": "Dr. B. K. Barua, MD",
            "clinical_notes": "Clear fundus acquisition passing all IQA thresholds. Early isolated microaneurysms noted.",
        },
        "image_file": "07929d32b5b3.png",
        "created_at": (datetime.now(UTC) - timedelta(hours=5)).isoformat(),
    },

    # Patient 13: Pooja Agarwal (1 visit - Stage 2: Moderate DR, High Clarity Photo)
    {
        "patient": {
            "name": "Pooja Agarwal",
            "patient_id": "PT-2026-JPR113",
            "age": 50,
            "gender": "Female",
            "contact": "+91 98290 87654",
            "eye_examined": "Right Eye (OD)",
            "diabetes_type": "Type 2",
            "diabetes_duration": 13,
            "doctor_name": "Dr. Manisha Sharma, MS",
            "clinical_notes": "High clarity fundus photography. Clear microvascular lesions; specialist referral recommended.",
        },
        "image_file": "025a169a0bb0.png",
        "created_at": (datetime.now(UTC) - timedelta(hours=2)).isoformat(),
    },
]


def seed_database() -> None:
    print(f"--> Initializing database at {DB_PATH}...")
    set_db_path(DB_PATH)
    # Clear existing dummy entries
    if DB_PATH.exists():
        DB_PATH.unlink()
    init_db(DB_PATH)

    print("--> Loading CustomDRCNN neural network artifacts...")
    engine.load_artifacts()

    print(f"--> Seeding {len(PATIENT_SCREENINGS)} screenings for 10 unique patients...")

    for i, item in enumerate(PATIENT_SCREENINGS, 1):
        pinfo = item["patient"]
        img_name = item["image_file"]
        img_path = APTOS_DIR / img_name
        created_at = item["created_at"]

        print(f"[{i}/{len(PATIENT_SCREENINGS)}] Processing {pinfo['name']} ({pinfo['patient_id']}) with image {img_name}...")

        if not img_path.exists():
            raise FileNotFoundError(f"Missing APTOS image: {img_path}")

        with open(img_path, "rb") as f:
            img_bytes = f.read()

        # Run model inference and Grad-CAM
        screening = engine.predict(img_bytes)

        # Save to database
        record_id = save_screening_record(
            patient_data=pinfo,
            screening_result=screening.model_dump(),
            original_filename=img_name,
        )

        # Update created_at timestamp to match the historical visit timeline
        conn = sqlite3.connect(str(DB_PATH))
        conn.execute("UPDATE screening_records SET created_at = ? WHERE id = ?", (created_at, record_id))
        conn.execute("UPDATE patients SET created_at = ?, updated_at = ? WHERE patient_id = ?", (created_at, created_at, pinfo["patient_id"]))
        conn.commit()
        conn.close()

        grade_label = screening.result.grade.label if screening.result else "Ungradable"
        tier = screening.result.referable.tier if screening.result else "Reject"
        print(f"    --> Saved record #{record_id} | Diagnosis: {grade_label} | Risk: {tier}")

    # Summary verification
    conn = sqlite3.connect(str(DB_PATH))
    total_patients = conn.execute("SELECT COUNT(DISTINCT patient_id) FROM patients").fetchone()[0]
    total_records = conn.execute("SELECT COUNT(*) FROM screening_records").fetchone()[0]
    priya_visits = conn.execute("SELECT COUNT(*) FROM screening_records WHERE patient_id = 'PT-2026-AHM103'").fetchone()[0]
    amit_visits = conn.execute("SELECT COUNT(*) FROM screening_records WHERE patient_id = 'PT-2026-LKO104'").fetchone()[0]
    conn.close()

    print("\n================ Verification Summary ================")
    print(f"Total Unique Patients: {total_patients} (Target: 10)")
    print(f"Total Screening Records: {total_records} (Target: 12)")
    print(f"Priya Patel (AHM103) Visits: {priya_visits} (Target: 2)")
    print(f"Amit Verma (LKO104) Visits: {amit_visits} (Target: 2)")
    print("======================================================")


if __name__ == "__main__":
    seed_database()
