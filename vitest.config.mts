import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test/vitest-setup.ts"],
    // Next/ESLint setup and nested CLI checks contend heavily on Windows.
    // Keep every test, but use one local worker; Linux CI retains four.
    maxWorkers: process.platform === "win32" ? 1 : 4,
    // findBy/waitFor wait up to 5 s (src/test/vitest-setup.ts), so a test needs more than the 5 s default.
    testTimeout: 15_000,
  },
});
