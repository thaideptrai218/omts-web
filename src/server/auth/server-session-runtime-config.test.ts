import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseServerSessionRuntimeConfig } from "./server-session-runtime-config";

const key = Buffer.alloc(32, 7).toString("base64url");

function environment(change: Record<string, unknown> = {}) {
  return {
    NODE_ENV: "development",
    OMTS_WEB_ORIGIN: "http://localhost:3000",
    OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
    OMTS_WEB_SESSION_ACTIVE_KEY_ID: "local-key-1",
    OMTS_WEB_SESSION_KEYRING: `local-key-1=${key}`,
    OMTS_WEB_SESSION_REDIS_URL: "redis://127.0.0.1:6379/1",
    OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS: "1500",
    OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS: "750",
    OMTS_WEB_SESSION_REDIS_NAMESPACE: "omts-web-local",
    ...change,
  };
}

describe("server session runtime configuration", () => {
  it("composes cookie, Redis and keyring configuration without public aliases", async () => {
    const result = parseServerSessionRuntimeConfig(environment());
    expect(result.status).toBe("valid");
    if (result.status !== "valid") throw new Error("Expected valid runtime config");

    expect(result.config.web).toMatchObject({
      origin: "http://localhost:3000",
      cookie: { name: "omts_web_sid_dev", secure: false },
    });
    expect(result.config.redis).toEqual({
      url: "redis://127.0.0.1:6379/1",
      connectTimeoutMs: 1500,
      commandTimeoutMs: 750,
      namespace: "omts-web-local",
    });
    await expect(result.config.keys.active()).resolves.toMatchObject({
      keyId: "local-key-1",
    });
    expect(JSON.stringify(result)).not.toContain(key);
  });

  it.each([
    ["OMTS_WEB_SESSION_REDIS_URL", undefined],
    ["OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS", "0"],
    ["OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS", "60001"],
    ["OMTS_WEB_SESSION_REDIS_NAMESPACE", "invalid namespace"],
  ] as const)("rejects invalid %s", (field, value) => {
    const result = parseServerSessionRuntimeConfig(environment({ [field]: value }));
    expect(result.status).toBe("invalid-config");
    if (result.status !== "invalid-config") throw new Error("Expected invalid config");
    expect(result.fields).toContain(field);
  });

  it("reports failures from every configuration section in one bounded result", () => {
    const result = parseServerSessionRuntimeConfig(environment({
      OMTS_WEB_ORIGIN: "https://wrong-for-http-profile.example",
      OMTS_WEB_SESSION_ACTIVE_KEY_ID: "missing-key",
      OMTS_WEB_SESSION_REDIS_NAMESPACE: "",
    }));
    expect(result).toEqual({
      status: "invalid-config",
      fields: [
        "OMTS_WEB_ORIGIN",
        "OMTS_WEB_SESSION_ACTIVE_KEY_ID",
        "OMTS_WEB_SESSION_KEYRING",
        "OMTS_WEB_SESSION_REDIS_NAMESPACE",
      ],
    });
  });

  it("does not infer a runtime Redis endpoint or key when fields are absent", () => {
    const result = parseServerSessionRuntimeConfig({
      NODE_ENV: "development",
      OMTS_WEB_ORIGIN: "http://localhost:3000",
      OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
    });
    expect(result.status).toBe("invalid-config");
    if (result.status !== "invalid-config") throw new Error("Expected invalid config");
    expect(result.fields).toEqual(expect.arrayContaining([
      "OMTS_WEB_SESSION_ACTIVE_KEY_ID",
      "OMTS_WEB_SESSION_KEYRING",
      "OMTS_WEB_SESSION_REDIS_URL",
    ]));
  });

  it.each([
    "NEXT_PUBLIC_OMTS_WEB_SESSION_REDIS_URL",
    "NEXT_PUBLIC_OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS",
    "NEXT_PUBLIC_OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS",
    "NEXT_PUBLIC_OMTS_WEB_SESSION_REDIS_NAMESPACE",
  ] as const)("rejects browser-public Redis alias %s", (field) => {
    const result = parseServerSessionRuntimeConfig(environment({
      [field]: "must-not-be-public",
    }));
    expect(result.status).toBe("invalid-config");
    if (result.status !== "invalid-config") throw new Error("Expected invalid config");
    expect(result.fields).toContain(field);
  });

  it("redacts hostile getters", () => {
    const input = Object.defineProperty(environment(), "OMTS_WEB_SESSION_REDIS_URL", {
      get() {
        throw new Error("redis://user:private-password@example");
      },
    });
    const result = parseServerSessionRuntimeConfig(input);
    expect(result).toEqual({ status: "invalid-config", fields: [] });
    expect(JSON.stringify(result)).not.toContain("private-password");
  });
});
