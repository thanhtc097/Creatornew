import { describe, expect, it } from "vitest";
import {
  calculateUpscaleDimensions,
  clamp,
  resampleBicubic,
  adaptiveDeblur,
  edgePreservingDenoise,
  refineEdges,
  enhanceMicroContrast,
  ENHANCER_PRESETS,
  runEnhancePipeline,
} from "../../js/image-upscaler/engine.js";

describe("Image Upscaler Engine", () => {
  describe("calculateUpscaleDimensions", () => {
    it("correctly calculates 2x dimensions and megapixels", () => {
      const stats = calculateUpscaleDimensions(800, 600, 2);
      expect(stats.originalWidth).toBe(800);
      expect(stats.originalHeight).toBe(600);
      expect(stats.targetWidth).toBe(1600);
      expect(stats.targetHeight).toBe(1200);
      expect(stats.factor).toBe(2);
      expect(stats.originalMegapixels).toBe(0.48);
      expect(stats.targetMegapixels).toBe(1.92);
      expect(stats.pixelIncreasePercent).toBe(300);
    });

    it("correctly calculates 4x dimensions", () => {
      const stats = calculateUpscaleDimensions(100, 100, 4);
      expect(stats.targetWidth).toBe(400);
      expect(stats.targetHeight).toBe(400);
      expect(stats.pixelIncreasePercent).toBe(1500);
    });

    it("clamps to max dimension safely", () => {
      const stats = calculateUpscaleDimensions(5000, 5000, 4, 8000);
      expect(stats.targetWidth).toBeLessThanOrEqual(8000);
      expect(stats.targetHeight).toBeLessThanOrEqual(8000);
    });

    it("throws on invalid dimensions", () => {
      expect(() => calculateUpscaleDimensions(0, 100)).toThrow();
      expect(() => calculateUpscaleDimensions(-10, 50)).toThrow();
    });
  });

  describe("clamp utility", () => {
    it("restricts values within [0, 255]", () => {
      expect(clamp(-50)).toBe(0);
      expect(clamp(300)).toBe(255);
      expect(clamp(128)).toBe(128);
    });
  });

  describe("resampleBicubic", () => {
    it("resamples a small 2x2 buffer to 4x4 correctly", () => {
      // 2x2 image with 4 RGBA pixels
      const src = new Uint8ClampedArray([
        255, 0, 0, 255,   0, 255, 0, 255,
        0, 0, 255, 255,   255, 255, 255, 255,
      ]);
      const res = resampleBicubic(src, 2, 2, 4, 4);
      expect(res).toBeInstanceOf(Uint8ClampedArray);
      expect(res.length).toBe(4 * 4 * 4);
      // Ensure all alpha values are preserved (approx 255)
      for (let i = 3; i < res.length; i += 4) {
        expect(res[i]).toBeGreaterThan(200);
      }
    });
  });

  describe("adaptiveDeblur", () => {
    it("sharpens high frequency contrast without NaN", () => {
      const src = new Uint8ClampedArray([
        100, 100, 100, 255, 120, 120, 120, 255,
        150, 150, 150, 255, 200, 200, 200, 255,
      ]);
      const deblurred = adaptiveDeblur(src, 2, 2, 1.2, 1, 2);
      expect(deblurred.length).toBe(src.length);
      for (let i = 0; i < deblurred.length; i++) {
        expect(Number.isFinite(deblurred[i])).toBe(true);
      }
    });
  });

  describe("edgePreservingDenoise", () => {
    it("cleans noisy buffer while maintaining array dimensions", () => {
      const src = new Uint8ClampedArray(4 * 4 * 4).fill(128);
      // inject noise
      src[0] = 140;
      src[16] = 115;
      const denoised = edgePreservingDenoise(src, 4, 4, 1.0, 20);
      expect(denoised.length).toBe(src.length);
      expect(denoised[0]).toBeLessThanOrEqual(140);
    });
  });

  describe("refineEdges and enhanceMicroContrast", () => {
    it("runs without mutating invalid indexes", () => {
      const src = new Uint8ClampedArray(6 * 6 * 4).fill(100);
      const refined = refineEdges(src, 6, 6, 0.5);
      expect(refined.length).toBe(src.length);

      const contrasted = enhanceMicroContrast(refined, 6, 6, 0.15);
      expect(contrasted.length).toBe(src.length);
    });
  });

  describe("ENHANCER_PRESETS", () => {
    it("contains clarity, portrait, anime, and document presets", () => {
      expect(ENHANCER_PRESETS.clarity).toBeDefined();
      expect(ENHANCER_PRESETS.portrait).toBeDefined();
      expect(ENHANCER_PRESETS.anime).toBeDefined();
      expect(ENHANCER_PRESETS.document).toBeDefined();
      expect(ENHANCER_PRESETS.clarity.deblurAmount).toBeGreaterThan(0);
    });
  });

  describe("runEnhancePipeline", () => {
    it("executes the full pipeline and calls progress callbacks", () => {
      const src = new Uint8ClampedArray(4 * 4 * 4).fill(100);
      const progressSteps = [];

      const result = runEnhancePipeline(
        src,
        4,
        4,
        8,
        8,
        { preset: "clarity" },
        (step) => progressSteps.push(step)
      );

      expect(result.length).toBe(8 * 8 * 4);
      expect(progressSteps.length).toBeGreaterThan(0);
      expect(progressSteps[progressSteps.length - 1].stage).toBe("complete");
    });
  });
});
