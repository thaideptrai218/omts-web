import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";

// This negative case boots another Vitest process. Windows filesystem/plugin
// startup can exceed 15 s in the full suite; keep the same failure assertions.
const commandTimeoutMs = process.platform === "win32" ? 45_000 : 15_000;

function run(endpoint: string | undefined) {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: "1" };
  delete env.OMTS_TEST_REDIS_URL;
  if (endpoint !== undefined) Object.assign(env, { OMTS_TEST_REDIS_URL: endpoint });
  return spawnSync(process.execPath, [resolve("scripts/test-session-redis.mjs")], {
    cwd: tmpdir(), env, encoding: "utf8", windowsHide: true, timeout: commandTimeoutMs,
  });
}

describe("explicit Redis test command (negative cases only, not a live server)", () => {
  it.each([undefined, "", "   "])("does not turn a missing/blank endpoint case %# into a successful skip", (endpoint) => {
    const result = run(endpoint);
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Redis integration requires OMTS_TEST_REDIS_URL");
    expect(result.stdout).not.toContain("Test Files");
  });
  it("fails all four live suites for explicitly invalid config, even when invoked outside the repo", () => {
    const result = run("not-a-redis-url");
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    const output = result.stdout + result.stderr;
    expect(output).toContain("Live Redis setup failed: invalid-config");
    expect(output).toMatch(/Test Files\s+4 failed/);
  }, commandTimeoutMs + 5_000);
});
