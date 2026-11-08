import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createSessionGateway } from "./session-gateway";
import { createSessionId } from "./session-id";
import { staffPayload } from "@/features/access/api/__fixtures__/permissions";
import { newSession } from "./__tests__/session-fixture";
import { ResolvedServerSession, type ServerSessionResolution } from "./server-session-resolver";

const environment = {
  NODE_ENV: "test", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "http://127.0.0.1:5280",
  OMTS_API_TIMEOUT_MS: "1000", OMTS_WEB_ORIGIN: "http://localhost:3000",
  OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
};

describe("session gateway request isolation", () => {
  it("does not connect for anonymous or malformed-cookie requests", async () => {
    const open = vi.fn(async () => ({ status: "unavailable" } as const));
    const gateway = createSessionGateway(environment, open);
    await expect(gateway.resolve(null)).resolves.toEqual({ status: "anonymous" });
    await expect(gateway.resolve("omts_web_sid_dev=bad")).resolves.toMatchObject({ status: "invalid-session" });
    expect(open).not.toHaveBeenCalled();
  });

  it("shares only the runtime, re-resolving each account cookie on every request", async () => {
    const resolve = vi.fn(async () => ({ status: "anonymous" } as const));
    const close = vi.fn();
    const open = vi.fn(async () => ({ status: "ready" as const, runtime: {
      resolve, close, resolveApplication: vi.fn(),
    } }));
    const gateway = createSessionGateway(environment, open);
    const first = `omts_web_sid_dev=${createSessionId().sid}`;
    const second = `omts_web_sid_dev=${createSessionId().sid}`;
    await gateway.resolve(first);
    await gateway.resolve(second);
    expect(open).toHaveBeenCalledOnce();
    expect(resolve.mock.calls).toEqual([[first], [second]]);
    gateway.dispose();
    expect(close).toHaveBeenCalledOnce();
  });

  it("leaves mock mode disconnected and never falls back to mock after Redis failure", async () => {
    const open = vi.fn(async () => ({ status: "unavailable" } as const));
    const mock = createSessionGateway({ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" }, open);
    expect(mock.mode).toBe("mock");
    await mock.resolve(null);
    expect(open).not.toHaveBeenCalled();
    const api = createSessionGateway(environment, open);
    await expect(api.resolve(`omts_web_sid_dev=${createSessionId().sid}`))
      .resolves.toEqual({ status: "unavailable" });
    expect(api.mode).toBe("api");
  });

  it.each(["revoked", "expired", "revision-changed"] as const)(
    "discards late private data after %s", async (event) => {
      const stored = { ...newSession({ phase: "application" }), schemaVersion: 1 as const, createdAtMs: 1, revision: "old" };
      const initial: ServerSessionResolution = { status: "resolved", session: new ResolvedServerSession(stored, "fixture-token") };
      const current: ServerSessionResolution = event === "revision-changed"
        ? { status: "resolved", session: new ResolvedServerSession({ ...stored, revision: "new" }, "fixture-token") }
        : { status: "invalid-session", reason: event, clearCookie: true };
      const resolve = vi.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce(current);
      const open = vi.fn(async () => ({ status: "ready" as const, runtime: {
        resolve, resolveApplication: vi.fn(), close: vi.fn(),
      } }));
      const request = vi.fn().mockResolvedValueOnce({ status: "success", httpStatus: 200, data: {
        ...stored.identity, sessionId: stored.identity.backendSessionId, username: "late-private-user",
      } }).mockResolvedValueOnce({ status: "success", httpStatus: 200, data: staffPayload() });
      const source = createSessionGateway(environment, open, { request });
      const result = await source.application(`omts_web_sid_dev=${createSessionId().sid}`);
      expect(result.status).toBe(event === "revision-changed" ? "session-unavailable" : "unauthenticated");
      expect(JSON.stringify(result)).not.toContain("late-private-user");
      expect(resolve).toHaveBeenCalledTimes(2);
    },
  );
});
