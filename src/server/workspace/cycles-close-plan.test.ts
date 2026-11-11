import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { handleCycles, handleCycleWrite } from "./cycles-http";
import { planCycleClose, planCycleCloseRead } from "./cycles-close-plan";

const cycle = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", other = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63";
const figures = { cycleId: cycle, raftCode: "B1-01", startDate: "2026-10-02", closeDate: null, asOf: "2026-11-12", seedingSessionCount: 2, seedHung: 5000, seedUnit: "con", harvestLotCount: 3, kgHarvested: 580,
  lastHarvestDate: "2026-11-11", daysOfFarming: 41, expectedSeedQuantity: 250, expectedHarvestDate: "2027-08-02", targetYieldKg: 8500, closedEarly: true, earlyReason: "LanesNotHarvested", notHarvestedLanes: [1, 3], assessment: null };
const preview = { summary: figures, isEarly: true, needsOwnerApproval: true, earlyCloseMessage: "Early", earlyCloseMessageCode: "MSG-CYCLE-07", confirmMessage: "Sure?", confirmMessageCode: "MSG-CYCLE-05", cycleRowVersion: "AAAA" };
const view = { id: cycle, startDate: "2026-10-02", closeDate: "2026-11-12", statusId: 202, status: "Closed", rowVersion: "BBBB", raftId: other, raftCode: "B1-01", expectedSeedQuantity: 250, expectedHarvestDate: null, targetYieldKg: 8500,
  seedingCompletedOn: null, assessment: "Tốt", closedEarly: true, daysOfFarming: 41, canEdit: false, canCancel: false };

describe("cycle summary / close preview / close plans", () => {
  it("maps reads to fixed backend paths with the right permission", () => {
    expect(planCycleCloseRead(new URLSearchParams({ action: "summary", cycleId: cycle }))).toMatchObject({ method: "GET", path: `/api/cultivation-cycles/${cycle}/summary`, permission: "View" });
    expect(planCycleCloseRead(new URLSearchParams({ action: "close-preview", cycleId: cycle }))).toMatchObject({ method: "GET", path: `/api/cultivation-cycles/${cycle}/close/preview`, permission: "Edit" });
  });
  it.each(["action=summary", "action=summary&cycleId=x", `action=summary&cycleId=${cycle}&zoneId=${cycle}`, `action=summary&cycleId=${cycle}&cycleId=${other}`, `action=close&cycleId=${cycle}`])("refuses the read %s", query => {
    expect(planCycleCloseRead(new URLSearchParams(query))).toBeUndefined();
  });
  it("reads a cycle's change history by its own route and accepts a plain list as the answer", () => {
    const plan = planCycleCloseRead(new URLSearchParams({ action: "cycle-history", cycleId: cycle }))!;
    expect(plan).toMatchObject({ method: "GET", path: `/api/cultivation-cycles/${cycle}/history`, permission: "View" });
    expect(plan.schema.safeParse([{ at: "2026-11-12", action: "Cycle.Edited", changes: [{ field: "targetYieldKg", label: "Sản lượng mục tiêu (kg)", from: 8000, to: 8500 }] }]).success).toBe(true);
    expect(plan.answerCycleId([])).toBe(cycle);
  });
  it("validates the close body strictly", () => {
    const ok = planCycleClose({ action: "close", id: cycle, body: { assessment: " Đạt ", rowVersion: "AAAA", ownerApproved: true } });
    expect(ok).toMatchObject({ method: "POST", path: `/api/cultivation-cycles/${cycle}/close`, permission: "Edit", body: { assessment: "Đạt", ownerApproved: true } });
    for (const body of [{ rowVersion: "AAAA" }, { assessment: "", rowVersion: "AAAA" }, { assessment: "x".repeat(2001), rowVersion: "AAAA" }, { assessment: "x", rowVersion: "AAAA", extra: 1 }, { assessment: "x", rowVersion: "AAAA", ownerApproved: "yes" }])
      expect(planCycleClose({ action: "close", id: cycle, body })).toBeUndefined();
    expect(planCycleClose({ action: "close", id: "bad", body: { assessment: "x", rowVersion: "A" } })).toBeUndefined();
  });
  it("parses old and new summaries (cages and remaining kg are optional)", () => {
    const plan = planCycleCloseRead(new URLSearchParams({ action: "summary", cycleId: cycle }))!;
    expect(plan.schema.safeParse(figures).success).toBe(true);
    expect(plan.schema.safeParse({ ...figures, harvestedCages: 12.5, remainingKg: 7920 }).success).toBe(true);
  });
});

function configure(subjectType = "CooperativeOwner", permissions: unknown[] = []) {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: permissions } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const read = (query: string) => new Request(`http://localhost:3002/api/cultivation-cycles?${query}`);
const write = (body: unknown, headers: Record<string, string> = { "X-OMTS-Request": "web" }) => new Request("http://localhost:3002/api/cultivation-cycles", { method: "POST", body: JSON.stringify(body),
  headers: { "Content-Type": "application/json", Origin: "http://localhost:3002", ...headers } });

describe("cycle close BFF", () => {
  it("relays the summary and the preview and checks the answer belongs to the cycle asked for", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(preview)).mockResolvedValueOnce(Response.json({ ...preview, summary: { ...figures, cycleId: other } }));
    const ok = await handleCycles(read(`action=close-preview&cycleId=${cycle}`));
    expect(ok.status).toBe(200); expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/cultivation-cycles/${cycle}/close/preview`);
    expect((await handleCycles(read(`action=close-preview&cycleId=${cycle}`))).status).toBe(502);
  });
  it("forbids the preview of a Staff member without Edit and allows the summary with View", async () => {
    configure("Staff", [{ functionCode: "CULTIVATION_CYCLES", action: "View" }]); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(figures));
    expect((await handleCycles(read(`action=close-preview&cycleId=${cycle}`))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
    expect((await handleCycles(read(`action=summary&cycleId=${cycle}`))).status).toBe(200);
  });
  it("needs the CSRF header to close, sends the body once and returns the closed cycle", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ cycle: { ...view, id: cycle }, summary: { ...figures, closeDate: "2026-11-12", assessment: "Tốt" } }));
    const body = { action: "close", id: cycle, body: { assessment: "Tốt", rowVersion: "AAAA" } };
    expect((await handleCycleWrite(write(body, {}))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
    const response = await handleCycleWrite(write(body));
    expect(response.status).toBe(200); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.method).toBe("POST"); expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ assessment: "Tốt", rowVersion: "AAAA" });
  });
  it("passes MSG-CYCLE-07 on as an allow-listed problem so a Zone Manager can ask for the Owner's approval", async () => {
    configure("Staff", [{ functionCode: "CULTIVATION_CYCLES", action: "Edit" }]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-CYCLE-07", detail: "Early close", confirmFlag: "ownerApproved", secret: "no", stack: "trace" }, { status: 409 }));
    const response = await handleCycleWrite(write({ action: "close", id: cycle, body: { assessment: "Sớm", rowVersion: "AAAA" } }));
    const text = await response.text();
    expect(response.status).toBe(409);
    expect(JSON.parse(text)).toMatchObject({ status: "rejected", problem: { code: "MSG-CYCLE-07", confirmFlag: "ownerApproved" } });
    expect(text).not.toContain("secret"); expect(text).not.toContain("trace");
  });
  it("refuses a malformed close before any session or backend call", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCycleWrite(write({ action: "close", id: cycle, body: { rowVersion: "AAAA" } }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
