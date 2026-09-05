import { describe, expect, it } from "vitest";
import { alphaToMask, featherPixels, paddedBounds, rgbaToPlanarRgb } from "../../../js/background-remover/compositor.js";

describe("inpainting compositor", () => {
  it("caps the FR-005 feather boundary", () => {
    expect(featherPixels(100, 100)).toBe(8);
    expect(featherPixels(8000, 6000)).toBe(24);
  });

  it("pads normalized bounds without leaving the image", () => {
    expect(paddedBounds({ left: 0, top: 0, right: 1, bottom: 1 }, 100, 100)).toEqual({ x: 0, y: 0, right: 100, bottom: 100 });
  });

  it("converts RGBA into planar image and binary mask tensors", () => {
    const data = new ImageData(new Uint8ClampedArray([255, 0, 128, 255]), 1, 1);
    const rgb = [...rgbaToPlanarRgb(data, 1)];
    expect(rgb[0]).toBe(1);
    expect(rgb[1]).toBe(0);
    expect(rgb[2]).toBeCloseTo(128 / 255, 6);
    expect([...alphaToMask(data, 1)]).toEqual([1]);
  });
});
