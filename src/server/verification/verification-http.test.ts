import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ gateway: { mode: "api", resolve: vi.fn(), changePasswordFromVerification: vi.fn() }, read: vi.fn(), run: vi.fn(), connect: vi.fn() }));
vi.mock("@/server/auth/session-gateway.instance", () => ({ getSessionGateway: () => mocks.gateway }));
vi.mock("@/server/auth/session-redis-client", () => ({ connectSessionRedis: (...args: unknown[]) => mocks.connect(...args) }));
vi.mock("@/server/auth/redis-login-ledger", () => ({ createRedisLoginLedger: () => ({ read: mocks.read }) }));
vi.mock("./flow-service", () => ({ runVerification: (...args: unknown[]) => mocks.run(...args) }));
import { randomBytes, randomUUID } from "node:crypto";
import { createAuthContextCookieHelpers } from "@/server/auth/auth-context-cookie";
import { resolved } from "@/server/employees/__tests__/employee-fixture";
import { handleVerification } from "./verification-http";
function setup() {
  const environment = { NODE_ENV: "test", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "http://127.0.0.1:8080", OMTS_API_TIMEOUT_MS: "1000", OMTS_WEB_ORIGIN: "http://localhost:3002", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev",
    OMTS_WEB_SESSION_ACTIVE_KEY_ID: "qa", OMTS_WEB_SESSION_KEYRING: `qa=${randomBytes(32).toString("base64url")}`, OMTS_WEB_SESSION_REDIS_URL: "redis://127.0.0.1:6380/2", OMTS_WEB_SESSION_REDIS_CONNECT_TIMEOUT_MS: "1000", OMTS_WEB_SESSION_REDIS_COMMAND_TIMEOUT_MS: "1000", OMTS_WEB_SESSION_REDIS_NAMESPACE: "verification-http-fixture" };
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  const helpers = createAuthContextCookieHelpers(environment); if (helpers.status !== "available") throw new Error("Cookie fixture"); const fresh = helpers.cookies.createFresh(); if (fresh.status !== "prepared") throw new Error("Context fixture");
  mocks.gateway.mode = "api"; mocks.gateway.resolve.mockResolvedValue(resolved()); mocks.read.mockResolvedValue({ status: "found", context: { revision: randomUUID(), state: { kind: "active" } } });
  mocks.connect.mockResolvedValue({ status: "connected", connection: { commands: { eval: vi.fn() }, close: vi.fn() } }); mocks.run.mockResolvedValue({ body: { status: "empty" }, httpStatus: 200 });
  return fresh.cookie.readForResponseHeader().split(";")[0];
}
function request(body: unknown, cookie = "", origin = "http://localhost:3002") { return new Request("http://localhost:3002/api/verifications", { method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json", Cookie: cookie }, body: JSON.stringify(body) }); }
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("G2 HTTP boundary", () => {
  it("rejects foreign origin and missing context before opening flow storage", async () => {
    setup(); expect((await handleVerification(request({ op: "read", purpose: "contact" }, "", "https://evil.test"))).status).toBe(403); expect((await handleVerification(request({ op: "read", purpose: "contact" }))).status).toBe(409); expect(mocks.run).not.toHaveBeenCalled();
  });
  it.each([{ op: "complete", purpose: "contact", id: randomUUID(), verificationToken: "injected" }, { op: "start", purpose: "registration", channel: "Email", target: "qa@example.test", currentPassword: "injected" }, { op: "verify", purpose: "contact", id: randomUUID(), code: "1234567" }, { op: "complete", purpose: "recovery", id: randomUUID(), newPassword: "short", confirmPassword: "short" }])("rejects proof injection or invalid command %j", async (body) => {
    const cookie = setup(); expect((await handleVerification(request(body, cookie))).status).toBe(400); expect(mocks.run).not.toHaveBeenCalled();
  });
  it("keeps Staff contact onboarding blocked and refuses anonymous authenticated-purpose requests", async () => {
    const cookie = setup(); mocks.gateway.resolve.mockResolvedValueOnce(resolved({ phase: "contact-verification-required" })).mockResolvedValueOnce({ status: "anonymous" });
    expect((await handleVerification(request({ op: "read", purpose: "contact" }, cookie))).status).toBe(409); expect((await handleVerification(request({ op: "read", purpose: "password-email" }, cookie))).status).toBe(409); expect(mocks.run).not.toHaveBeenCalled();
    expect(mocks.connect.mock.calls[0]?.[0]).toEqual({ url: "redis://127.0.0.1:6380/2", connectTimeoutMs: 1000, commandTimeoutMs: 1000 });
  });
  it("rejects registration/recovery in an active login context", async () => {
    const cookie = setup(); expect((await handleVerification(request({ op: "read", purpose: "registration" }, cookie))).status).toBe(409); expect((await handleVerification(request({ op: "read", purpose: "recovery" }, cookie))).status).toBe(409); expect(mocks.run).not.toHaveBeenCalled();
  });
  it("passes only the session-bound server authority and marks every response private", async () => {
    const cookie = setup(), response = await handleVerification(request({ op: "read", purpose: "contact" }, cookie)); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("set-cookie")).toBeNull(); expect(await response.json()).toEqual({ status: "empty" });
    expect(mocks.run.mock.calls[0][1].binding.purpose).toBe("contact"); expect(mocks.run.mock.calls[0][1].binding.contextHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
