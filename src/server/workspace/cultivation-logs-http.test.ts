import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { handleCultivationLogs } from "./cultivation-logs-http";

const zone = "5a92b32d-2901-4560-9237-350be750cb10", raft = "5a92b32d-2901-4560-9237-350be750cb13", cycle = "5a92b32d-2901-4560-9237-350be750cb20", log = "5a92b32d-2901-4560-9237-350be750cb60", account = "5a92b32d-2901-4560-9237-350be750cb61";
function configure(subjectType = "CooperativeOwner", functionPermissions: object[] = []) {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved()); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const get = (query: string, method = "GET") => new Request(`http://localhost:3002/api/cultivation-logs?${query}`, { method });
const item = { id: log, cycleId: cycle, raftId: raft, raftCode: "B1-01", zoneId: zone, zoneCode: "KV01", zoneName: "Vùng", visitDate: "2026-11-21", logType: "REPAIR", notes: null, photos: [], recordedByAccountId: account, recordedByName: "Minh",
  recordedAt: "2026-11-21T02:15:00+00:00", canCorrect: true, rowVersion: "AQID", somethingNew: 1 };

describe("care log page BFF", () => {
  it.each(["action=page&zoneId=bad", "action=page&logType=EATING", "action=page&from=2026-11-30&to=2026-11-01", "action=page&pageSize=7", "action=page&sortBy=notes", "action=page&sortBy=recordedby", "action=page&sortDir=up", "action=page&sortBy=zone&sortDir=ASC", "action=page&page=0", `action=page&search=${"x".repeat(101)}`, "action=page&url=https://evil.test", `action=page&zoneId=${zone}&zoneId=${zone}`])("refuses %s before any call", async query => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCultivationLogs(get(query))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses a write on the page action and an account without the care log View right", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCultivationLogs(get("action=page", "POST"))).status).toBe(400);
    configure("Staff", [{ functionCode: "CULTIVATION_CYCLES", action: "View", dataScope: "AssignedZone", scope: { kind: "all-zones" } }]);
    expect((await handleCultivationLogs(get("action=page"))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends only the filled filters to the backend path and returns the page, tolerating fields it does not know", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [item], page: 2, pageSize: 50, total: 61 }));
    const response = await handleCultivationLogs(get(`action=page&zoneId=${zone}&raftId=${raft}&logType=REPAIR&from=2026-11-01&to=2026-11-30&search=%20B1%20&sortBy=recordedBy&sortDir=asc&page=2&pageSize=50`));
    expect(response.status).toBe(200);
    const url = new URL(fetcher.mock.calls[0][0].toString());
    expect(url.pathname).toBe("/api/cultivation-logs");
    expect(Object.fromEntries(url.searchParams)).toEqual({ zoneId: zone, raftId: raft, logType: "REPAIR", from: "2026-11-01", to: "2026-11-30", search: "B1", sortBy: "recordedBy", sortDir: "asc", page: "2", pageSize: "50" });
    const body = await response.json();
    expect(body.data.total).toBe(61); expect(body.data.items[0]).toMatchObject({ raftCode: "B1-01", zoneCode: "KV01", logType: "REPAIR" });
  });
  it("allows a Staff account with the care log View right, calls the bare path without filters, and answers a log without a type", async () => {
    configure("Staff", [{ functionCode: "CULTIVATION_LOGS", action: "View", dataScope: "AssignedZone", scope: { kind: "all-zones" } }]);
    const { logType: _type, ...old } = item; void _type;
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [old], page: 1, pageSize: 20, total: 1 }));
    expect((await handleCultivationLogs(get("action=page"))).status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe("http://127.0.0.1:8080/api/cultivation-logs");
  });
  it("relays a backend refusal and rejects a malformed page", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ code: "MSG-GEN-01" }, { status: 400 })).mockResolvedValueOnce(Response.json({ items: [{ id: "x" }], page: 1, pageSize: 20, total: 1 }));
    const refused = await handleCultivationLogs(get("action=page")); expect(refused.status).toBe(400); expect((await refused.json()).code).toBe("MSG-GEN-01");
    expect((await handleCultivationLogs(get("action=page"))).status).toBe(502); expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
