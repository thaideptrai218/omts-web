import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["**/__tests__/**"],
          message: "Test-only adapters must not be imported by production code.",
        }],
      }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Keep authored cookie-fixture code in lint, not its generated Next output.
    "tests/fixtures/cookie-browser/.next/**",
    "tests/fixtures/cookie-browser/next-env.d.ts",
  ]),
]);

export default eslintConfig;
