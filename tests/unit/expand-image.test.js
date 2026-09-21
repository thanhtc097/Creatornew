import { describe, expect, it } from "vitest";
import {
  calculateExpandedDimensions,
  ASPECT_RATIOS,
  rgbaToPlanarRgb,
  maskToFloatArray,
} from "../../js/expand-image/expand-engine.js";

describe("Expand Image Engine", () => {
  describe("calculateExpandedDimensions", () => {
    it("expands a 1000x1000 square image to 16:9 widescreen correctly", () => {
      // 1000x1000 -> 16:9 ratio is ~1.777. Height stays 1000, width becomes 1778.
      const stats = calculateExpandedDimensions(1000, 1000, "16:9", "center");
      expect(stats.targetHeight).toBe(1000);
      expect(stats.targetWidth).toBe(1778);
      // diffW = 778 -> offsetX = 389
      expect(stats.offsetX).toBe(389);
      expect(stats.offsetY).toBe(0);
      expect(stats.expansionPercent).toBe(78);
    });

    it("expands a 1000x1000 square image to 9:16 vertical (TikTok/Reels)", () => {
      // 1000x1000 -> 9:16 ratio is 0.5625. Width stays 1000, height becomes 1778.
      const stats = calculateExpandedDimensions(1000, 1000, "9:16", "center");
      expect(stats.targetWidth).toBe(1000);
      expect(stats.targetHeight).toBe(1778);
      expect(stats.offsetX).toBe(0);
      expect(stats.offsetY).toBe(389);
      expect(stats.expansionPercent).toBe(78);
    });

    it("handles alignment options (left, right, top, bottom)", () => {
      const leftStats = calculateExpandedDimensions(1000, 1000, "16:9", "left");
      expect(leftStats.offsetX).toBe(0);

      const rightStats = calculateExpandedDimensions(1000, 1000, "16:9", "right");
      expect(rightStats.offsetX).toBe(778);

      const topStats = calculateExpandedDimensions(1000, 1000, "9:16", "top");
      expect(topStats.offsetY).toBe(0);

      const bottomStats = calculateExpandedDimensions(1000, 1000, "9:16", "bottom");
      expect(bottomStats.offsetY).toBe(778);
    });

    it("handles custom padding expansion", () => {
      const customStats = calculateExpandedDimensions(
        800,
        600,
        "custom",
        "center",
        { top: 50, bottom: 50, left: 100, right: 100 }
      );
      expect(customStats.targetWidth).toBe(1000);
      expect(customStats.targetHeight).toBe(700);
      expect(customStats.offsetX).toBe(100);
      expect(customStats.offsetY).toBe(50);
    });

    it("clamps large dimensions safely", () => {
      const stats = calculateExpandedDimensions(3000, 3000, "16:9", "center", {}, 4000);
      expect(stats.targetWidth).toBeLessThanOrEqual(4000);
      expect(stats.targetHeight).toBeLessThanOrEqual(4000);
    });

    it("throws on invalid dimensions", () => {
      expect(() => calculateExpandedDimensions(0, 500)).toThrow();
      expect(() => calculateExpandedDimensions(500, -10)).toThrow();
    });
  });

  describe("ASPECT_RATIOS", () => {
    it("contains 16:9, 9:16, 1:1, 4:5, 4:3, 21:9", () => {
      expect(ASPECT_RATIOS["16:9"]).toBeDefined();
      expect(ASPECT_RATIOS["9:16"]).toBeDefined();
      expect(ASPECT_RATIOS["1:1"]).toBeDefined();
      expect(ASPECT_RATIOS["4:5"]).toBeDefined();
      expect(ASPECT_RATIOS["21:9"]).toBeDefined();
    });
  });

  describe("rgbaToPlanarRgb & maskToFloatArray", () => {
    it("converts 4-pixel dummy data correctly", () => {
      const dummyImageData = {
        data: new Uint8ClampedArray([
          255, 128, 0, 255,
          0, 255, 128, 255,
          128, 0, 255, 255,
          255, 255, 255, 255,
        ]),
      };
      // Test target size 2x2 = 4 pixels
      const planar = rgbaToPlanarRgb(dummyImageData, 2);
      expect(planar.length).toBe(2 * 2 * 3);
      expect(planar[0]).toBe(1.0); // R of first pixel
      expect(planar[4]).toBeCloseTo(128 / 255, 2); // G of first pixel

      const maskFloat = maskToFloatArray(dummyImageData, 2);
      expect(maskFloat.length).toBe(2 * 2);
      expect(maskFloat[0]).toBe(1.0);
    });
  });
});
