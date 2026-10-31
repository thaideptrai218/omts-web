import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createMemorySessionStoreForTests } from "./__tests__/memory-session-store";
import { initialTime } from "./__tests__/session-fixture";
import { createSessionTokenProtector } from "./session-token-protector";
import { openServerSessionReadRuntime } from "./server-session-runtime";

const encodedKey = Buffer.alloc(32, 7).toString("base64url");

function environment(change: Record<string, unknown> = {}) {
  return {
    NODE_ENV: "development",
    OMTS_WEB_ORIGIN: "http://localhost:3000",
    OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
    OMTS_WEB_SESSION_ACTIVE_KEY_ID: "local-key-1",
    OMTS_WEB_SESSION_KEYRING: `local-key-1=${encodedKey}`,
    OMTS_WEB_SESSION_REDIS_URL: "redis://127.0.0.1:6379/1",
    OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS: "1500",
    OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS: "750",
    OMTS_WEB_SESSION_REDIS_NAMESPACE: "omts-web-local",
    ...change,
  };
}

function dependencies(connectResult: "connected" | "invalid-config" | "unavailable" = "connected") {
  const close = vi.fn();
  const commands = { get: vi.fn(), eval: vi.fn() };
  const connectRedis = vi.fn(async () =>
    connectResult === "connected"
      ? { status: "connected" as const, connection: { commands, close } }
      : { status: connectResult },
  );
  const store = createMemorySessionStoreForTests(() => initialTime);
  const createStore = vi.fn(() => store);
  const createProtector = vi.fn(createSessionTokenProtector);
  const clock = vi.fn(() => initialTime);
  return {
    value: { connectRedis, createStore, createProtector, clock },
    close,
    commands,
    connectRedis,
    createStore,
    createProtector,
    clock,
  };
}

describe("server session read runtime composition", () => {
  it("fails before connecting when server configuration is incomplete", async () => {
    const fixture = dependencies();
    const result = await openServerSessionReadRuntime({}, fixture.value);
    expect(result.status).toBe("invalid-config");
    expect(fixture.connectRedis).not.toHaveBeenCalled();
  });

  it("maps Redis validation and availability without exposing its cause", async () => {
    for (const status of ["invalid-config", "unavailable"] as const) {
      const fixture = dependencies(status);
      const result = await openServerSessionReadRuntime(environment(), fixture.value);
      expect(result.status).toBe(status);
      expect(JSON.stringify(result)).not.toContain(encodedKey);
      expect(fixture.createStore).not.toHaveBeenCalled();
    }
  });

  it("binds the validated Redis settings, namespace, keyring and clock once", async () => {
    const fixture = dependencies();
    const result = await openServerSessionReadRuntime(environment(), fixture.value);
    expect(result.status).toBe("ready");
    expect(fixture.connectRedis).toHaveBeenCalledWith({
      url: "redis://127.0.0.1:6379/1",
      connectTimeoutMs: 1500,
      commandTimeoutMs: 750,
    });
    expect(fixture.createStore).toHaveBeenCalledWith(
      fixture.commands,
      "omts-web-local",
      fixture.clock,
    );
    expect(fixture.createProtector).toHaveBeenCalledOnce();
  });

  it("resolves anonymous and application-gated views through the same resolver", async () => {
    const fixture = dependencies();
    const result = await openServerSessionReadRuntime(environment(), fixture.value);
    if (result.status !== "ready") throw new Error("Expected ready runtime");

    await expect(result.runtime.resolve(undefined)).resolves.toEqual({
      status: "anonymous",
    });
    await expect(result.runtime.resolveApplication(undefined)).resolves.toEqual({
      status: "unauthenticated",
      clearCookie: false,
    });
  });

  it("closes exactly once and fails closed after disposal", async () => {
    const fixture = dependencies();
    const result = await openServerSessionReadRuntime(environment(), fixture.value);
    if (result.status !== "ready") throw new Error("Expected ready runtime");

    result.runtime.close();
    result.runtime.close();
    expect(fixture.close).toHaveBeenCalledOnce();
    await expect(result.runtime.resolve(undefined)).resolves.toEqual({
      status: "unavailable",
    });
    await expect(result.runtime.resolveApplication(undefined)).resolves.toEqual({
      status: "unavailable",
    });
  });

  it("closes Redis when composition throws after connection", async () => {
    const fixture = dependencies();
    fixture.createStore.mockImplementation(() => {
      throw new Error("private-composition-detail");
    });
    const result = await openServerSessionReadRuntime(environment(), fixture.value);
    expect(result).toEqual({ status: "unavailable" });
    expect(fixture.close).toHaveBeenCalledOnce();
    expect(JSON.stringify(result)).not.toContain("private-composition-detail");
  });
});
