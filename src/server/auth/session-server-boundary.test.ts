import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("session crypto server-only markers", () => {
  it.each([
    "session-id", "session-token-protector", "session-token-open",
    "session-token-format", "session-token-keys",
    "session-keyring-config",
    "session-redis-client", "session-redis-record", "session-redis-scripts", "redis-session-store",
    "session-store-validation",
    "../config/backend-config", "../backend/backend-endpoint",
    "../backend/backend-request", "../backend/backend-result", "../backend/backend-response", "../backend/backend-transport",
    "../backend/server-auth-tokens", "../backend/browser-dto", "../backend/backend-diagnostic",
    "../config/web-session-config",
    "session-cookie-reader", "session-cookies",
    "csrf-guard", "csrf-mutation-body",
    "session-expiry",
    "server-session-resolver",
    "application-session-guard",
    "server-session-runtime-config",
    "server-session-runtime",
    "server-session-runtime-owner",
    "application-context-dal",
    "function-capability-guard",
    "protected-access-decision",
    "session-destinations", "session-gateway", "session-gateway.instance", "session-http", "next-session-access",
    "login-session-service",
  ])("keeps the server-only marker on %s", (name) => {
    const source = readFileSync(new URL(`./${name}.ts`, import.meta.url), "utf8");
    expect(source.trimStart()).toMatch(/^import "server-only";/);
  });

  it.each([
    [[], 1], [["--conditions=react-server"], 0],
  ] as const)("checks the actual marker package under Node conditions %j", (conditions, status) => {
    const result = spawnSync(process.execPath, [...conditions, "--input-type=module", "--eval", "import 'server-only';"], {
      cwd: process.cwd(), encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "" },
    });
    expect(result.status).toBe(status);
    if (status === 1) expect(result.stderr).toContain("cannot be imported from a Client Component");
    // Marker resolution test, not a negative Next.js browser-bundle build.
  });
});
