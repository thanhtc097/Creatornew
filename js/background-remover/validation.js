export const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_PROCESSING_PIXELS = 12_000_000;

export class ValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

export function validateFileMetadata(file) {
  if (!file) throw new ValidationError("invalid-file", "Choose an image first.");
  if (!SUPPORTED_TYPES.includes(file.type)) {
    throw new ValidationError("invalid-file", "Choose a JPG, PNG or WebP image.");
  }
  if (!file.size || file.size > MAX_FILE_SIZE) {
    throw new ValidationError("invalid-file", "The image must be smaller than 25 MB.");
  }
  return true;
}

export function calculateWorkingSize(width, height, maxPixels = MAX_PROCESSING_PIXELS) {
  const pixels = width * height;
  if (pixels <= maxPixels) return { width, height, reduced: false, scale: 1 };
  const scale = Math.sqrt(maxPixels / pixels);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    reduced: true,
    scale,
  };
}

export async function decodeAndValidate(file) {
  validateFileMetadata(file);
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new ValidationError("invalid-file", "This image is damaged or cannot be decoded.");
  }
  if (!bitmap.width || !bitmap.height) {
    bitmap.close?.();
    throw new ValidationError("invalid-file", "This image has invalid dimensions.");
  }
  const working = calculateWorkingSize(bitmap.width, bitmap.height);
  return { bitmap, width: bitmap.width, height: bitmap.height, working };
}
