/**
 * AI Image Upscaler & Enhancer Core Engine
 * High-performance, client-side algorithms for super-resolution,
 * deblurring, sharpness recovery, and edge-preserving noise reduction.
 */

/**
 * Calculates new dimensions and stats for upscaling.
 * @param {number} width - Original width
 * @param {number} height - Original height
 * @param {number} factor - Scale factor (2, 4, 8)
 * @param {number} maxDimension - Safe max dimension clamp to prevent OOM
 */
export function calculateUpscaleDimensions(width, height, factor = 2, maxDimension = 8192) {
  if (!width || !height || width <= 0 || height <= 0) {
    throw new Error("Invalid image dimensions.");
  }
  const safeFactor = Math.max(1, Math.min(8, Number(factor) || 2));
  let targetWidth = Math.round(width * safeFactor);
  let targetHeight = Math.round(height * safeFactor);

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const originalPixels = width * height;
  const targetPixels = targetWidth * targetHeight;
  const pixelIncreasePercent = Math.round(((targetPixels - originalPixels) / originalPixels) * 100);

  return {
    originalWidth: width,
    originalHeight: height,
    targetWidth,
    targetHeight,
    factor: safeFactor,
    originalMegapixels: +(originalPixels / 1_000_000).toFixed(2),
    targetMegapixels: +(targetPixels / 1_000_000).toFixed(2),
    pixelIncreasePercent,
  };
}

/**
 * Clamps a numerical value between min and max.
 */
export function clamp(val, min = 0, max = 255) {
  return val < min ? min : val > max ? max : val;
}

/**
 * Cubic interpolation kernel (Mitchell-Netravali / Catmull-Rom variant, B=0, C=0.5)
 */
function cubicHermite(A, B, C, D, t) {
  const a = -A / 2 + (3 * B) / 2 - (3 * C) / 2 + D / 2;
  const b = A - (5 * B) / 2 + 2 * C - D / 2;
  const c = -A / 2 + C / 2;
  const d = B;
  return a * t * t * t + b * t * t + c * t + d;
}

/**
 * High-fidelity 16-point Bicubic Resampling.
 * Interpolates pixels with cubic splines for smooth gradients and crisp edges.
 */
export function resampleBicubic(sourceData, srcW, srcH, destW, destH) {
  const result = new Uint8ClampedArray(destW * destH * 4);
  const xRatio = (srcW - 1) / Math.max(1, destW - 1);
  const yRatio = (srcH - 1) / Math.max(1, destH - 1);

  for (let dy = 0; dy < destH; dy++) {
    const srcY = dy * yRatio;
    const y1 = Math.floor(srcY);
    const yDiff = srcY - y1;
    const y0 = Math.max(0, y1 - 1);
    const y2 = Math.min(srcH - 1, y1 + 1);
    const y3 = Math.min(srcH - 1, y1 + 2);

    for (let dx = 0; dx < destW; dx++) {
      const srcX = dx * xRatio;
      const x1 = Math.floor(srcX);
      const xDiff = srcX - x1;
      const x0 = Math.max(0, x1 - 1);
      const x2 = Math.min(srcW - 1, x1 + 1);
      const x3 = Math.min(srcW - 1, x1 + 2);

      const destIdx = (dy * destW + dx) * 4;

      // For R, G, B, A channels
      for (let c = 0; c < 4; c++) {
        // Sample 4x4 neighborhood
        const col0 = cubicHermite(
          sourceData[(y0 * srcW + x0) * 4 + c],
          sourceData[(y0 * srcW + x1) * 4 + c],
          sourceData[(y0 * srcW + x2) * 4 + c],
          sourceData[(y0 * srcW + x3) * 4 + c],
          xDiff
        );
        const col1 = cubicHermite(
          sourceData[(y1 * srcW + x0) * 4 + c],
          sourceData[(y1 * srcW + x1) * 4 + c],
          sourceData[(y1 * srcW + x2) * 4 + c],
          sourceData[(y1 * srcW + x3) * 4 + c],
          xDiff
        );
        const col2 = cubicHermite(
          sourceData[(y2 * srcW + x0) * 4 + c],
          sourceData[(y2 * srcW + x1) * 4 + c],
          sourceData[(y2 * srcW + x2) * 4 + c],
          sourceData[(y2 * srcW + x3) * 4 + c],
          xDiff
        );
        const col3 = cubicHermite(
          sourceData[(y3 * srcW + x0) * 4 + c],
          sourceData[(y3 * srcW + x1) * 4 + c],
          sourceData[(y3 * srcW + x2) * 4 + c],
          sourceData[(y3 * srcW + x3) * 4 + c],
          xDiff
        );

        const val = cubicHermite(col0, col1, col2, col3, yDiff);
        result[destIdx + c] = clamp(Math.round(val));
      }
    }
  }

  return result;
}

/**
 * Directional Edge Refinement (Super-Resolution Edge Polishing).
 * Eliminates jagged staircase artifacts along high-contrast diagonal contours.
 */
