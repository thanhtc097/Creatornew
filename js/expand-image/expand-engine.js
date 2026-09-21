/**
 * AI Image Expander & Generative Fill Engine
 * Calculates canvas expansion dimensions, alignment offsets,
 * outpainting edge masks, and seamless composite blending.
 */

export const ASPECT_RATIOS = {
  "16:9": { label: "16:9 Landscape (YouTube)", ratio: 16 / 9 },
  "9:16": { label: "9:16 Vertical (TikTok, Reels, Shorts)", ratio: 9 / 16 },
  "1:1": { label: "1:1 Square (Instagram Feed)", ratio: 1 / 1 },
  "4:5": { label: "4:5 Portrait (Instagram Post)", ratio: 4 / 5 },
  "4:3": { label: "4:3 Standard Photo", ratio: 4 / 3 },
  "21:9": { label: "21:9 Ultrawide Cinema", ratio: 21 / 9 },
  "custom": { label: "Custom Expand", ratio: null },
};

/**
 * Calculates new canvas dimensions and placement coordinates for the source image.
 * @param {number} srcW - Original image width
 * @param {number} srcH - Original image height
 * @param {string} aspectKey - Key from ASPECT_RATIOS ("16:9", "9:16", "1:1", etc. or "custom")
 * @param {string} alignment - "center", "left", "right", "top", "bottom"
 * @param {object} customPadding - { top: number, bottom: number, left: number, right: number } (in pixels or %)
 * @param {number} maxDimension - Safety clamp for max canvas dimension
 */
