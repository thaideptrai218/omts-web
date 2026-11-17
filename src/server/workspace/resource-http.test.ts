import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { handleResourceRequest } from "./resource-http";
import { resolved, replacedSession } from "../employees/__tests__/employee-fixture";

function configure(subjectType: "CooperativeOwner" | "Staff" = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } }));
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: [] } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
describe("workspace BFF routing and authorization", () => {
  it("rejects a valid-looking detail for another record ID", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "11111111-1111-4111-8111-111111111111", name: "Other supplier", supplierType: "Seed", phoneNumber: "0900000090", statusId: 101, status: "In Use", address: null, email: null, debt: 0, rowVersion: "v1" }));
    expect((await handleResourceRequest(new Request("http://localhost:3002/api/workspace/suppliers?id=529ec3ce-af8f-42f7-a08f-4bab36ba7e62"), "suppliers")).status).toBe(502);
  });
  it("forwards supplier type alongside server search/status/paging", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 2, pageSize: 20, total: 0 }));
    const response = await handleResourceRequest(new Request("http://localhost:3002/api/workspace/suppliers?type=Material&search=qa&statusId=101&page=2&pageSize=20"), "suppliers");
    expect(response.status).toBe(200); const target = new URL(String(fetcher.mock.calls[0][0])); expect(target.pathname).toBe("/api/suppliers");
    expect(Object.fromEntries(target.searchParams)).toEqual({ type: "Material", search: "qa", statusId: "101", page: "2", pageSize: "20" });
  });
  it("filters the input array upstream before BFF paging", async () => {
    configure(); const rows = Array.from({ length: 25 }, (_, index) => ({ id: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", code: `M${index}`, name: `Material ${index}`, group: "Material", unit: "cái", statusId: 101, status: "In Use" }));
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(rows));
    const response = await handleResourceRequest(new Request("http://localhost:3002/api/workspace/input-items?group=Material&page=2&pageSize=20"), "input-items");
    expect(response.status).toBe(200); const value = await response.json(); expect(value.data.items).toHaveLength(5); expect(value.data.total).toBe(25);
    expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8080/api/farming-input-items?group=Material");
  });
  it.each([
    ["suppliers", "?type=RaftMaterial"], ["input-items", "?group=RaftMaterial"], ["zones", "?type=Seed"], ["suppliers", "?group=Seed"],
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
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(replacedSession());
    const response = await handleResourceRequest(new Request("http://localhost:3002/api/workspace/zones"), "zones");
    expect(fetcher).toHaveBeenCalledTimes(1); expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ status: "session-expired" });
  });
  it("unwraps a saved zone and passes only the allow-listed coordinate warnings on with it", async () => {
    configure();
    const zone = { id: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", code: "KV01", name: "Vùng A", location: "Cô Tô", area: 5, statusId: 101, status: "In Use", inUseRaftCount: 0, licenseState: null, latitude: 20.9, longitude: 107.4, rowVersion: "AAAA" };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ zone, message: "Saved.", messageCode: "MSG-GEN-05", warnings: [{ code: "COORDINATES_OUTSIDE_VIETNAM", message: "x", details: null }, { code: "SECRET", message: "no" }] }));
    const request = new Request("http://localhost:3002/api/workspace/zones", { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id: zone.id, body: { code: "KV01", name: "Vùng A", location: "Cô Tô", latitude: 20.9, longitude: 107.4, area: 5, rowVersion: "AAAA" } }) });
    const response = await handleResourceRequest(request, "zones"), value = await response.json();
    expect(response.status).toBe(200);
    expect(value.data).toMatchObject({ id: zone.id, code: "KV01", warnings: [{ code: "COORDINATES_OUTSIDE_VIETNAM" }] });
    expect(value.data.warnings).toHaveLength(1);
  });
  it("accepts the saved-answer wrapper of a zone CREATE (201) and a raft create, so a successful save is never shown as an uncertain outcome", async () => {
    configure();
    const zone = { id: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", code: "KV02", name: "Vùng B", location: "Cô Tô", area: 5, statusId: 101, status: "In Use", inUseRaftCount: 0, licenseState: null, latitude: 20.9, longitude: 107.4, rowVersion: "AAAA" };
    const post = (resource: string, body: unknown) => new Request(`http://localhost:3002/api/workspace/${resource}`, { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ zone, message: "Zone saved.", messageCode: "MSG-GEN-05", warnings: [] }, { status: 201 }));
    const created = await handleResourceRequest(post("zones", { action: "create", body: { code: "KV02", name: "Vùng B", location: "Cô Tô", latitude: 20.9, longitude: 107.4, area: 5 } }), "zones");
    expect(created.status).toBe(200); expect((await created.json()).data).toMatchObject({ id: zone.id, code: "KV02" });
    const raft = { id: "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", code: "KV02-B01", statusId: 101, status: "In Use", laneCount: 2, size: "10 m x 24 m", latitude: null, longitude: null, location: null, conditionNotes: null, lanes: [], rowVersion: "AAAA" };
    fetcher.mockResolvedValueOnce(Response.json({ raft, message: "Raft saved.", messageCode: "MSG-GEN-05", warnings: [] }, { status: 201 }));
    const madeRaft = await handleResourceRequest(post("rafts", { action: "create", zoneId: zone.id, body: { code: "KV02-B01", size: "10 m x 24 m", laneCount: 2 } }), "rafts");
    expect(madeRaft.status).toBe(200); expect((await madeRaft.json()).data).toMatchObject({ id: raft.id, size: "10 m x 24 m" });
  });
  it("passes the coordinate refusal of a zone save on as an allow-listed problem", async () => {
    configure();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-GEN-01", field: "Latitude", fields: ["Latitude", "Longitude"], hint: "(0, 0) is not a place on the farm.", stack: "trace" }, { status: 400 }));
    const request = new Request("http://localhost:3002/api/workspace/zones", { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", body: { code: "KV01", name: "A", location: "B", latitude: 0, longitude: 0, area: 1 } }) });
    const response = await handleResourceRequest(request, "zones"), text = await response.text();
    expect(response.status).toBe(400); expect(JSON.parse(text).problem).toEqual({ code: "MSG-GEN-01", field: "Latitude", fields: ["Latitude", "Longitude"], hint: "(0, 0) is not a place on the farm." });
    expect(text).not.toContain("trace");
  });
  it("rejects a foreign-origin write before calling upstream", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    const request = new Request("http://localhost:3002/api/workspace/zones", { method: "POST", headers: { Origin: "https://other.example", "X-OMTS-Request": "web", "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", body: {} }) });
    expect((await handleResourceRequest(request, "zones")).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("reads next-code as an Owner-only proposal rather than an item detail", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "VT099", seedUnit: "con", privateData: "hidden" }));
    const response = await handleResourceRequest(new Request("http://localhost:3002/api/workspace/input-items?proposal=1"), "input-items");
    expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ data: { code: "VT099", seedUnit: "con" } });
    expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8080/api/farming-input-items/next-code");
  });
  it("proposes the next zone code and the next raft code of a zone", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ code: "KV03" }));
    const zone = await handleResourceRequest(new Request("http://localhost:3002/api/workspace/zones?proposal=1"), "zones");
    expect(zone.status).toBe(200); expect(await zone.json()).toMatchObject({ data: { code: "KV03" } });
    expect(new URL(String(fetcher.mock.calls[0][0])).pathname).toBe("/api/zones/next-code");
    const zoneId = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62";
    const raft = await handleResourceRequest(new Request(`http://localhost:3002/api/workspace/rafts?proposal=1&zoneId=${zoneId}`), "rafts");
    expect(raft.status).toBe(200); expect(new URL(String(fetcher.mock.calls[1][0])).pathname).toBe(`/api/zones/${zoneId}/rafts/next-code`);
  });
  it("refuses a raft proposal without a zone and a zone proposal with one", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleResourceRequest(new Request("http://localhost:3002/api/workspace/rafts?proposal=1"), "rafts")).status).toBe(400);
    expect((await handleResourceRequest(new Request("http://localhost:3002/api/workspace/zones?proposal=1&zoneId=529ec3ce-af8f-42f7-a08f-4bab36ba7e62"), "zones")).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not let Staff request a code proposal", async () => {
    configure("Staff"); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleResourceRequest(new Request("http://localhost:3002/api/workspace/input-items?proposal=1"), "input-items")).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });

});
