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
 * Submit retinal fundus photograph for automated screening and Grad-CAM explainability.
 * @param {File | Blob} file - The image file to analyze
 * @param {object} [options]
 * @param {AbortSignal} [options.signal] - Optional abort signal
 * @returns {Promise<{
 *   quality: {
 *     decision: "accept" | "enhance-then-accept" | "reject-recapture",
 *     metrics: { fov_ratio: number, sharpness: number, illumination_var: number, vessel_contrast: number },
 *     reasons: string[]
 *   },
 *   result: {
 *     referable: { probability: number, label: string, tier: "Low" | "Moderate" | "High", confidence: number },
 *     grade: { predicted: number, label: string, confidence: number, probabilities: number[] },
 *     models_agree: boolean,
 *     images: { preprocessed_png: string, heatmap_referable_png: string, heatmap_grade_png: string }
 *   } | null
 * }>}
 */
export async function predictFundusImage(file, { signal } = {}) {
  const formData = new FormData();
  formData.append("file", file);

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
