export const DEFAULT_MAX_FILES = 20;
export const DEFAULT_MAX_FILE_SIZE = 50 * 1024 * 1024;
export const DEFAULT_SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function convertImage(file, outputType, outputQuality, resizeOptions = {}) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const targetSize = calculateTargetSize(
        image.naturalWidth,
        image.naturalHeight,
        resizeOptions
      );
      canvas.width = targetSize.width;
      canvas.height = targetSize.height;
      const context = canvas.getContext("2d");

      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas is not supported by this browser."));
        return;
      }

      if (outputType === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Unable to create the image."));
          }
        },
        outputType,
        outputType === "image/png" ? undefined : outputQuality
      );
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read image " + file.name));
    };

    image.src = url;
  });
}

export function calculateTargetSize(originalWidth, originalHeight, options = {}) {
  const requestedWidth = Number(options.width) || 0;
  const requestedHeight = Number(options.height) || 0;
  const maintainAspect = options.maintainAspect !== false;

  if (!requestedWidth && !requestedHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  if (!maintainAspect && requestedWidth && requestedHeight) {
    return { width: Math.round(requestedWidth), height: Math.round(requestedHeight) };
  }

  const widthRatio = requestedWidth ? requestedWidth / originalWidth : Infinity;
  const heightRatio = requestedHeight ? requestedHeight / originalHeight : Infinity;
  const scale = Math.min(widthRatio, heightRatio);

  return {
    width: Math.max(1, Math.round(originalWidth * scale)),
    height: Math.max(1, Math.round(originalHeight * scale)),
  };
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export function outputFileName(name, outputType, toolCode = "tool") {
  const cleanName = createSeoSlug(name.replace(/\.[^/.]+$/, ""));
  const extension = outputType === "image/jpeg" ? "jpg" : outputType.split("/")[1];
  return "creatornew-" + toolCode + "-" + (cleanName || "image") + "." + extension;
}

export function createSeoSlug(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function fileKey(file) {
  return [file.name, file.size, file.lastModified].join("::");
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0) + " " + units[index];
}

export function pause(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
