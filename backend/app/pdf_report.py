"""Clinical PDF Report Generation Module for Diabetic Retinopathy Screening.

Produces self-contained, publication-grade PDF 1.4 clinical decision support reports
conforming to ophthalmic documentation standards. Uses pure Python (zlib, struct, PIL).
"""

from __future__ import annotations

import base64
import io
import zlib
from datetime import datetime
from typing import Any

from PIL import Image


def _escape_pdf_text(text: str) -> str:
    """Escape text characters for PDF literal strings."""
    return (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
        .encode("latin1", errors="replace")
        .decode("latin1")
    )


class PDFBuilder:
    """Lightweight, standards-compliant pure-Python PDF 1.4 document builder."""

    def __init__(self, width: float = 595.28, height: float = 841.89) -> None:
        self.width = width
        self.height = height
        self.objects: list[bytes] = []
        self.commands: list[str] = []
        self.images: dict[str, int] = {}  # name -> object index

    def add_rect(
        self,
        x: float,
        y: float,
        w: float,
        h: float,
        fill_rgb: tuple[float, float, float] | None = None,
        stroke_rgb: tuple[float, float, float] | None = None,
        line_width: float = 1.0,
    ) -> None:
        """Draw filled and/or stroked rectangle."""
        self.commands.append("q")
        if fill_rgb:
            self.commands.append(f"{fill_rgb[0]:.3f} {fill_rgb[1]:.3f} {fill_rgb[2]:.3f} rg")
        if stroke_rgb:
            self.commands.append(f"{stroke_rgb[0]:.3f} {stroke_rgb[1]:.3f} {stroke_rgb[2]:.3f} RG")
            self.commands.append(f"{line_width:.2f} w")

        op = "B" if (fill_rgb and stroke_rgb) else ("f" if fill_rgb else "s")
        self.commands.append(f"{x:.2f} {y:.2f} {w:.2f} {h:.2f} re {op}")
        self.commands.append("Q")

    def add_line(
        self,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        stroke_rgb: tuple[float, float, float] = (0.7, 0.7, 0.7),
        line_width: float = 1.0,
    ) -> None:
        """Draw a vector line."""
        self.commands.append(
            f"q {stroke_rgb[0]:.3f} {stroke_rgb[1]:.3f} {stroke_rgb[2]:.3f} RG {line_width:.2f} w "
            f"{x1:.2f} {y1:.2f} m {x2:.2f} {y2:.2f} l S Q"
        )

    def add_text(
        self,
        text: str,
        x: float,
        y: float,
        font: str = "/F1",
        size: float = 10.0,
        rgb: tuple[float, float, float] = (0.1, 0.1, 0.1),
    ) -> None:
        """Render single line text at (x, y)."""
        esc = _escape_pdf_text(text)
        self.commands.append(
            f"BT {rgb[0]:.3f} {rgb[1]:.3f} {rgb[2]:.3f} rg {font} {size:.2f} Tf {x:.2f} {y:.2f} Td ({esc}) Tj ET"
        )

    def add_image_from_bytes(
        self,
        img_bytes: bytes,
        x: float,
        y: float,
        w: float,
        h: float,
    ) -> None:
        """Compress image to JPEG and embed into PDF."""
        try:
            with Image.open(io.BytesIO(img_bytes)) as pil_img:
                rgb_img = pil_img.convert("RGB")
                jpeg_buf = io.BytesIO()
                rgb_img.save(jpeg_buf, format="JPEG", quality=88)
                jpeg_data = jpeg_buf.getvalue()
                width, height = rgb_img.size
        except (OSError, ValueError, TypeError):
            # Draw placeholder box on image error
            self.add_rect(x, y, w, h, fill_rgb=(0.95, 0.95, 0.95), stroke_rgb=(0.8, 0.8, 0.8))
            self.add_text("[Image Unavailable]", x + 10, y + h / 2, size=9)
            return

        img_name = f"Im{len(self.images) + 1}"
        img_obj = (
            f"<< /Type /XObject /Subtype /Image /Width {width} /Height {height} "
            f"/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode "
            f"/Length {len(jpeg_data)} >>\nstream\n".encode("latin1")
            + jpeg_data
            + b"\nendstream"
        )
        self.objects.append(img_obj)
        obj_index = len(self.objects)
        self.images[img_name] = obj_index

        self.commands.append(f"q {w:.2f} 0 0 {h:.2f} {x:.2f} {y:.2f} cm /{img_name} Do Q")

    def add_image_from_data_url(
        self,
        data_url: str | None,
        x: float,
        y: float,
        w: float,
        h: float,
        placeholder_label: str = "[No Image]",
    ) -> None:
        """Decode a base64 data URL and embed it, or draw placeholder."""
        if not data_url:
            self.add_rect(x, y, w, h, fill_rgb=(0.96, 0.96, 0.96), stroke_rgb=(0.85, 0.85, 0.85))
            self.add_text(placeholder_label, x + 15, y + h / 2, size=9, rgb=(0.5, 0.5, 0.5))
            return

        try:
            if "," in data_url:
                _, b64 = data_url.split(",", 1)
            else:
                b64 = data_url
            raw = base64.b64decode(b64)
            self.add_image_from_bytes(raw, x, y, w, h)
        except (OSError, ValueError, TypeError):
            self.add_rect(x, y, w, h, fill_rgb=(0.96, 0.96, 0.96), stroke_rgb=(0.85, 0.85, 0.85))
            self.add_text(placeholder_label, x + 15, y + h / 2, size=9, rgb=(0.5, 0.5, 0.5))

    def build(self) -> bytes:
        """Assemble all objects into a valid binary PDF 1.4."""
        # 1: Catalog
        # 2: Pages
        # 3: Font F1 (Helvetica)
        # 4: Font F2 (Helvetica-Bold)
        # 5: Font F3 (Helvetica-Oblique)
        # 6..N: Images
        # Page Object: Page
        # Contents Object: Stream

        catalog_num = 1
        pages_num = 2
        f1_num = 3
        f2_num = 4
        f3_num = 5

        header_objs = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"<< /Type /Pages /Kids [7 0 R] /Count 1 >>",  # will update page id
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
        ]

        # Shift image object indices
        image_xobjects: list[str] = []
        final_objects: list[bytes] = list(header_objs)
        base_offset = len(header_objs) + 1  # 6

        img_map: dict[str, int] = {}
        for name in self.images:
            curr_id = base_offset + len(img_map)
            img_map[name] = curr_id
            image_xobjects.append(f"/{name} {curr_id} 0 R")

        final_objects.extend(self.objects)

        page_obj_num = len(final_objects) + 1
        contents_obj_num = page_obj_num + 1

        # Fix Pages object kids pointer
        final_objects[1] = f"<< /Type /Pages /Kids [{page_obj_num} 0 R] /Count 1 >>".encode("latin1")

        # Resources dictionary
        xobj_dict = " ".join(image_xobjects)
        res_dict = (
            f"<< /Font << /F1 {f1_num} 0 R /F2 {f2_num} 0 R /F3 {f3_num} 0 R >> "
            f"/XObject << {xobj_dict} >> >>"
        )

        page_obj = (
            f"<< /Type /Page /Parent {pages_num} 0 R /MediaBox [0 0 {self.width:.2f} {self.height:.2f}] "
            f"/Resources {res_dict} /Contents {contents_obj_num} 0 R >>"
        ).encode("latin1")
        final_objects.append(page_obj)

        # Build stream content
        raw_stream = "\n".join(self.commands).encode("latin1")
        compressed_stream = zlib.compress(raw_stream)
        stream_obj = (
            f"<< /Length {len(compressed_stream)} /Filter /FlateDecode >>\nstream\n".encode("latin1")
            + compressed_stream
            + b"\nendstream"
        )
        final_objects.append(stream_obj)

        # Assemble PDF file
        out = io.BytesIO()
        out.write(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        offsets: list[int] = []

        for idx, obj in enumerate(final_objects, 1):
            offsets.append(out.tell())
            out.write(f"{idx} 0 obj\n".encode("latin1"))
            out.write(obj)
            out.write(b"\nendobj\n")

        xref_pos = out.tell()
        out.write(f"xref\n0 {len(final_objects) + 1}\n".encode("latin1"))
        out.write(b"0000000000 65535 f \n")
        for off in offsets:
            out.write(f"{off:010d} 00000 n \n".encode("latin1"))

        trailer = (
            f"trailer\n<< /Size {len(final_objects) + 1} /Root {catalog_num} 0 R >>\n"
            f"startxref\n{xref_pos}\n%%EOF\n"
        ).encode("latin1")
        out.write(trailer)

        return out.getvalue()


def generate_screening_pdf(record_data: dict[str, Any]) -> bytes:
    """Generate a publication-grade A4 clinical decision support screening report."""
    pdf = PDFBuilder(width=595.28, height=841.89)

    # Margins and layout coordinates
    left = 36.0
    width = 523.28
    y = 805.0

    # 1. Header Banner (Deep Navy / Teal Medical Aesthetic)
    pdf.add_rect(left, y - 55, width, 55, fill_rgb=(0.04, 0.15, 0.28))
    pdf.add_text("RetinaScreen AI", left + 14, y - 22, font="/F2", size=16, rgb=(1.0, 1.0, 1.0))
    pdf.add_text(
        "Diabetic Retinopathy Clinical Screening & Explainability Report",
        left + 14,
        y - 38,
        font="/F1",
        size=10,
        rgb=(0.85, 0.92, 0.98),
    )

    now_str = datetime.now().strftime("%B %d, %Y - %H:%M UTC")
    pdf.add_text("CONFIDENTIAL MEDICAL RECORD", left + width - 180, y - 22, font="/F2", size=8, rgb=(0.95, 0.75, 0.3))
    pdf.add_text(f"Generated: {now_str}", left + width - 180, y - 36, font="/F1", size=7.5, rgb=(0.7, 0.8, 0.9))

    y -= 68

    # 2. Patient Demographics & Examination Metadata Card
    pdf.add_rect(left, y - 72, width, 72, fill_rgb=(0.97, 0.98, 0.99), stroke_rgb=(0.82, 0.86, 0.9), line_width=1.0)
    pdf.add_rect(left, y - 18, width, 18, fill_rgb=(0.92, 0.95, 0.98))
    pdf.add_text("PATIENT DEMOGRAPHICS & CLINICAL INTAKE", left + 10, y - 13, font="/F2", size=8.5, rgb=(0.1, 0.25, 0.45))

    name = record_data.get("name") or "Anonymous Patient"
    patient_id = record_data.get("patient_id") or "N/A"
    age = record_data.get("age", "N/A")
    gender = record_data.get("gender") or "N/A"
    eye = record_data.get("eye_examined") or "Unspecified"
    diabetes_type = record_data.get("diabetes_type") or "Not Specified"
    diabetes_dur = record_data.get("diabetes_duration")
    dur_str = f" ({diabetes_dur} yrs)" if diabetes_dur else ""
    doctor = record_data.get("doctor_name") or "Attending Physician"
    created_at = record_data.get("created_at", "")[:10] or "N/A"

    # Row 1
    pdf.add_text(f"Patient Name: {name}", left + 10, y - 33, font="/F2", size=9)
    pdf.add_text(f"MRN / Patient ID: {patient_id}", left + 200, y - 33, font="/F1", size=9)
    pdf.add_text(f"Exam Date: {created_at}", left + 380, y - 33, font="/F1", size=9)

    # Row 2
    pdf.add_text(f"Age / Biological Sex: {age} yrs / {gender}", left + 10, y - 48, font="/F1", size=9)
    pdf.add_text(f"Examined Eye: {eye}", left + 200, y - 48, font="/F2", size=9, rgb=(0.05, 0.4, 0.25))
    pdf.add_text(f"Attending Doctor: {doctor}", left + 380, y - 48, font="/F1", size=9)

    # Row 3
    pdf.add_text(f"Diabetes History: {diabetes_type}{dur_str}", left + 10, y - 63, font="/F1", size=8.5)
    notes = record_data.get("clinical_notes") or "None noted"
    if len(notes) > 48:
        notes = notes[:45] + "..."
    pdf.add_text(f"Clinical Notes: {notes}", left + 200, y - 63, font="/F3", size=8.5, rgb=(0.3, 0.3, 0.3))

    y -= 85

    # 3. Diagnostic Screening Triage & Staging Banner
    tier = record_data.get("referable_tier") or "Low"
    is_rejected = record_data.get("quality_decision") == "reject-recapture"

    if is_rejected:
        banner_fill = (0.98, 0.92, 0.92)
        banner_stroke = (0.85, 0.2, 0.2)
        title_color = (0.75, 0.1, 0.1)
        status_text = "IMAGE REJECTED - RECAPTURE REQUIRED"
        subtitle = "Automated Image Quality Assessment (IQA) gate failed. Diagnostic inference halted for clinical safety."
    elif tier == "High":
        banner_fill = (0.99, 0.92, 0.92)
        banner_stroke = (0.88, 0.2, 0.25)
        title_color = (0.78, 0.1, 0.15)
        status_text = "HIGH RISK: REFERABLE DIABETIC RETINOPATHY (Grade 2+)"
        subtitle = "Prompt comprehensive dilated ophthalmoscopic evaluation by an ophthalmologist recommended."
    elif tier == "Moderate":
        banner_fill = (0.99, 0.96, 0.9)
        banner_stroke = (0.85, 0.55, 0.1)
        title_color = (0.75, 0.4, 0.05)
        status_text = "MODERATE RISK: MONITORING & SPECIALIST EVALUATION ADVISED"
        subtitle = "Clinical follow-up advised within 3-6 months to assess early vascular changes."
    else:
        banner_fill = (0.92, 0.98, 0.94)
        banner_stroke = (0.1, 0.6, 0.35)
        title_color = (0.05, 0.45, 0.25)
        status_text = "LOW RISK: NO REFERABLE DIABETIC RETINOPATHY"
        subtitle = "Routine annual diabetic retinal surveillance recommended. Glycemic & pressure control advised."

    pdf.add_rect(left, y - 56, width, 56, fill_rgb=banner_fill, stroke_rgb=banner_stroke, line_width=1.2)
    pdf.add_text(status_text, left + 14, y - 20, font="/F2", size=11, rgb=title_color)
    pdf.add_text(subtitle, left + 14, y - 36, font="/F1", size=8.5, rgb=(0.2, 0.2, 0.2))

    # Metrics row inside banner
    prob = record_data.get("referable_probability")
    prob_str = f"{prob * 100:.1f}%" if prob is not None else "N/A"
    grade_lbl = record_data.get("grade_label") or ("Ungradable" if is_rejected else "Normal")
    grade_conf = record_data.get("grade_confidence")
    conf_str = f"{grade_conf * 100:.1f}%" if grade_conf is not None else "N/A"
    concordance = "Concordant" if record_data.get("models_agree") else "Discordant Review"

    if is_rejected:
        stat_line = "Image Quality: Suboptimal (Retake Required)  |  Diagnostic Staging: Ungradable"
    else:
        stat_line = f"Referable Risk: {prob_str}  |  Severity: {grade_lbl} (Conf: {conf_str})  |  Dual CNN: {concordance}"

    pdf.add_text(stat_line, left + 14, y - 49, font="/F2", size=8, rgb=(0.15, 0.15, 0.15))

    y -= 68

    # 4. Photographic Evidence & Grad-CAM Visual Heatmaps (Side-by-Side)
    box_w = 254.0
    box_h = 175.0
    gap = width - (box_w * 2)

    # Left: Preprocessed Fundus Photograph
    pdf.add_rect(left, y - box_h, box_w, box_h, fill_rgb=(0.98, 0.98, 0.99), stroke_rgb=(0.85, 0.88, 0.92))
    pdf.add_rect(left, y - 18, box_w, 18, fill_rgb=(0.94, 0.96, 0.98))
    pdf.add_text("ACQUIRED COLOR FUNDUS PHOTOGRAPH", left + 8, y - 13, font="/F2", size=7.5, rgb=(0.15, 0.25, 0.4))

    prep_img = record_data.get("preprocessed_image")
    pdf.add_image_from_data_url(prep_img, left + 55, y - box_h + 10, 144, 144, "[Fundus Photo]")

    # Right: Grad-CAM Explainability Heatmap
    right_box_x = left + box_w + gap
    pdf.add_rect(right_box_x, y - box_h, box_w, box_h, fill_rgb=(0.98, 0.98, 0.99), stroke_rgb=(0.85, 0.88, 0.92))
    pdf.add_rect(right_box_x, y - 18, box_w, 18, fill_rgb=(0.94, 0.96, 0.98))
    pdf.add_text("GRAD-CAM DEEP ACTIVATION HEATMAP (CONV5)", right_box_x + 8, y - 13, font="/F2", size=7.5, rgb=(0.15, 0.25, 0.4))

    heat_img = record_data.get("heatmap_image")
    pdf.add_image_from_data_url(heat_img, right_box_x + 55, y - box_h + 10, 144, 144, "[Heatmap Unavailable]")

    y -= (box_h + 12)

    # 5. Image Quality Assessment (IQA) & Gradability Audit
    pdf.add_rect(left, y - 56, width, 56, fill_rgb=(1.0, 1.0, 1.0), stroke_rgb=(0.85, 0.85, 0.85))
    pdf.add_rect(left, y - 16, width, 16, fill_rgb=(0.94, 0.95, 0.97))
    pdf.add_text("AUTOMATED IMAGE QUALITY ASSESSMENT (IQA) AUDIT", left + 8, y - 12, font="/F2", size=7.5, rgb=(0.2, 0.2, 0.3))

    fov = record_data.get("fov_ratio", 0.0)
    sharpness = record_data.get("sharpness", 0.0)
    illum = record_data.get("illumination_var", 0.0)
    contrast = record_data.get("vessel_contrast", 0.0)

    # IQA 4-column metric presentation
    col_w = width / 4.0
    c1 = left + 10
    c2 = left + col_w + 10
    c3 = left + col_w * 2 + 10
    c4 = left + col_w * 3 + 10

    pdf.add_text("Field-of-View (FOV)", c1, y - 28, font="/F1", size=7.5, rgb=(0.4, 0.4, 0.4))
    fov_pass = "PASS" if fov >= 0.20 else "FAIL"
    fov_color = (0.1, 0.55, 0.2) if fov_pass == "PASS" else (0.8, 0.1, 0.1)
    pdf.add_text(f"{fov * 100:.1f}% ({fov_pass})", c1, y - 44, font="/F2", size=8.5, rgb=fov_color)

    pdf.add_text("Laplacian Sharpness", c2, y - 28, font="/F1", size=7.5, rgb=(0.4, 0.4, 0.4))
    sharp_pass = "PASS" if sharpness >= 25.0 else "FAIL"
    sharp_color = (0.1, 0.55, 0.2) if sharp_pass == "PASS" else (0.8, 0.1, 0.1)
    pdf.add_text(f"{sharpness:.1f} ({sharp_pass})", c2, y - 44, font="/F2", size=8.5, rgb=sharp_color)

    pdf.add_text("Illumination Uniformity", c3, y - 28, font="/F1", size=7.5, rgb=(0.4, 0.4, 0.4))
    illum_pass = "PASS" if illum <= 0.45 else "FAIL"
    illum_color = (0.1, 0.55, 0.2) if illum_pass == "PASS" else (0.8, 0.1, 0.1)
    pdf.add_text(f"{illum:.2f} ({illum_pass})", c3, y - 44, font="/F2", size=8.5, rgb=illum_color)

    pdf.add_text("Vessel Sobel Contrast", c4, y - 28, font="/F1", size=7.5, rgb=(0.4, 0.4, 0.4))
    vess_pass = "PASS" if contrast >= 8.0 else "FAIL"
    vess_color = (0.1, 0.55, 0.2) if vess_pass == "PASS" else (0.8, 0.1, 0.1)
    pdf.add_text(f"{contrast:.1f} ({vess_pass})", c4, y - 44, font="/F2", size=8.5, rgb=vess_color)

    y -= 68

    # 6. Clinical Referral Guidelines & Care Protocol
    pdf.add_rect(left, y - 62, width, 62, fill_rgb=(0.97, 0.98, 0.99), stroke_rgb=(0.85, 0.88, 0.92))
    pdf.add_rect(left, y - 16, width, 16, fill_rgb=(0.92, 0.95, 0.98))
    pdf.add_text("RECOMMENDED CLINICAL ACTION PLAN & REFERRAL PROTOCOL", left + 8, y - 12, font="/F2", size=7.5, rgb=(0.15, 0.25, 0.45))

    if is_rejected:
        plan_line1 = "1. Re-acquisition of retinal fundus photograph required (image flagged as ungradable)."
        plan_line2 = "2. Ensure proper patient chin positioning, pupil dilation, and clear optical media."
        plan_line3 = "3. Automated diabetic retinopathy grading will be performed upon replacement photo submission."
    elif tier == "High":
        plan_line1 = "1. Urgent referral to a Vitreoretinal Specialist / Ophthalmologist within 2-4 weeks."
        plan_line2 = "2. High likelihood of sight-threatening retinopathy (proliferative DR or macular edema risk)."
        plan_line3 = "3. Coordinate immediate HbA1c, renal profile, and systemic blood pressure evaluation with PCP."
    elif tier == "Moderate":
        plan_line1 = "1. Non-urgent comprehensive dilated eye exam recommended within 3 to 6 months."
        plan_line2 = "2. Mild to moderate non-proliferative changes noted; assess microvascular progression."
        plan_line3 = "3. Reinforce diabetic glycemic targets (HbA1c < 7.0%) and lifestyle risk modification."
    else:
        plan_line1 = "1. Annual dilated retinal photography re-screening in 12 months."
        plan_line2 = "2. Patient displays no visible referable diabetic retinopathy on current photographic acquisition."
        plan_line3 = "3. Advise patient to seek prompt examination if acute visual disturbances, floaters, or blur occur."

    pdf.add_text(plan_line1, left + 10, y - 29, font="/F2", size=8, rgb=(0.1, 0.1, 0.1))
    pdf.add_text(plan_line2, left + 10, y - 42, font="/F1", size=8, rgb=(0.25, 0.25, 0.25))
    pdf.add_text(plan_line3, left + 10, y - 55, font="/F1", size=8, rgb=(0.25, 0.25, 0.25))

    y -= 74

    # 7. Attestation & Sign-off Footer
    pdf.add_line(left, y, left + 220, y, stroke_rgb=(0.5, 0.5, 0.5), line_width=0.8)
    pdf.add_line(left + width - 180, y, left + width, y, stroke_rgb=(0.5, 0.5, 0.5), line_width=0.8)

    pdf.add_text("Attending Clinician / Reviewing Physician Signature", left, y - 10, font="/F1", size=7.5, rgb=(0.4, 0.4, 0.4))
    pdf.add_text("Date & Clinical Seal", left + width - 180, y - 10, font="/F1", size=7.5, rgb=(0.4, 0.4, 0.4))

    # Regulatory Disclaimer
    pdf.add_text(
        "REGULATORY NOTICE: RetinaScreen AI is an automated decision-support instrument and does not provide an autonomous definitive diagnosis.",
        left,
        y - 25,
        font="/F3",
        size=6.5,
        rgb=(0.45, 0.45, 0.45),
    )
    pdf.add_text(
        "Final screening and therapeutic decisions remain the sole responsibility of the licensed attending eye care practitioner.",
        left,
        y - 34,
        font="/F3",
        size=6.5,
        rgb=(0.45, 0.45, 0.45),
    )

    return pdf.build()
