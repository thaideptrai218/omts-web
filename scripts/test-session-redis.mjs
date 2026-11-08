import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Explicit integration command must not succeed by skipping every Redis test.
const endpoint = process.env.OMTS_TEST_REDIS_URL;
if (endpoint === undefined || endpoint.trim() === "") {
  console.error("Redis integration requires OMTS_TEST_REDIS_URL for a dedicated test instance.");
  process.exitCode = 1;
} else {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const vitest = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [vitest, "run",
    "src/server/auth/redis-session-store.integration.test.ts",
    "src/server/auth/redis-session-contract.integration.test.ts",
    "src/server/auth/redis-session-edge.integration.test.ts",
    "src/server/auth/session-runtime.integration.test.ts",
  ], { cwd: root, stdio: "inherit", env: process.env, windowsHide: true });
  if (result.error) console.error("Could not execute the Redis integration test process.");
  process.exitCode = result.status ?? 1;
}
