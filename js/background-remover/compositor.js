export function featherPixels(width, height) {
  return Math.min(24, Math.max(8, Math.round(Math.min(width, height) * 0.005)));
}

export function paddedBounds(bounds, width, height, padding = featherPixels(width, height) * 3) {
  return {
    x: Math.max(0, Math.floor(bounds.left * width) - padding),
    y: Math.max(0, Math.floor(bounds.top * height) - padding),
    right: Math.min(width, Math.ceil(bounds.right * width) + padding),
    bottom: Math.min(height, Math.ceil(bounds.bottom * height) + padding),
  };
}

export function rgbaToPlanarRgb(imageData, targetSize = 512) {
  const pixels = targetSize * targetSize;
  const output = new Float32Array(pixels * 3);
  for (let index = 0; index < pixels; index += 1) {
    output[index] = imageData.data[index * 4] / 255;
    output[pixels + index] = imageData.data[index * 4 + 1] / 255;
    output[pixels * 2 + index] = imageData.data[index * 4 + 2] / 255;
  }
  return output;
}

export function alphaToMask(imageData, targetSize = 512) {
  const output = new Float32Array(targetSize * targetSize);
  for (let index = 0; index < output.length; index += 1) output[index] = imageData.data[index * 4 + 3] > 8 ? 1 : 0;
  return output;
}

export async function canvasToBlob(canvas, type = "image/png") {
  return await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Unable to export image.")), type));
}
