import { randomBytes } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { accountId, staffPayload } from "@/features/access/api/__fixtures__/permissions";
import { openServerSessionLoginRuntime } from "./server-session-runtime";
import { createLoginHttpHandler } from "./login-http";
import { createServerSessionRuntimeOwner } from "./server-session-runtime-owner";
import { createSessionTokenProtector } from "./session-token-protector";
import { createMemorySessionStoreForTests } from "./__tests__/memory-session-store";
import { fixtureTokens } from "./__tests__/token-protection-fixture";
import { initialTime } from "./__tests__/session-fixture";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendTransportResult } from "../backend/backend-result";

function harness() {
  const environment: Record<string, unknown> = {
    OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "https://not-called.example.test", OMTS_API_TIMEOUT_MS: "1000",
    NODE_ENV: "test", OMTS_WEB_ORIGIN: "https://web.example.test", OMTS_WEB_COOKIE_PROFILE: "https",
    OMTS_WEB_SESSION_ACTIVE_KEY_ID: "fixture-key",
    OMTS_WEB_SESSION_KEYRING: `fixture-key=${randomBytes(32).toString("base64url")}`,
    OMTS_WEB_SESSION_REDIS_URL: "redis://127.0.0.1:6379/1",
    OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS: "1500", OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS: "750",
    OMTS_WEB_SESSION_REDIS_NAMESPACE: "test-login-runtime",
  };
  const close = vi.fn();
  const connectRedis = vi.fn(async () => ({ status: "connected" as const, connection: {
    commands: { get: vi.fn(), eval: vi.fn() }, close,
  } }));
  const store = createMemorySessionStoreForTests(() => initialTime);
  const dependencies = {
    connectRedis, createStore: vi.fn(() => store), createProtector: vi.fn(createSessionTokenProtector), clock: () => initialTime,
  };
  const request = vi.fn(async (raw: unknown): Promise<BackendTransportResult> => {
    const input = raw as BackendRequest;
    const data = input.endpoint === "login" ? {
      ...fixtureTokens, accountId, displayName: "Người kiểm thử", subjectType: "Staff",
      mustChangePassword: false, phoneVerificationRequired: false,
      accessTokenExpiresAt: new Date(initialTime + 60_000).toISOString(),
      refreshTokenExpiresAt: new Date(initialTime + 120_000).toISOString(),
    } : input.endpoint === "identity" ? {
      accountId, sessionId: "322bb318-a72e-49aa-a8d7-a6169f889007", username: "fixture.user", subjectType: "Staff",
    } : staffPayload();
    return { status: "success", httpStatus: 200, data };
  });
  const open = () => openServerSessionLoginRuntime(environment, { request }, dependencies);
  return { environment, dependencies, store, close, connectRedis, request, open };
}

