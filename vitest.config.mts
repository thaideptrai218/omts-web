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
    // Next/ESLint setup and nested CLI checks contend heavily on Windows.
    // Keep every test, but use one local worker; Linux CI retains four.
    maxWorkers: process.platform === "win32" ? 1 : 4,
  },
});
