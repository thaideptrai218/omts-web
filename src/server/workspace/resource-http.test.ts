import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { handleResourceRequest } from "./resource-http";
import { resolved } from "../employees/__tests__/employee-fixture";

function configure(subjectType: "CooperativeOwner" | "Staff" = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } }));
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: [] } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
describe("workspace BFF routing and authorization", () => {
  it("rejects forged targets and duplicate query keys without calling upstream", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleResourceRequest(new Request("http://localhost:3002/api/workspace/zones"), "../auth/login")).status).toBe(404);
    expect((await handleResourceRequest(new Request("http://localhost:3002/api/workspace/zones?page=1&page=2"), "zones")).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not grant Staff access to owner account administration", async () => {
    configure("Staff"); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleResourceRequest(new Request("http://localhost:3002/api/workspace/accounts"), "accounts")).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("discards an upstream response if the session was replaced while loading", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 20, total: 0 }));
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" }));
    const response = await handleResourceRequest(new Request("http://localhost:3002/api/workspace/zones"), "zones");
    expect(fetcher).toHaveBeenCalledTimes(1); expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ status: "session-expired" });
  });
  it("rejects a foreign-origin write before calling upstream", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    const request = new Request("http://localhost:3002/api/workspace/zones", { method: "POST", headers: { Origin: "https://other.example", "X-OMTS-Request": "web", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", body: {} }) });
    expect((await handleResourceRequest(request, "zones")).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
});