export function refineEdges(pixels, width, height, strength = 0.5) {
  if (strength <= 0) return pixels;
  const output = new Uint8ClampedArray(pixels);
  const blend = Math.min(1, Math.max(0, strength));

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Compute Sobel gradients in luminance
      const lum = (offset) => {
        const i = idx + offset;
        return pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      };

      const top = -width * 4;
      const btm = width * 4;

      const gx =
        -lum(top - 4) + lum(top + 4) -
        2 * lum(-4) + 2 * lum(4) -
        lum(btm - 4) + lum(btm + 4);

      const gy =
        -lum(top - 4) - 2 * lum(top) - lum(top + 4) +
        lum(btm - 4) + 2 * lum(btm) + lum(btm + 4);

      const edgeMagnitude = Math.sqrt(gx * gx + gy * gy);

      // If on an edge, interpolate along edge direction rather than across
      if (edgeMagnitude > 30) {
        const nx = -gy / edgeMagnitude;
        const ny = gx / edgeMagnitude;

        // Sample neighboring pixels along tangent
        const sX = Math.round(nx);
        const sY = Math.round(ny);
        const p1 = ((y + sY) * width + (x + sX)) * 4;
        const p2 = ((y - sY) * width + (x - sX)) * 4;

        if (p1 >= 0 && p1 < pixels.length && p2 >= 0 && p2 < pixels.length) {
          for (let c = 0; c < 3; c++) {
            const edgeSmooth = (pixels[p1 + c] + pixels[p2 + c]) * 0.5;
            output[idx + c] = clamp(
              Math.round(pixels[idx + c] * (1 - blend * 0.4) + edgeSmooth * (blend * 0.4))
            );
          }
        }
      }
    }
  }

  return output;
}

/**
 * Adaptive Deblur & High-Pass Unsharp Masking.
 * Recovers fine lines, facial features, and textures from blurry photos.
 * Employs halo-suppression so sharp edges do not produce ugly white rings.
 * @param {Uint8ClampedArray} pixels - Image RGBA buffer
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} amount - Deblur intensity (0 to 2)
 * @param {number} radius - Kernel radius (1 or 2)
 * @param {number} threshold - Min contrast difference before boosting
 */
export function adaptiveDeblur(pixels, width, height, amount = 1.0, radius = 1, threshold = 2) {
  if (amount <= 0) return pixels;
  const output = new Uint8ClampedArray(pixels);

  // Fast 3x3 or 5x5 box blur approximation of low-frequency base
  const blurred = boxBlur(pixels, width, height, radius);

  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      const orig = pixels[i + c];
      const blur = blurred[i + c];
      const diff = orig - blur;

      if (Math.abs(diff) >= threshold) {
        // Non-linear dampening to suppress halo artifacts around hard edges
        const haloLimiter = Math.tanh(diff / 64) * 64;
        const sharpened = orig + haloLimiter * amount;
        output[i + c] = clamp(Math.round(sharpened));
      }
    }
    // Alpha channel unchanged
    output[i + 3] = pixels[i + 3];
  }

  return output;
}

/**
 * Fast box blur helper for high-frequency extraction.
 */
function boxBlur(pixels, width, height, radius = 1) {
  const output = new Uint8ClampedArray(pixels.length);
  const diameter = radius * 2 + 1;
  const kernelArea = diameter * diameter;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let ky = -radius; ky <= radius; ky++) {
        const ny = Math.min(height - 1, Math.max(0, y + ky));
        for (let kx = -radius; kx <= radius; kx++) {
          const nx = Math.min(width - 1, Math.max(0, x + kx));
          const idx = (ny * width + nx) * 4;
          r += pixels[idx];
          g += pixels[idx + 1];
          b += pixels[idx + 2];
        }
      }
      const outIdx = (y * width + x) * 4;
      output[outIdx] = Math.round(r / kernelArea);
      output[outIdx + 1] = Math.round(g / kernelArea);
      output[outIdx + 2] = Math.round(b / kernelArea);
      output[outIdx + 3] = pixels[outIdx + 3];
    }
  }

  return output;
}

/**
 * Edge-Preserving Bilateral Denoising.
 * Cleans compression grain, digital sensor noise, and mosquito artifacts.
 */
export function edgePreservingDenoise(pixels, width, height, sigmaSpatial = 1.5, sigmaColor = 25) {
  if (sigmaSpatial <= 0 || sigmaColor <= 0) return pixels;
  const output = new Uint8ClampedArray(pixels);
  const radius = Math.ceil(sigmaSpatial);
  const colorCoeff = -0.5 / (sigmaColor * sigmaColor);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerIdx = (y * width + x) * 4;
      const cR = pixels[centerIdx];
      const cG = pixels[centerIdx + 1];
      const cB = pixels[centerIdx + 2];

      let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;

      for (let ky = -radius; ky <= radius; ky++) {
        const ny = Math.min(height - 1, Math.max(0, y + ky));
        for (let kx = -radius; kx <= radius; kx++) {
          const nx = Math.min(width - 1, Math.max(0, x + kx));
          const neighborIdx = (ny * width + nx) * 4;

          const nR = pixels[neighborIdx];
          const nG = pixels[neighborIdx + 1];
          const nB = pixels[neighborIdx + 2];

          // Spatial distance squared
          const spatialDistSq = kx * kx + ky * ky;
          // Color Euclidean distance squared
          const colorDistSq = (cR - nR) ** 2 + (cG - nG) ** 2 + (cB - nB) ** 2;

          const weight = Math.exp(-0.5 * spatialDistSq / (sigmaSpatial * sigmaSpatial) + colorDistSq * colorCoeff);

          sumR += nR * weight;
          sumG += nG * weight;
          sumB += nB * weight;
          sumWeight += weight;
        }
      }

      output[centerIdx] = clamp(Math.round(sumR / sumWeight));
      output[centerIdx + 1] = clamp(Math.round(sumG / sumWeight));
      output[centerIdx + 2] = clamp(Math.round(sumB / sumWeight));
      output[centerIdx + 3] = pixels[centerIdx + 3];
    }
  }

  return output;
}