export function calculateExpandedDimensions(
  srcW,
  srcH,
  aspectKey = "16:9",
  alignment = "center",
  customPadding = { top: 0, bottom: 0, left: 0, right: 0 },
  maxDimension = 4096
) {
  if (!srcW || !srcH || srcW <= 0 || srcH <= 0) {
    throw new Error("Invalid source image dimensions.");
  }

  let targetW = srcW;
  let targetH = srcH;
  let offsetX = 0;
  let offsetY = 0;

  if (aspectKey === "custom") {
    const padL = Math.max(0, Math.round(customPadding.left || 0));
    const padR = Math.max(0, Math.round(customPadding.right || 0));
    const padT = Math.max(0, Math.round(customPadding.top || 0));
    const padB = Math.max(0, Math.round(customPadding.bottom || 0));

    targetW = srcW + padL + padR;
    targetH = srcH + padT + padB;
    offsetX = padL;
    offsetY = padT;
  } else {
    const aspect = ASPECT_RATIOS[aspectKey];
    if (!aspect || !aspect.ratio) {
      throw new Error(`Unsupported aspect ratio key: ${aspectKey}`);
    }

    const currentRatio = srcW / srcH;
    const targetRatio = aspect.ratio;

    if (currentRatio < targetRatio) {
      // Need to expand width horizontally
      targetH = srcH;
      targetW = Math.round(srcH * targetRatio);
      const diffW = targetW - srcW;

      if (alignment === "left") {
        offsetX = 0;
      } else if (alignment === "right") {
        offsetX = diffW;
      } else {
        // center
        offsetX = Math.round(diffW / 2);
      }
      offsetY = 0;
    } else {
      // Need to expand height vertically
      targetW = srcW;
      targetH = Math.round(srcW / targetRatio);
      const diffH = targetH - srcH;

      offsetX = 0;
      if (alignment === "top") {
        offsetY = 0;
      } else if (alignment === "bottom") {
        offsetY = diffH;
      } else {
        // center
        offsetY = Math.round(diffH / 2);
      }
    }
  }

  // Safety downscale if target exceeds maxDimension
  if (targetW > maxDimension || targetH > maxDimension) {
    const scale = Math.min(maxDimension / targetW, maxDimension / targetH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
    offsetX = Math.round(offsetX * scale);
    offsetY = Math.round(offsetY * scale);
  }

  const origPixels = srcW * srcH;
  const targetPixels = targetW * targetH;
  const expansionPercent = Math.round(((targetPixels - origPixels) / origPixels) * 100);

  return {
    sourceWidth: srcW,
    sourceHeight: srcH,
    targetWidth: targetW,
    targetHeight: targetH,
    offsetX,
    offsetY,
    aspectKey,
    alignment,
    expansionPercent,
  };
}

/**
 * Creates an expanded canvas with edge extrapolation to provide
 * contextual texture continuity for the neural inpainting model.
 */
export function buildExpandedSourceCanvas(sourceImg, targetW, targetH, offsetX, offsetY, origW, origH) {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");

  // Step 1: Draw stretched / mirrored background to avoid hard black edges for inpainting
  ctx.save();
  ctx.filter = "blur(18px)";
  ctx.drawImage(sourceImg, 0, 0, targetW, targetH);
  ctx.restore();

  // Step 2: Draw the original crisp image at exact offset coordinates
  ctx.drawImage(sourceImg, offsetX, offsetY, origW, origH);

  return canvas;
}

/**
 * Generates an outpainting mask canvas.
 * Pixels inside the original image bounds have mask = 0 (keep).
 * Pixels in the expanded padding + user painted brush areas have mask = 255 (inpaint).
 */
export function buildOutpaintMaskCanvas(
  targetW,
  targetH,
  offsetX,
  offsetY,
  origW,
  origH,
  userMaskCanvas = null,
  feather = 4
) {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");

  // Fill entire canvas with white (255 = inpaint all)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);

  // Punch out the original image rectangle with black (0 = keep untouched)
  // Contract slightly by feather pixels so the neural model blends across the boundary seam smoothly
  const innerX = Math.max(0, offsetX + feather);
  const innerY = Math.max(0, offsetY + feather);
  const innerW = Math.max(1, origW - feather * 2);
  const innerH = Math.max(1, origH - feather * 2);

  ctx.fillStyle = "#000000";
  ctx.fillRect(innerX, innerY, innerW, innerH);

  // If user painted custom mask strokes inside the image (generative fill), draw them in white
  if (userMaskCanvas) {
    ctx.drawImage(userMaskCanvas, offsetX, offsetY, origW, origH);
  }

  return canvas;
}

/**
 * Converts ImageData to planar Float32Array RGB [1, 3, size, size]
 * for the LaMa neural network.
 */
export function rgbaToPlanarRgb(imageData, targetSize = 512) {
  const pixels = targetSize * targetSize;
  const output = new Float32Array(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    output[i] = imageData.data[i * 4] / 255;
    output[pixels + i] = imageData.data[i * 4 + 1] / 255;
    output[pixels * 2 + i] = imageData.data[i * 4 + 2] / 255;
  }
  return output;
}

/**
 * Converts Mask ImageData to Float32Array [1, 1, size, size] (1 = inpaint, 0 = keep).
 */
export function maskToFloatArray(maskImageData, targetSize = 512) {
  const pixels = targetSize * targetSize;
  const output = new Float32Array(pixels);
  for (let i = 0; i < pixels; i++) {
    // Check red or alpha channel
    output[i] = maskImageData.data[i * 4] > 128 || maskImageData.data[i * 4 + 3] > 128 ? 1.0 : 0.0;
  }
  return output;
}

/**
 * Composites the neural inpainting result back into the expanded canvas.
 * Preserves 100% of the original source image pixels, seamlessly feathering the generated outer regions.
 */
export function compositeExpandedResult(
  sourceImg,
  inpaintCanvas512,
  targetW,
  targetH,
  offsetX,
  offsetY,
  origW,
  origH,
  userMaskCanvas = null
) {
  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = targetW;
  finalCanvas.height = targetH;
  const ctx = finalCanvas.getContext("2d");

  // Step 1: Draw the full-resolution AI generated background
  ctx.drawImage(inpaintCanvas512, 0, 0, targetW, targetH);

  // Step 2: Composite the original photo over the center, masking out any custom user brush strokes
  if (userMaskCanvas) {
    // Cut out user painted strokes from original image before drawing
    const maskedSource = document.createElement("canvas");
    maskedSource.width = origW;
    maskedSource.height = origH;
    const mCtx = maskedSource.getContext("2d");
    mCtx.drawImage(sourceImg, 0, 0, origW, origH);
    mCtx.globalCompositeOperation = "destination-out";
    mCtx.drawImage(userMaskCanvas, 0, 0, origW, origH);

    ctx.drawImage(maskedSource, offsetX, offsetY, origW, origH);
  } else {
    // Draw original image cleanly
    ctx.drawImage(sourceImg, offsetX, offsetY, origW, origH);
  }

  return finalCanvas;
}
