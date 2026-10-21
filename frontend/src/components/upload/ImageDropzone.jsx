import React, { useRef, useState, useCallback, useEffect } from "react";
import { UploadCloud, Camera, Image as ImageIcon, AlertCircle, X, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * Accessible drag-and-drop file upload target with direct WebRTC camera capture support.
 * @param {{
 *   onFileSelected: (file: File) => void,
 *   disabled?: boolean,
 *   error?: { code: string, message: string } | null
 * }} props
 */
export function ImageDropzone({ onFileSelected, disabled = false, error = null }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [stream, setStream] = useState(null);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Connect stream to video element when camera becomes active
  useEffect(() => {
    if (isCameraActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraActive, stream]);

  // Start WebRTC live camera
  const startCamera = async () => {
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera access is not supported by your browser. Please use Chrome, Edge, Safari, or upload an image file.");
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Camera access was denied. Please allow camera permissions in your browser address bar and try again.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraError("No connected camera found on your system.");
      } else {
        setCameraError(`Camera initialization failed: ${err.message || "Unknown error"}`);
      }
    }
  };

  // Capture current video frame to image file
  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvasRef.current = canvas;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const file = new File([blob], `camera-capture-${timestamp}.jpg`, {
            type: "image/jpeg",
          });
          stopCamera();
          onFileSelected(file);
        }
      },
      "image/jpeg",
      0.95
    );
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      const droppedFiles = e.dataTransfer?.files;
      if (droppedFiles && droppedFiles.length > 0) {
        onFileSelected(droppedFiles[0]);
      }
    },
    [disabled, onFileSelected]
  );

  const handleFileChange = useCallback(
    (e) => {
      const selectedFiles = e.target.files;
      if (selectedFiles && selectedFiles.length > 0) {
        onFileSelected(selectedFiles[0]);
      }
      e.target.value = "";
    },
    [onFileSelected]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (disabled || isCameraActive) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        fileInputRef.current?.click();
      }
    },
    [disabled, isCameraActive]
  );

  return (
    <div className="w-full space-y-3">
      {/* Hidden File Input for standard file browsing */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        id="fundus-file-input"
        onChange={handleFileChange}
        disabled={disabled}
      />

      {isCameraActive ? (
        /* Live Camera Viewfinder State */
        <div className="relative w-full rounded-2xl bg-black border-2 border-emerald-600/80 overflow-hidden flex flex-col items-center justify-center p-4 shadow-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg aspect-video sm:aspect-[4/3] bg-black rounded-xl overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Circular Retinal Targeting Reticle */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-52 h-52 sm:w-64 sm:h-64 rounded-full border-2 border-emerald-400/70 shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-emerald-400/80" />
              </div>
            </div>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md text-[11px] text-slate-300 pointer-events-none">
              Align retina inside circle
            </div>
          </div>

          {/* Camera Controls */}
          <div className="flex items-center justify-center gap-3 pt-4 w-full">
            <button
              type="button"
              onClick={stopCamera}
              className="px-4 py-2 text-sm font-semibold rounded-xl text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={takePhoto}
              className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
            >
              <Camera className="w-4 h-4" />
              Take Photo
            </button>
          </div>
        </div>
      ) : (
        /* Standard Drag & Drop Surface */
        <>
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Upload retinal fundus photograph. Drag and drop file here, or press Enter to browse files."
            onClick={() => !disabled && fileInputRef.current?.click()}
            onKeyDown={handleKeyDown}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none outline-none",
              "focus-visible:ring-4 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-600",
              isDragOver
                ? "border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 scale-[1.01]"
                : "border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/50 hover:border-slate-400 dark:hover:border-slate-600",
              disabled && "opacity-60 cursor-not-allowed pointer-events-none",
              error && "border-rose-400 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/20"
            )}
          >
            <div className="w-16 h-16 mb-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-emerald-700 dark:text-emerald-400 transition-transform group-hover:scale-105">
              <UploadCloud className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Drag and drop your fundus photograph here
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 max-w-md">
              Or <span className="text-emerald-700 dark:text-emerald-400 font-medium underline underline-offset-2">browse files</span> from your computer or clinical storage
            </p>

            {/* Format Badges & Specifications */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
                <ImageIcon className="w-3.5 h-3.5" /> JPEG, PNG
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
                Max 10 MB
              </span>
              <span className="px-2.5 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700">
                Min 256×256 px
              </span>
            </div>
          </div>

          {/* Camera Capture Action */}
          <div className="flex items-center justify-center pt-1">
            <button
              type="button"
              onClick={startCamera}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg",
                "text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
                "hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-colors",
                "focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none"
              )}
            >
              <Camera className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              Capture with Camera
            </button>
          </div>
        </>
      )}

      {/* Camera Error Message Alert */}
      {cameraError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start justify-between gap-2.5 text-amber-900 dark:text-amber-200 text-sm animate-in fade-in"
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Camera Notice: </span>
              {cameraError}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCameraError(null)}
            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900 rounded text-amber-700 dark:text-amber-300 shrink-0"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* General Validation Error Alert */}
      {error && !cameraError && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-rose-900 dark:text-rose-200 text-sm animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">{error.code ? `Error (${error.code}): ` : "Validation Error: "}</span>
            {error.message}
          </div>
        </div>
      )}
    </div>
  );
}
