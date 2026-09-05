import { vi } from "vitest";

if (!globalThis.URL.createObjectURL) globalThis.URL.createObjectURL = vi.fn(() => "blob:creatornew-test");
if (!globalThis.URL.revokeObjectURL) globalThis.URL.revokeObjectURL = vi.fn();

class TestImageData {
  constructor(data, width, height) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

if (!globalThis.ImageData) globalThis.ImageData = TestImageData;