/**
 * Local Contrast & Dynamic Range Optimization (CLAHE-inspired).
 * Lifts veiled shadows and brings out micro-textures (hair, skin, fabric).
 */
export function enhanceMicroContrast(pixels, width, height, contrastFactor = 0.15) {
  if (contrastFactor === 0) return pixels;
  const output = new Uint8ClampedArray(pixels);
  const factor = 1 + contrastFactor;

  for (let i = 0; i < pixels.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      // S-curve centered at midtone (128)
      const val = pixels[i + c];
      const normalized = (val - 128) / 128;
      const curved = Math.sign(normalized) * Math.pow(Math.abs(normalized), 1 / factor);
      output[i + c] = clamp(Math.round(curved * 128 + 128));
    }
  }

  return output;
}

/**
 * Preset configuration mappings.
 */
export const ENHANCER_PRESETS = {
  clarity: {
    id: "clarity",
    name: "Ultra Clarity (General Photo)",
    deblurAmount: 1.1,
    denoiseSigma: 1.0,
    edgeStrength: 0.6,
    contrast: 0.12,
  },
  portrait: {
    id: "portrait",
    name: "Face & Portrait Recovery",
    deblurAmount: 0.85,
    denoiseSigma: 1.6, // Higher denoise for smoother skin
    edgeStrength: 0.7, // Sharp eyes and contour
    contrast: 0.08,
  },
  anime: {
    id: "anime",
    name: "Anime & Digital Art",
    deblurAmount: 1.3,
    denoiseSigma: 2.2, // Clean flat color areas
    edgeStrength: 0.9, // Ultra crisp line-art
    contrast: 0.16,
  },
  document: {
    id: "document",
    name: "Text & Document Clarity",
    deblurAmount: 1.5,
    denoiseSigma: 1.8,
    edgeStrength: 0.8,
    contrast: 0.25, // High contrast for clean text
  },
};

/**
 * Master multi-pass enhancement pipeline.
 * Runs all stages according to preset and user customization.
 */
export function runEnhancePipeline(sourceData, srcW, srcH, destW, destH, options = {}, onProgress = () => {}) {
  const {
    preset = "clarity",
    deblurMultiplier = 1.0,
    denoiseMultiplier = 1.0,
    edgeMultiplier = 1.0,
    contrastMultiplier = 1.0,
  } = options;

  const baseConfig = ENHANCER_PRESETS[preset] || ENHANCER_PRESETS.clarity;

  // Stage 1: Resampling (Bicubic interpolation to target size)
  onProgress({ stage: "resampling", progress: 20, message: "Expanding pixel dimensions..." });
  let pixels = resampleBicubic(sourceData, srcW, srcH, destW, destH);

  // Stage 2: Edge-Preserving Denoising
  const denoiseSigma = baseConfig.denoiseSigma * denoiseMultiplier;
  if (denoiseSigma > 0.1) {
    onProgress({ stage: "denoising", progress: 50, message: "Smoothing noise & compression artifacts..." });
    pixels = edgePreservingDenoise(pixels, destW, destH, denoiseSigma, 22);
  }

  // Stage 3: Directional Edge Refinement
  const edgeStrength = baseConfig.edgeStrength * edgeMultiplier;
  if (edgeStrength > 0.05) {
    onProgress({ stage: "edges", progress: 70, message: "Refining edge contours..." });
    pixels = refineEdges(pixels, destW, destH, edgeStrength);
  }

  // Stage 4: Deblur & Sharpening
  const deblurAmount = baseConfig.deblurAmount * deblurMultiplier;
  if (deblurAmount > 0.05) {
    onProgress({ stage: "deblur", progress: 85, message: "Deblurring and recovering micro-details..." });
    pixels = adaptiveDeblur(pixels, destW, destH, deblurAmount, 1, 2);
  }

  // Stage 5: Local Micro-Contrast Tuning
  const contrastFactor = baseConfig.contrast * contrastMultiplier;
  if (Math.abs(contrastFactor) > 0.01) {
    onProgress({ stage: "contrast", progress: 95, message: "Balancing dynamic contrast..." });
    pixels = enhanceMicroContrast(pixels, destW, destH, contrastFactor);
  }

  onProgress({ stage: "complete", progress: 100, message: "Ready!" });
  return pixels;
}
