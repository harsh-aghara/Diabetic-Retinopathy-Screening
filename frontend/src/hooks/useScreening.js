import { useState, useCallback, useRef, useEffect } from "react";
import { predictFundusImage, ApiError } from "../lib/api";
import { validateImageFile } from "../lib/validateImage";

/**
 * Custom React hook managing fundus photo upload, validation, analysis, and lifecycle.
 */
export function useScreening() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [dimensions, setDimensions] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | validating | ready | analyzing | success | error
  const [screeningData, setScreeningData] = useState(null);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [previewUrl]);

  /**
   * Handle user file selection (via dropzone or input).
   */
  const selectFile = useCallback(
    async (newFile) => {
      if (!newFile) return;

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setError(null);
      setScreeningData(null);
      setStatus("validating");

      const validation = await validateImageFile(newFile);

      if (!validation.valid) {
        setFile(null);
        setPreviewUrl(null);
        setDimensions(null);
        setStatus("error");
        setError(validation.error || { code: "invalid_file", message: "Invalid image file." });
        return;
      }

      const url = URL.createObjectURL(newFile);
      setFile(newFile);
      setPreviewUrl(url);
      setDimensions(validation.dimensions || null);
      setStatus("ready");
    },
    [previewUrl]
  );

  /**
   * Clear currently selected image and reset to idle.
   */
  const clearFile = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setStatus("idle");
    setError(null);
    setScreeningData(null);
  }, [previewUrl]);

  /**
   * Submit selected image to backend inference pipeline.
   * @param {object|null} [patientData] - Optional patient demographic intake
   */
  const analyze = useCallback(async (patientData = null) => {
    if (!file) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("analyzing");
    setError(null);

    try {
      const data = await predictFundusImage(file, patientData, { signal: controller.signal });
      setScreeningData(data);
      setStatus("success");
      return data;
    } catch (err) {
      if (err.name === "AbortError") {
        setStatus("ready");
        return;
      }

      setStatus("error");
      if (err instanceof ApiError) {
        setError({ code: err.code, message: err.message, status: err.status });
      } else {
        setError({
          code: "unexpected_error",
          message: err.message || "An unexpected error occurred during analysis.",
        });
      }
    } finally {
      abortControllerRef.current = null;
    }
  }, [file]);

  /**
   * Cancel ongoing analysis request.
   */
  const cancelAnalysis = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus("ready");
  }, []);

  return {
    file,
    previewUrl,
    dimensions,
    status, // idle | validating | ready | analyzing | success | error
    isAnalyzing: status === "analyzing",
    isReady: status === "ready",
    screeningData,
    error,
    selectFile,
    clearFile,
    analyze,
    cancelAnalysis,
  };
}
