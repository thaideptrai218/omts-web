import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, replacedSession } from "../employees/__tests__/employee-fixture";
import { handleRaftPage } from "./raft-page-http";

const zone = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", raftId = "11111111-1111-4111-8111-111111111111", cycleId = "22222222-2222-4222-8222-222222222222";
const page = () => ({ items: [{ id: raftId, zoneId: zone, code: "B02", latitude: 21, longitude: 107, size: "10 m x 8 m", laneCount: 4, statusId: 101, status: "In Use", lengthM: 10, widthM: 8, areaM2: 80,
  damagedLaneCount: 0, outOfServiceLaneCount: 0, currentCycle: { id: cycleId, startDate: "2026-11-01" }, secret: "hidden" }, { id: cycleId, zoneId: zone, code: "B01", statusId: 101, status: "In Use", currentCycle: null }], page: 1, pageSize: 10, total: 2 });
function configure(subjectType: "CooperativeOwner" | "Staff" = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } }));
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: [] } } });
}
const call = (query: string) => handleRaftPage(new Request(`http://localhost:3002/api/raft-page${query}`));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("raft page read", () => {
  it("forwards the allow-listed filters to the paged backend list and projects the answer", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(page()));
    const response = await call(`?zoneId=${zone}&statusId=101&search=B0&page=2&pageSize=10`);
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toContain("no-store");
    const target = new URL(String(fetcher.mock.calls[0][0]));
    expect(target.origin + target.pathname).toBe("http://127.0.0.1:8080/api/rafts");
    expect(Object.fromEntries(target.searchParams)).toEqual({ zoneId: zone, statusId: "101", search: "B0", page: "2", pageSize: "10" });
    const value = await response.json();
    expect(value.data.total).toBe(2); expect(value.data.items[0].currentCycle).toEqual({ id: cycleId, startDate: "2026-11-01" });
    expect(value.data.items[1].currentCycle).toBeNull(); expect(JSON.stringify(value)).not.toContain("secret");
  });
  it.each(["", "?zoneId=not-a-guid", `?zoneId=${zone}&pageSize=101`, `?zoneId=${zone}&page=0`, `?zoneId=${zone}&statusId=x`, `?zoneId=${zone}&page=1&page=2`, `?zoneId=${zone}&url=https://example.test`, `?zoneId=${zone}&search=${"a".repeat(201)}`])
    ("rejects query %s before any request", async query => {
      configure(); const fetcher = vi.spyOn(globalThis, "fetch");
      expect((await call(query)).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
    });
  it("lets Staff read and refuses any other kind of account before the request", async () => {
    configure("Staff"); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(page()));
    expect((await call(`?zoneId=${zone}`)).status).toBe(200);
    vi.restoreAllMocks(); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: "Trader" }, permissions: { functionPermissions: [] } } });
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await call(`?zoneId=${zone}`)).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("answers a backend refusal with its status and code", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ title: "forbidden", code: "MSG02" }, { status: 403 }));
    expect((await call(`?zoneId=${zone}`)).status).toBe(403);
  });
  it("drops the answer after a session revision changes", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(page()));
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(replacedSession());
    expect((await call(`?zoneId=${zone}`)).status).toBe(401);
  });
  it("rejects an answer that is not a page", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ id: raftId }]));
    expect((await call(`?zoneId=${zone}`)).status).toBe(502);
  });
});
