import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createSessionHttpHandlers } from "./session-http";
import type { createSessionGateway } from "./session-gateway";
import { ResolvedServerSession } from "./server-session-resolver";
import { newSession } from "./__tests__/session-fixture";

const environment = {
  NODE_ENV: "test", OMTS_WEB_ORIGIN: "http://localhost:3000",
  OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
};
type Gateway = Pick<ReturnType<typeof createSessionGateway>, "mode" | "resolve" | "application">;
function gateway(): Gateway {
  return {
    mode: "api",
    resolve: vi.fn(async () => ({ status: "anonymous" } as const)),
    application: vi.fn(async () => ({ status: "unauthenticated", clearCookie: false } as const)),
  };
}
function request(change: RequestInit = {}) {
  return new Request("http://localhost:3000/api/auth/session/recover", {
    method: "POST", headers: { Origin: environment.OMTS_WEB_ORIGIN, "X-OMTS-Request": "web" },
    ...change,
  });
}

describe("session HTTP boundary", () => {
  it("returns 401/no-store and no private DTO to an anonymous request", async () => {
    const source = gateway();
    const response = await createSessionHttpHandlers(environment, source).read(request({ method: "GET" }));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({ status: "anonymous", clearCookie: false });
  });

  it.each([
    ["password-change-required", "/onboarding/password"],
    ["contact-verification-required", "/onboarding/contact"],
  ] as const)("binds phase %s to its fixed destination", async (phase, destination) => {
    const source = gateway();
    vi.mocked(source.application).mockResolvedValue({ status: "onboarding-required", phase });
    const response = await createSessionHttpHandlers(environment, source).read(request({ method: "GET" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ status: "onboarding-required", phase, destination });
  });

  it("projects ready identity/permissions without a server capability", async () => {
    const source = gateway();
    const context = {
      identity: { accountId: newSession().identity.accountId, username: "test.user", subjectType: "Staff" as const },
      permissions: { access: { permissions: [] }, functionPermissions: [] },
    };
    vi.mocked(source.application).mockResolvedValue({ status: "ready", context });
    const response = await createSessionHttpHandlers(environment, source).read(request({ method: "GET" }));
    expect(await response.json()).toEqual({ status: "authenticated", ...context });
  });

  it("preserves cookies on a backend/session failure", async () => {
    const source = gateway();
    vi.mocked(source.application).mockResolvedValue({ status: "session-unavailable" });
    const response = await createSessionHttpHandlers(environment, source).read(request({ method: "GET" }));
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(await response.json()).toEqual({ status: "unavailable" });
  });

  it("rejects cross-origin recovery before reading the session", async () => {
    const source = gateway();
    const response = await createSessionHttpHandlers(environment, source).recover(request({
      headers: { Origin: "https://foreign.example", "X-OMTS-Request": "web" },
    }));
    expect(response.status).toBe(403);
    expect(source.resolve).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("clears only a server-confirmed invalid session with the fixed scope", async () => {
    const source = gateway();
    vi.mocked(source.resolve).mockResolvedValue({ status: "invalid-session", reason: "expired", clearCookie: true });
    const response = await createSessionHttpHandlers(environment, source).recover(request());
    expect(await response.json()).toEqual({ status: "cleared", destination: "/login" });
    expect(response.headers.get("set-cookie")).toContain("omts_web_sid_dev=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  });

  it.each(["application", "password-change-required", "contact-verification-required"] as const)(
    "does not clear a valid %s session when recovery is opened manually", async (phase) => {
      const source = gateway();
      vi.mocked(source.resolve).mockResolvedValue({ status: "resolved", session: new ResolvedServerSession({
        ...newSession({ phase }), schemaVersion: 1, createdAtMs: 1, revision: "test",
      }, "test-access-token") });
      const response = await createSessionHttpHandlers(environment, source).recover(request());
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(await response.text()).not.toContain("test-access-token");
    },
  );

  it("leaves the cookie untouched when recovery cannot confirm its state", async () => {
    const source = gateway();
    vi.mocked(source.resolve).mockResolvedValue({ status: "unavailable" });
    const response = await createSessionHttpHandlers(environment, source).recover(request());
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
