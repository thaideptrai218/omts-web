import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createLoginHttpHandler, type LoginHttpGateway } from "./login-http";
import { createPendingLoginDelivery } from "./pending-login-delivery";
import { ResolvedServerSession } from "./server-session-resolver";
import { newSession } from "./__tests__/session-fixture";
import { environment } from "./__tests__/csrf-fixture";
import type { SessionPhase } from "./session-store";

function request(change: RequestInit = {}) {
  return new Request(environment.OMTS_WEB_ORIGIN + "/fixture-login", {
    method: "POST", headers: { Origin: environment.OMTS_WEB_ORIGIN, "X-OMTS-Request": "web", "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: "fixture.user", password: "demo123" }), ...change,
  });
}

function harness(mode: LoginHttpGateway["mode"] = "api", phase: SessionPhase = "application") {
  const cleanup = vi.fn(async () => {});
  const delivery = createPendingLoginDelivery({ readForResponseHeader: () => "fixture-session-cookie" }, () => true, cleanup);
  const source: LoginHttpGateway = {
    mode,
    resolve: vi.fn(async () => ({ status: "anonymous" } as const)),
    login: vi.fn(async () => ({ status: "created", phase, ...delivery } as const)),
  };
  return { source, cleanup, delivery, handler: createLoginHttpHandler(environment, source) };
}

describe("unmounted login HTTP factory", () => {
  it.each(["mock", "unavailable"] as const)("does not contact services in %s mode", async (mode) => {
    const h = harness(mode);
    expect((await h.handler(request())).status).toBe(mode === "mock" ? 404 : 503);
    expect(h.source.resolve).not.toHaveBeenCalled();
    expect(h.source.login).not.toHaveBeenCalled();
  });

  it("fails closed on invalid Web configuration", async () => {
    const h = harness();
    const response = await createLoginHttpHandler({}, h.source)(request());
    expect(response.status).toBe(503);
    expect(h.source.resolve).not.toHaveBeenCalled();
  });

  it.each([
    [{ method: "PUT" }, 405],
    [{ headers: { Origin: "https://foreign.example", "X-OMTS-Request": "web", "Content-Type": "application/json" } }, 403],
    [{ headers: { Origin: environment.OMTS_WEB_ORIGIN, "Content-Type": "application/json" } }, 403],
    [{ body: "not-json" }, 400],
    [{ body: "x".repeat(65_537) }, 413],
  ] as const)("rejects HTTP input before session or backend access %#", async (change, status) => {
    const h = harness();
    const response = await h.handler(request(change));
    expect(response.status).toBe(status);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(h.source.resolve).not.toHaveBeenCalled();
    expect(h.source.login).not.toHaveBeenCalled();
  });

  it.each([
    {}, { identifier: " ", password: "demo123" }, { identifier: "fixture.user", password: "" },
    { identifier: "fixture.user", password: "demo123", clientType: "Mobile" },
    { identifier: "fixture.user", password: "demo123", sid: "untrusted-session" },
  ])("validates only the two browser-owned input fields %#", async (body) => {
    const h = harness();
    const response = await h.handler(request({ body: JSON.stringify(body) }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ status: "invalid-input", code: "MSG01" });
    expect(h.source.login).not.toHaveBeenCalled();
  });

  it.each([
    ["application", "/dashboard"], ["password-change-required", "/onboarding/password"],
    ["contact-verification-required", "/onboarding/contact"],
  ] as const)("keeps an existing %s session without logging in again", async (phase, destination) => {
    const h = harness();
    vi.mocked(h.source.resolve).mockResolvedValue({ status: "resolved", session: new ResolvedServerSession({
      ...newSession({ phase }), schemaVersion: 1, createdAtMs: 1, revision: "fixture",
    }, "fixture-internal-access") });
    const response = await h.handler(request());
    expect(await response.json()).toEqual({ status: "active", destination });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(h.source.login).not.toHaveBeenCalled();
  });

  it("sends invalid cookies to recovery without clearing or replacing them", async () => {
    const h = harness();
    vi.mocked(h.source.resolve).mockResolvedValue({ status: "invalid-session", reason: "invalid-cookie", clearCookie: true });
    const response = await h.handler(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ status: "session-recovery-required", destination: "/session/recover" });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(h.source.login).not.toHaveBeenCalled();
  });

  it.each([
    ["application", "/dashboard"], ["password-change-required", "/onboarding/password"],
    ["contact-verification-required", "/onboarding/contact"],
  ] as const)("projects only a %s result and its fixed destination", async (phase, destination) => {
    const h = harness("api", phase);
    const response = await h.handler(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBe("fixture-session-cookie");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.json()).toEqual({ status: "created", phase, destination });
    expect(h.cleanup).not.toHaveBeenCalled();
    expect(h.source.login).toHaveBeenCalledWith({ identifier: "fixture.user", password: "demo123" }, { signal: expect.any(AbortSignal) });
  });

  it.each([
    { status: "invalid-input" }, { status: "unavailable" },
    { status: "rejected", httpStatus: 401, code: "MSG12" },
    { status: "rejected", httpStatus: 423, code: "MSG69", retryAfterMs: 1000 },
    { status: "rejected", httpStatus: 502 },
  ] as const)("does not change cookies on login failure $status %#", async (result) => {
    const h = harness();
    vi.mocked(h.source.login).mockResolvedValue(result);
    const response = await h.handler(request());
    expect(response.headers.get("set-cookie")).toBeNull();
    if (result.status === "rejected" && result.httpStatus < 500) expect(response.status).toBe(result.httpStatus);
    else expect(response.status).toBe(result.status === "invalid-input" ? 400 : 503);
  });

  it("redacts exceptions rather than serializing credentials or a cause", async () => {
    const h = harness();
    vi.mocked(h.source.login).mockRejectedValue(new Error("private-fixture-payload"));
    const response = await h.handler(request());
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('{"status":"unavailable"}');
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("abandons a created session if the browser aborts before response construction", async () => {
    const h = harness();
    const abort = new AbortController();
    vi.mocked(h.source.login).mockImplementation(async () => {
      abort.abort();
      return { status: "created", phase: "application", ...h.delivery };
    });
    const response = await h.handler(request({ signal: abort.signal }));
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(h.cleanup).toHaveBeenCalledOnce();
  });

  it("abandons a candidate if a cookie expires before the HTTP handoff", async () => {
    const h = harness();
    await h.delivery.abandon();
    const response = await h.handler(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(h.cleanup).toHaveBeenCalledOnce();
  });

  it("rechecks cancellation after extracting the cookie header", async () => {
    const h = harness();
    const abort = new AbortController();
    const abandon = vi.fn(async () => {});
    vi.mocked(h.source.login).mockResolvedValue({
      status: "created", phase: "application", abandon,
      cookie: { readForResponseHeader() { abort.abort(); return "fixture-session-cookie"; } },
    });
    const response = await h.handler(request({ signal: abort.signal }));
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(abandon).toHaveBeenCalledOnce();
  });
});
