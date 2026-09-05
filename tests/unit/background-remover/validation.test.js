import { describe, expect, it, vi } from "vitest";
import { MAX_FILE_SIZE, ValidationError, calculateWorkingSize, decodeAndValidate, validateFileMetadata } from "../../../js/background-remover/validation.js";

describe("background remover validation", () => {
  it("accepts supported image metadata", () => {
    expect(validateFileMetadata(new File(["x"], "owned.png", { type: "image/png" }))).toBe(true);
  });

  it("rejects unsupported and oversized files", () => {
    expect(() => validateFileMetadata(new File(["x"], "bad.gif", { type: "image/gif" }))).toThrow(ValidationError);
    expect(() => validateFileMetadata({ type: "image/png", size: MAX_FILE_SIZE + 1 })).toThrow(/25 MB/);
  });

  it("calculates an explicit reduced working size", () => {
    const size = calculateWorkingSize(6000, 4000);
    expect(size.reduced).toBe(true);
    expect(size.width * size.height).toBeLessThanOrEqual(12_010_000);
  });

  it("reports decode failures safely", async () => {
    globalThis.createImageBitmap = vi.fn().mockRejectedValue(new Error("decode"));
    await expect(decodeAndValidate(new File(["x"], "broken.png", { type: "image/png" }))).rejects.toMatchObject({ code: "invalid-file" });
  });
});
