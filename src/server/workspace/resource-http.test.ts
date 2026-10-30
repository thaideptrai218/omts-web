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
  it("forwards supplier type alongside server search/status/paging", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 2, pageSize: 20, total: 0 }));
    const response = await handleResourceRequest(new Request("http://localhost:3002/api/workspace/suppliers?type=Material&search=qa&statusId=101&page=2&pageSize=20"), "suppliers");
    expect(response.status).toBe(200); const target = new URL(String(fetcher.mock.calls[0][0])); expect(target.pathname).toBe("/api/suppliers");
    expect(Object.fromEntries(target.searchParams)).toEqual({ type: "Material", search: "qa", statusId: "101", page: "2", pageSize: "20" });
  });
  it("filters the input array upstream before BFF paging", async () => {
    configure(); const rows = Array.from({ length: 25 }, (_, index) => ({ id: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", code: `M${index}`, name: `Material ${index}`, group: "RaftMaterial", unit: "cái", statusId: 101, status: "In Use" }));
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(rows));
    const response = await handleResourceRequest(new Request("http://localhost:3002/api/workspace/input-items?group=RaftMaterial&page=2&pageSize=20"), "input-items");
    expect(response.status).toBe(200); const value = await response.json(); expect(value.data.items).toHaveLength(5); expect(value.data.total).toBe(25);
    expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8080/api/farming-input-items?group=RaftMaterial");
  });
  it.each([
    ["suppliers", "?type=RaftMaterial"], ["input-items", "?group=Material"], ["zones", "?type=Seed"], ["suppliers", "?group=Seed"],
    ["suppliers", "?type=Seed&type=Other"], ["suppliers", "?type=Seed&id=529ec3ce-af8f-42f7-a08f-4bab36ba7e62"],
  ])("rejects an invalid or irrelevant category for %s", async (resource, query) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleResourceRequest(new Request(`http://localhost:3002/api/workspace/${resource}${query}`), resource)).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
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
