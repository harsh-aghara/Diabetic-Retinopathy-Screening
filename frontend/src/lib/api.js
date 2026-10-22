/**
 * Typed client API layer communicating with the FastAPI Diabetic Retinopathy screening backend.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

/**
 * Standard typed API error with machine-readable code.
 */
export class ApiError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Submit retinal fundus photograph with optional patient intake metadata.
 * @param {File | Blob} file - The image file to analyze
 * @param {object|null} [patientData] - Optional patient demographics & history
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Optional abort signal
 * @returns {Promise<any>}
 */
export async function predictFundusImage(file, patientData = null, { signal } = {}) {
  const formData = new FormData();
  formData.append("file", file);

  if (patientData) {
    if (patientData.name) formData.append("patient_name", patientData.name);
    if (patientData.age) formData.append("patient_age", String(patientData.age));
    if (patientData.gender) formData.append("patient_gender", patientData.gender);
    if (patientData.patient_id) formData.append("patient_id", patientData.patient_id);
    if (patientData.contact) formData.append("contact", patientData.contact);
    if (patientData.diabetes_type) formData.append("diabetes_type", patientData.diabetes_type);
    if (patientData.diabetes_duration) formData.append("diabetes_duration", String(patientData.diabetes_duration));
    if (patientData.eye_examined) formData.append("eye_examined", patientData.eye_examined);
    if (patientData.doctor_name) formData.append("doctor_name", patientData.doctor_name);
    if (patientData.clinical_notes) formData.append("clinical_notes", patientData.clinical_notes);
  }

  let response;
  try {
    response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      body: formData,
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") {
      throw err;
    }
    throw new ApiError(
      "network_error",
      "Unable to connect to the screening server. Please verify backend service availability.",
      0
    );
  }

  if (!response.ok) {
    let errorDetail = null;
    try {
      const errorJson = await response.json();
      errorDetail = errorJson.detail;
    } catch {
      // response was not JSON
    }

    const code = errorDetail?.code || `http_${response.status}`;
    const message =
      errorDetail?.message ||
      (response.status === 413
        ? "Uploaded image exceeds the 10 MB limit."
        : response.status === 415
        ? "Unsupported file format. Please upload a JPEG or PNG fundus photograph."
        : response.status === 503
        ? "Screening AI models are currently loading or unavailable."
        : `Screening API error (Status ${response.status})`);

    throw new ApiError(code, message, response.status);
  }

  return response.json();
}

/**
 * Fetch patient screening records with search query and tier filter.
 * @param {{ search?: string, tier?: string, limit?: number, offset?: number }} [params]
 */
export async function fetchRecords({ search, tier, limit = 100, offset = 0 } = {}) {
  const query = new URLSearchParams();
  if (search) query.set("search", search);
  if (tier && tier !== "all") query.set("tier", tier);
  query.set("limit", String(limit));
  query.set("offset", String(offset));

  const response = await fetch(`${API_BASE}/records?${query.toString()}`);
  if (!response.ok) {
    throw new ApiError("fetch_records_failed", "Failed to retrieve patient records.", response.status);
  }
  return response.json();
}

/**
 * Retrieve summary screening statistics for records dashboard.
 */
export async function fetchRecordsStats() {
  const response = await fetch(`${API_BASE}/records/stats`);
  if (!response.ok) {
    throw new ApiError("fetch_stats_failed", "Failed to retrieve statistics.", response.status);
  }
  return response.json();
}

/**
 * Retrieve single screening record detail by ID.
 * @param {number|string} recordId
 */
export async function fetchRecordDetail(recordId) {
  const response = await fetch(`${API_BASE}/records/${recordId}`);
  if (!response.ok) {
    throw new ApiError("record_not_found", `Record ${recordId} not found.`, response.status);
  }
  return response.json();
}

/**
 * Delete a screening record by ID.
 * @param {number|string} recordId
 */
export async function deleteRecord(recordId) {
  const response = await fetch(`${API_BASE}/records/${recordId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new ApiError("delete_failed", "Failed to delete record.", response.status);
  }
  return response.json();
}

/**
 * Download official clinical PDF report by record ID.
 * @param {number|string} recordId
 * @param {string} [fallbackFilename]
 */
export async function downloadRecordPdf(recordId, fallbackFilename = `DR_Report_Rec${recordId}.pdf`) {
  const response = await fetch(`${API_BASE}/records/${recordId}/pdf`);
  if (!response.ok) {
    throw new ApiError("pdf_failed", "Failed to download clinical PDF report.", response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  let filename = fallbackFilename;
  if (disposition && disposition.includes("filename=")) {
    filename = disposition.split("filename=")[1].replace(/["']/g, "").trim();
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Generate and download PDF from current screening session data.
 * @param {object} patient
 * @param {object} screening
 * @param {string} [fallbackFilename]
 */
export async function downloadAdHocPdf(patient, screening, fallbackFilename = "DR_Screening_Report.pdf") {
  const response = await fetch(`${API_BASE}/reports/pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patient, screening }),
  });
  if (!response.ok) {
    throw new ApiError("pdf_failed", "Failed to generate report PDF.", response.status);
  }
  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition");
  let filename = fallbackFilename;
  if (disposition && disposition.includes("filename=")) {
    filename = disposition.split("filename=")[1].replace(/["']/g, "").trim();
  }
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Check backend service health, version, and model residency.
 * @returns {Promise<{ status: string, version: string, models_loaded: boolean }>}
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return { status: "offline", version: "unknown", models_loaded: false };
    return await response.json();
  } catch {
    return { status: "offline", version: "unknown", models_loaded: false };
  }
}

/**
 * Retrieve active neural network metadata and validation metrics.
 * @returns {Promise<any>}
 */
export async function getModelInfo() {
  const response = await fetch(`${API_BASE}/model/info`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new ApiError("model_info_failed", "Failed to retrieve model metadata.", response.status);
  }
  return response.json();
}
