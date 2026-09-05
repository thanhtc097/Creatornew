import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/browser-mocks.js"],
    include: ["tests/unit/**/*.test.js"],
    coverage: { exclude: ["dist/**", "spikes/**", "public/**"] },
  },
});
