import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", bootstrap: vi.fn(), login: vi.fn(), logout: vi.fn(), resolve: vi.fn() }));
vi.mock("./session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { handleApiAuth } from "./api-auth-http";

function configure() {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.bootstrap.mockResolvedValue({ status: "ready" });
  gateway.login.mockResolvedValue({ status: "created", destination: "/dashboard", cookie: { readForResponseHeader: () => "sid=fake; HttpOnly" } });
  gateway.logout.mockResolvedValue({ status: "signed-out", destination: "/login" });
}
function request(body?: unknown, origin = "http://localhost:3002") {
  return new Request("http://localhost:3002/api/auth/fixture", { method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
}
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("product auth HTTP composition", () => {
  it("accepts the bodyless bootstrap policy and emits no credentials in JSON", async () => {
    configure(); const response = await handleApiAuth(request(), "bootstrap");
    expect(response.status).toBe(200); expect(await response.json()).toEqual({ status: "ready" });
    expect(gateway.bootstrap).toHaveBeenCalledTimes(1);
  });
  it("keeps the SID in Set-Cookie and only projects a fixed destination", async () => {
    configure(); const response = await handleApiAuth(request({ identifier: " user ", password: " secret " }), "login");
    expect(response.status).toBe(200); expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(await response.json()).toEqual({ status: "created", destination: "/dashboard" });
    expect(gateway.login.mock.calls[0][1]).toEqual({ identifier: "user", password: " secret " });
  });
  it("rejects cross-origin requests before invoking auth actions", async () => {
    configure(); const response = await handleApiAuth(request(undefined, "https://other.example"), "bootstrap");
    expect(response.status).toBe(403); expect(gateway.bootstrap).not.toHaveBeenCalled();
  });
});
