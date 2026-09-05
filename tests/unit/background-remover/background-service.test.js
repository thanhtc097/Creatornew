import { describe, expect, it, vi } from "vitest";
import { backgroundErrorMessage, removeImageBackground } from "../../../js/background-remover/background-service.js";

describe("background removal service", () => {
  it("normalizes progress and requests PNG output", async () => {
    const onProgress = vi.fn();
    const result = new Blob(["png"], { type: "image/png" });
    const processImage = vi.fn(async (_file, options) => {
      options.progress("model", 1, 4);
      return result;
    });

    await expect(removeImageBackground(new File(["x"], "photo.jpg", { type: "image/jpeg" }), {
      onProgress,
      loadModule: async () => ({ default: processImage }),
    })).resolves.toBe(result);
    expect(onProgress).toHaveBeenCalledWith({ key: "model", percent: 25 });
    expect(processImage.mock.calls[0][1].output).toEqual({ format: "image/png" });
  });

  it("honors cancellation before loading and during progress", async () => {
    const before = new AbortController();
    before.abort();
    await expect(removeImageBackground(new Blob(), { signal: before.signal })).rejects.toMatchObject({ name: "AbortError" });

    const during = new AbortController();
    await expect(removeImageBackground(new Blob(), {
      signal: during.signal,
      loadModule: async () => ({ default: async (_file, options) => {
        during.abort();
        options.progress("model", 1, 2);
      } }),
    })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("maps cancellation and processing failures to safe messages", () => {
    expect(backgroundErrorMessage(new DOMException("Cancelled", "AbortError")).code).toBe("cancelled");
    expect(backgroundErrorMessage(new Error("secret internal detail"))).toEqual({
      code: "processing-failed",
      message: "Unable to run the AI model. Check your connection and try again.",
    });
  });
});