describe("isolated read/write session runtime", () => {
  it("reuses one owned connection and store for login and subsequent session resolution", async () => {
    const h = harness();
    const owner = createServerSessionRuntimeOwner(h.open);
    const [first, second] = await Promise.all([owner.get(), owner.get()]);
    if (first.status !== "ready" || second.status !== "ready") throw new Error("Expected runtime");
    expect(first.runtime).toBe(second.runtime);
    const result = await first.runtime.login({ identifier: "fixture.user", password: "demo123" });
    if (result.status !== "created") throw new Error("Expected candidate");
    const cookie = result.cookie.readForResponseHeader().split(";")[0];
    const resolved = await second.runtime.resolve(cookie);
    expect(resolved.status).toBe("resolved");
    expect(h.connectRedis).toHaveBeenCalledOnce();
    expect(h.dependencies.createStore).toHaveBeenCalledOnce();
    await result.abandon();
    owner.dispose();
    expect(h.close).toHaveBeenCalledOnce();
  });

  it("does not open a connection for invalid config", async () => {
    const h = harness();
    expect((await openServerSessionLoginRuntime({}, { request: h.request }, h.dependencies)).status).toBe("invalid-config");
    expect(h.connectRedis).not.toHaveBeenCalled();
    expect(h.request).not.toHaveBeenCalled();
  });

  it("does not open the write runtime or contact backend in mock mode", async () => {
    const h = harness();
    const result = await openServerSessionLoginRuntime({ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" }, { request: h.request }, h.dependencies);
    expect(result).toEqual({ status: "unavailable" });
    expect(h.connectRedis).not.toHaveBeenCalled();
    expect(h.request).not.toHaveBeenCalled();
  });

  it("refuses a ready result when its owner was disposed during connection startup", async () => {
    const h = harness();
    let release!: () => void;
    const original = h.connectRedis.getMockImplementation()!;
    h.connectRedis.mockImplementation(async () => {
      await new Promise<void>((resolve) => { release = resolve; });
      return original();
    });
    const owner = createServerSessionRuntimeOwner(h.open);
    const pending = owner.get();
    await Promise.resolve();
    owner.dispose();
    release();
    expect(await pending).toEqual({ status: "unavailable" });
    expect(h.close).toHaveBeenCalledOnce();
    expect(h.request).not.toHaveBeenCalled();
  });

  it("snapshots cookie configuration before awaiting Redis", async () => {
    const h = harness();
    const opening = h.open();
    h.environment.OMTS_WEB_ORIGIN = "https://changed.example.test";
    h.environment.OMTS_WEB_COOKIE_PROFILE = "http-loopback-dev";
    const result = await opening;
    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("Expected runtime");
    const login = await result.runtime.login({ identifier: "fixture.user", password: "demo123" });
    if (login.status !== "created") throw new Error("Expected candidate");
    expect(login.cookie.readForResponseHeader()).toContain("__Host-omts_web_sid=");
    expect(login.cookie.readForResponseHeader()).toContain("; Secure;");
    await login.abandon();
    result.runtime.close();
  });

  it("blocks new calls and pending cookie delivery when its owner is disposed", async () => {
    const h = harness();
    const owner = createServerSessionRuntimeOwner(h.open);
    const result = await owner.get();
    if (result.status !== "ready") throw new Error("Expected runtime");
    const candidate = await result.runtime.login({ identifier: "fixture.user", password: "demo123" });
    if (candidate.status !== "created") throw new Error("Expected candidate");
    owner.dispose();
    expect(() => candidate.cookie.readForResponseHeader()).toThrow("LOGIN_DELIVERY_UNAVAILABLE");
    h.request.mockClear();
    expect(await result.runtime.login({ identifier: "fixture.user", password: "demo123" })).toEqual({ status: "unavailable" });
    expect(h.request).not.toHaveBeenCalled();
    await candidate.abandon();
  });

  it("composes HTTP, runtime and encrypted storage while preserving an existing browser session", async () => {
    const h = harness();
    const owner = createServerSessionRuntimeOwner(h.open);
    const opened = await owner.get();
    if (opened.status !== "ready") throw new Error("Expected runtime");
    const runtime = opened.runtime;
    let candidate: Awaited<ReturnType<typeof runtime.login>> | undefined;
    const handler = createLoginHttpHandler(h.environment, {
      mode: "api", resolve: runtime.resolve,
      async login(input, options) { return candidate = await runtime.login(input, options); },
    });
    const origin = String(h.environment.OMTS_WEB_ORIGIN);
    function browserRequest(identifier: string, cookie?: string) {
      const headers = new Headers({ Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" });
      if (cookie) headers.set("Cookie", cookie);
      return new Request(origin + "/fixture-login", {
        method: "POST", headers, body: JSON.stringify({ identifier, password: "demo123" }),
      });
    }
    try {
      const first = await handler(browserRequest("fixture.user"));
      expect(first.status).toBe(200);
      expect(await first.json()).toEqual({ status: "created", phase: "application", destination: "/dashboard" });
      const cookie = first.headers.get("set-cookie")!;
      expect(cookie).toMatch(/^__Host-omts_web_sid=/);
      expect(cookie).toContain("; HttpOnly;");
      expect(cookie).toContain("; Secure;");
      expect(cookie).not.toContain(fixtureTokens.accessToken);
      expect(cookie).not.toContain(fixtureTokens.refreshToken);
      expect(h.request.mock.calls.map(([raw]) => (raw as BackendRequest).endpoint)).toEqual(["login", "identity", "permissions"]);
      h.request.mockClear();
      const second = await handler(browserRequest("a.different.user", cookie.split(";")[0]));
      expect(second.status).toBe(200);
      expect(await second.json()).toEqual({ status: "active", destination: "/dashboard" });
      expect(second.headers.get("set-cookie")).toBeNull();
      expect(h.request).not.toHaveBeenCalled();
      expect(h.connectRedis).toHaveBeenCalledOnce();
    } finally {
      if (candidate?.status === "created") await candidate.abandon();
      owner.dispose();
    }
  });

  it.each(["resolve", "resolveApplication"] as const)("discards an in-flight %s result after runtime disposal", async (method) => {
    const h = harness();
    const opened = await h.open();
    if (opened.status !== "ready") throw new Error("Expected runtime");
    const runtime = opened.runtime;
    const candidate = await runtime.login({ identifier: "fixture.user", password: "demo123" });
    if (candidate.status !== "created") throw new Error("Expected candidate");
    const cookie = candidate.cookie.readForResponseHeader().split(";")[0];
    const original = h.store.read.bind(h.store);
    let release!: () => void;
    vi.spyOn(h.store, "read").mockImplementationOnce(async (hash) => {
      await new Promise<void>((resolve) => { release = resolve; });
      return original(hash);
    });
    const pending = runtime[method](cookie);
    runtime.close();
    release();
    expect(await pending).toEqual({ status: "unavailable" });
    await candidate.abandon();
    expect(h.close).toHaveBeenCalledOnce();
  });

  it("cleans up a stored candidate if the runtime closes before HTTP cookie delivery", async () => {
    const h = harness();
    const revoke = vi.spyOn(h.store, "revoke");
    const owner = createServerSessionRuntimeOwner(h.open);
    const opened = await owner.get();
    if (opened.status !== "ready") throw new Error("Expected runtime");
    const handler = createLoginHttpHandler(h.environment, {
      mode: "api", resolve: opened.runtime.resolve,
      async login(input, options) {
        const candidate = await opened.runtime.login(input, options);
        owner.dispose();
        return candidate;
      },
    });
    const origin = String(h.environment.OMTS_WEB_ORIGIN);
    const response = await handler(new Request(origin + "/fixture-login", {
      method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "fixture.user", password: "demo123" }),
    }));
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect(revoke).toHaveBeenCalledOnce();
    expect(h.close).toHaveBeenCalledOnce();
    expect((h.request.mock.lastCall?.[0] as BackendRequest).endpoint).toBe("logout");
  });
});
