/**
 * Client-side validation utility for retinal fundus photograph uploads.
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MIN_IMAGE_DIMENSION_PX = 256;
export const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/jpg"];

/**
 * Validate image file metadata and image dimensions client-side.
 * @param {File} file
 * @returns {Promise<{ valid: boolean, error?: { code: string, message: string }, dimensions?: { width: number, height: number } }>}
 */
export async function validateImageFile(file) {
  if (!file) {
    return {
      valid: false,
      error: { code: "no_file", message: "Please select an image file to analyze." },
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: {
        code: "file_too_large",
        message: `File size (${sizeMb} MB) exceeds maximum allowed size of 10 MB.`,
      },
    };
  }

  // Check mime type
  const isAcceptedType =
    ACCEPTED_MIME_TYPES.includes(file.type.toLowerCase()) ||
    /\.(jpe?g|png)$/i.test(file.name);

  if (!isAcceptedType) {
    return {
      valid: false,
      error: {
        code: "unsupported_type",
        message: "Only JPEG and PNG retinal photographs are supported.",
      },
    };
  }

  // Check bitmap decode and minimum resolution
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      if (Math.min(width, height) < MIN_IMAGE_DIMENSION_PX) {
        resolve({
          valid: false,
          error: {
            code: "image_too_small",
            message: `Image dimensions (${width}×${height}) are too low for diagnostic screening. Shortest side must be at least ${MIN_IMAGE_DIMENSION_PX}px.`,
          },
          dimensions: { width, height },
        });
      } else {
        resolve({
          valid: true,
          dimensions: { width, height },
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        error: {
          code: "undecodable_image",
          message: "The selected file is not a valid or readable image.",
        },
      });
    };

    img.src = objectUrl;
  });
}
