import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleHarvestPlans } from "./harvest-plans-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007", other = "222bb318-a72e-49aa-a8d7-a6169f889008", line = "322bb318-a72e-49aa-a8d7-a6169f889009";
function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const get = (query: string) => new Request(`https://web.example.test/api/harvest-plans?${query}`);
const post = (body: unknown, headers: Record<string, string> = {}) => new Request("https://web.example.test/api/harvest-plans", {
  method: "POST", headers: { Origin: "https://web.example.test", "X-OMTS-Request": "web", "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body),
});
const view = {
  id, code: "KHT000001", statusId: 4201, status: "Draft", zones: [{ id, code: "Z1", name: "Vùng 1" }], plannedAt: "2026-11-14T06:00:00+07:00", note: null, createdBy: { id, name: "Chủ" },
  assignedAt: null, completedAt: null, cancelledAt: null, cancelReason: null, orders: [{ id: other, code: "DH000001", statusId: 4401, status: "Draft", customer: { id, code: "KH000001", name: "An" } }],
  lines: [{ id: line, lineNumber: 1, raftId: other, raftCode: "B1", zone: { id, code: "Z1", name: "Vùng 1" }, expectedProduct: null, expectedCageCount: 12, note: null, state: "Open", lot: null, canHarvest: true, locked: true,
    lanes: [{ laneId: id, laneNumber: 1, state: "Planned" }, { laneId: other, laneNumber: 2, state: "Skipped", skipReason: "Hàu chưa đủ cỡ" }] }],
  progress: { lines: 1, linesDone: 0, lanes: 2, lanesHarvested: 0, lanesSkipped: 1 }, allowedActions: ["Edit", "Assign"], createdAt: "2026-11-12T08:00:00+07:00", rowVersion: "v1",
};
const body = { code: null, plannedAt: "2026-11-14T06:00:00+07:00", note: null, salesOrderIds: [other], lines: [{ raftId: other, laneNumbers: [1, 2], expectedCageCount: 12, note: null }] };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("harvest plans BFF", () => {
  it("forwards only the filters of the list, repeating the statuses, and refuses a malformed value before the API", async () => {
    setup([["HARVEST_PLANS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 15, total: 0 }));
    expect((await handleHarvestPlans(get(`action=plans&statusIds=4201,4202&zoneId=${id}&from=2026-11-01&sortBy=code&evil=1&pageSize=15`))).status).toBe(200);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/harvest-plans");
    expect(url.searchParams.getAll("statusIds")).toEqual(["4201", "4202"]);
    expect(url.searchParams.get("zoneId")).toBe(id);
    expect(url.searchParams.has("evil")).toBe(false);
    for (const bad of ["statusIds=4401", "from=yesterday", "zoneId=nope", "action=plan", "action=plan&id=nope", "action=nothing", "action=plan-by-code&code=a%20b", `action=plans&salesOrderId=x`]) expect((await handleHarvestPlans(get(bad))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reads a page of rows and refuses one that does not match the contract", async () => {
    setup([["HARVEST_PLANS", "View"]]);
    const row = { id, code: "KHT000001", statusId: 4202, status: "Assigned", zones: [{ id, code: "Z1", name: "Vùng 1" }], plannedAt: "2026-11-14T06:00:00+07:00", note: null, raftCodes: ["B1"], orders: [], progress: view.progress, createdBy: "Chủ", rowVersion: "v" };
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ items: [row], page: 1, pageSize: 20, total: 1 }));
    expect((await (await handleHarvestPlans(get("action=plans"))).json()).data).toMatchObject({ page: 1, total: 1, items: [{ code: "KHT000001", raftCodes: ["B1"] }] });
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ items: [{ ...row, progress: undefined }], page: 1, pageSize: 20, total: 1 }));
    expect((await handleHarvestPlans(get("action=plans"))).status).toBe(502);
  });

  it("reads one plan by id and by code and checks the answer names the same record", async () => {
    setup([["HARVEST_PLANS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(view)).mockResolvedValueOnce(Response.json(view)).mockResolvedValueOnce(Response.json({ ...view, id: other }));
    expect((await (await handleHarvestPlans(get(`action=plan&id=${id}`))).json()).data).toMatchObject({ code: "KHT000001" });
    expect((await handleHarvestPlans(get("action=plan-by-code&code=KHT000001"))).status).toBe(200);
    expect(String(fetcher.mock.calls[1][0])).toContain("/api/harvest-plans/by-code/KHT000001");
    expect((await handleHarvestPlans(get(`action=plan&id=${id}`))).status).toBe(502);
  });

  it("reads the rafts a plan can use for one zone or all, for who may create plans, and refuses a bad zone before the API", async () => {
    const rafts = { rafts: [{ raftId: other, raftCode: "B1", zone: { id, code: "Z1", name: "Vùng 1" }, product: { id: line, code: "SP1", name: "Hàu sữa" }, lanes: [{ laneId: id, laneNumber: 1, state: "Free", planCode: null }, { laneId: other, laneNumber: 2, state: "InAnotherPlan", planCode: "KHT000002" }] }] };
    setup([["HARVEST_PLANS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(rafts));
    expect((await (await handleHarvestPlans(get("action=plan-eligible-rafts"))).json()).data).toMatchObject([{ raftCode: "B1", zone: { code: "Z1" }, product: { name: "Hàu sữa" }, lanes: [{ state: "Free" }, { state: "InAnotherPlan", planCode: "KHT000002" }] }]);
    expect(new URL(String(fetcher.mock.calls[0][0])).pathname + new URL(String(fetcher.mock.calls[0][0])).search).toBe("/api/harvest-plans/eligible-rafts");
    expect((await handleHarvestPlans(get(`action=plan-eligible-rafts&zoneId=${id}&evil=1`))).status).toBe(200);
    expect(new URL(String(fetcher.mock.calls[1][0])).search).toBe(`?zoneId=${id}`);
    expect((await handleHarvestPlans(get("action=plan-eligible-rafts&zoneId=nope"))).status).toBe(400);
    setup([["HARVEST_PLANS", "View"]]);
    expect((await handleHarvestPlans(get("action=plan-eligible-rafts"))).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps each action to the permission it needs: plans of the zone manager are only read and assigned", async () => {
    setup([["HARVEST_PLANS", "View"], ["HARVESTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ plans: [view] }));
    expect((await (await handleHarvestPlans(get("action=plans-assigned"))).json()).data).toMatchObject([{ code: "KHT000001" }]);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/harvest-plans/assigned");
    expect((await handleHarvestPlans(get(`action=plan-order-draft&id=${id}`))).status).toBe(403);
    expect((await handleHarvestPlans(get("action=plan-next-code"))).status).toBe(403);
    expect((await handleHarvestPlans(post({ action: "plan-create", body }))).status).toBe(403);
    expect((await handleHarvestPlans(post({ action: "plan-assign", id, body: {} }))).status).toBe(403);
    expect((await handleHarvestPlans(post({ action: "plan-cancel", id, body: { reason: "x" } }))).status).toBe(403);
    expect((await handleHarvestPlans(post({ action: "plan-skip-lanes", id, lineId: line, body: { laneNumbers: [1], reason: "x" } }))).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
    setup([], "Trader");
    expect((await handleHarvestPlans(get("action=plans"))).status).toBe(403);
  });

  it("lets the zone manager skip lanes with HARVESTS Create and sends the lines of the line path to the API", async () => {
    setup([["HARVESTS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(view));
    const skip = { action: "plan-skip-lanes", id, lineId: line, body: { laneNumbers: [2, 3], reason: "Hàu chưa đủ cỡ" } };
    expect((await handleHarvestPlans(post(skip))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain(`/api/harvest-plans/${id}/lines/${line}/skip-lanes`);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify(skip.body) });
    expect((await handleHarvestPlans(post({ ...skip, body: { laneNumbers: [2, 2], reason: "x" } }))).status).toBe(400);
    expect((await handleHarvestPlans(post({ ...skip, body: { laneNumbers: [2], reason: "  " } }))).status).toBe(400);
    expect((await handleHarvestPlans(post({ ...skip, body: { laneNumbers: [], reason: "x" } }))).status).toBe(400);
    expect((await handleHarvestPlans(post({ ...skip, lineId: "nope" }))).status).toBe(400);
    expect((await handleHarvestPlans(post({ action: "plan-unskip-lanes", id, lineId: line, body: { laneNumbers: [2] } }))).status).toBe(200);
    expect(String(fetcher.mock.calls[1][0])).toContain("/unskip-lanes");
  });

  it("lets the zone manager receive and hand over with HARVESTS Create, and keeps finish for HARVEST_PLANS Edit", async () => {
    setup([["HARVESTS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ plan: view, message: "ok", messageCode: "MSG-GEN-05" }));
    expect((await handleHarvestPlans(post({ action: "plan-receive", id, body: {} }))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain(`/api/harvest-plans/${id}/receive`);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "POST", body: "{}" });
    expect((await handleHarvestPlans(post({ action: "plan-hand-over", id, body: { rowVersion: "v1" } }))).status).toBe(200);
    expect(String(fetcher.mock.calls[1][0])).toContain(`/api/harvest-plans/${id}/hand-over`);
    expect(fetcher.mock.calls[1][1]).toMatchObject({ body: JSON.stringify({ rowVersion: "v1" }) });
    expect((await handleHarvestPlans(post({ action: "plan-hand-over", id, body: { extra: 1 } }))).status).toBe(400);
    expect((await handleHarvestPlans(post({ action: "plan-finish", id, body: {} }))).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("refuses receive and hand over without HARVESTS Create and passes a wrong-status 409 on", async () => {
    setup([["HARVEST_PLANS", "Edit"]]);
    expect((await handleHarvestPlans(post({ action: "plan-receive", id, body: {} }))).status).toBe(403);
    expect((await handleHarvestPlans(post({ action: "plan-hand-over", id, body: {} }))).status).toBe(403);
    setup([["HARVESTS", "Create"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-GEN-09", message: "Kế hoạch không ở trạng thái phù hợp." }, { status: 409 }));
    const rejected = await handleHarvestPlans(post({ action: "plan-receive", id, body: {} }));
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({ status: "rejected", code: "MSG-GEN-09" });
  });

  it("accepts the new status ids in the list filter", async () => {
    setup([["HARVEST_PLANS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 15, total: 0 }));
    expect((await handleHarvestPlans(get("action=plans&statusIds=4206,4207"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("statusIds=4206&statusIds=4207");
    expect((await handleHarvestPlans(get("action=plans&statusIds=4208"))).status).toBe(400);
  });

  it("sends a save to the API as JSON, accepts the plan alone or wrapped, and refuses a body with extra or missing parts", async () => {
    setup([["HARVEST_PLANS", "Create"], ["HARVEST_PLANS", "Edit"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(view, { status: 201 })).mockResolvedValueOnce(Response.json({ plan: view })).mockImplementation(async () => Response.json(view));
    const created = await handleHarvestPlans(post({ action: "plan-create", body }));
    expect(created.status).toBe(200);
    expect((await created.json()).data).toMatchObject({ id, code: "KHT000001" });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify(body) });
    expect(String(fetcher.mock.calls[0][0])).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/harvest-plans$/);
    const updated = await handleHarvestPlans(post({ action: "plan-update", id, body: { ...body, rowVersion: "v1" } }));
    expect((await updated.json()).data).toMatchObject({ id });
    expect(fetcher.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    expect((await handleHarvestPlans(post({ action: "plan-create", body: { ...body, lines: [] } }))).status).toBe(400);
    expect((await handleHarvestPlans(post({ action: "plan-create", body: { ...body, extra: 1 } }))).status).toBe(400);
    expect((await handleHarvestPlans(post({ action: "plan-create", body: { ...body, plannedAt: "tomorrow" } }))).status).toBe(400);
    const raftPlan = { ...body, lines: [{ ...body.lines[0], laneNumbers: [] }] };
    expect((await handleHarvestPlans(post({ action: "plan-create", body: raftPlan }))).status).toBe(200);
    expect(JSON.parse(String(fetcher.mock.calls.at(-1)![1]?.body))).toEqual(raftPlan);
    expect((await handleHarvestPlans(post({ action: "plan-update", id, body: { ...raftPlan, rowVersion: "v1" } }))).status).toBe(200);
    for (const laneNumbers of [[0], [1, 1], [1000]]) expect((await handleHarvestPlans(post({ action: "plan-create", body: { ...body, lines: [{ ...body.lines[0], laneNumbers }] } }))).status).toBe(400);
    expect((await handleHarvestPlans(post({ action: "plan-update", id, body }))).status).toBe(400);
    // Half a cage is a valid expectation; three decimals, zero and a negative are not.
    const withCages = (expectedCageCount: number) => post({ action: "plan-create", body: { ...body, lines: [{ ...body.lines[0], expectedCageCount }] } });
    expect((await handleHarvestPlans(withCages(2.5))).status).toBe(200);
    expect((await handleHarvestPlans(withCages(2.555))).status).toBe(400);
    expect((await handleHarvestPlans(withCages(0))).status).toBe(400);
    expect((await handleHarvestPlans(withCages(-1))).status).toBe(400);
  });

  it("answers a command that has no content as done, and passes a rejected call on with its code and the API's own sentence", async () => {
    setup([["HARVEST_PLANS", "Edit"], ["HARVEST_PLANS", "Delete"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({ code: "MSG-PLAN-04", message: "Kế hoạch đã có lô.", field: "Plan" }, { status: 409 }));
    expect(await (await handleHarvestPlans(post({ action: "plan-assign", id, body: { rowVersion: "v1" } }))).json()).toMatchObject({ status: "success", data: { done: true } });
    const rejected = await handleHarvestPlans(post({ action: "plan-cancel", id, body: { reason: "Không còn nhu cầu" } }));
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({ status: "rejected", code: "MSG-PLAN-04" });
  });

  it("answers 502 when the API answer does not match the contract", async () => {
    setup([["HARVEST_PLANS", "View"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...view, lines: "none" }));
    expect((await handleHarvestPlans(get(`action=plan&id=${id}`))).status).toBe(502);
  });

  it("refuses a foreign origin and a body over 64 KB before the API", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleHarvestPlans(post({ action: "plan-create", body }, { Origin: "https://evil.example.test" }))).status).toBeGreaterThanOrEqual(400);
    expect((await handleHarvestPlans(post(JSON.stringify({ action: "plan-create", body: { ...body, note: "x".repeat(70_000) } })))).status).toBeGreaterThanOrEqual(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  const staffingLine = { lineId: line, raftId: other, raftCode: "B1", zoneId: id, zoneCode: "Z1", laneNumbers: [1, 2], plannedDate: "2026-11-18", canEdit: true,
    employees: [{ employeeId: other, code: "NV000001", name: "An", assignmentId: id, checkedIn: false }] };

  it("reads the Nhân công of a plan for who may view plans and checks the answer names the same plan", async () => {
    setup([["HARVEST_PLANS", "View"]]);
    const answer = { planId: id, planCode: "KHT000001", rowVersion: "v1", canEdit: true, lines: [staffingLine] };
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(answer)).mockResolvedValueOnce(Response.json({ ...answer, planId: other })).mockResolvedValueOnce(Response.json({ ...answer, lines: [{ ...staffingLine, plannedDate: "tomorrow" }] }));
    expect((await (await handleHarvestPlans(get(`action=plan-staffing&id=${id}`))).json()).data).toMatchObject({ planCode: "KHT000001", lines: [{ raftCode: "B1", employees: [{ name: "An", checkedIn: false }] }] });
    expect(String(fetcher.mock.calls[0][0])).toContain(`/api/harvest-plans/${id}/staffing`);
    expect((await handleHarvestPlans(get(`action=plan-staffing&id=${id}`))).status).toBe(502);
    expect((await handleHarvestPlans(get(`action=plan-staffing&id=${id}`))).status).toBe(502);
    expect((await handleHarvestPlans(get("action=plan-staffing"))).status).toBe(400);
    expect((await handleHarvestPlans(get("action=plan-staffing&id=nope"))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("sets the crew of a line with a PUT to the line path, for who may create work assignments, and refuses a bad crew before the API", async () => {
    setup([["WORK_ASSIGNMENTS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json(staffingLine));
    const save = { action: "plan-line-staffing", id, lineId: line, body: { employeeIds: [other], rowVersion: "v1" } };
    const answered = await handleHarvestPlans(post(save));
    expect(answered.status).toBe(200);
    expect((await answered.json()).data).toMatchObject({ lineId: line, employees: [{ name: "An" }] });
    expect(String(fetcher.mock.calls[0][0])).toContain(`/api/harvest-plans/${id}/lines/${line}/staffing`);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "PUT", body: JSON.stringify(save.body) });
    expect((await handleHarvestPlans(post({ ...save, body: { employeeIds: [] } }))).status).toBe(200);
    for (const body of [{ employeeIds: [other, other] }, { employeeIds: ["nope"] }, { employeeIds: [other], extra: 1 }, { rowVersion: "v1" }, { employeeIds: Array.from({ length: 101 }, (_, n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`) }]) {
      expect((await handleHarvestPlans(post({ ...save, body }))).status).toBe(400);
    }
    expect((await handleHarvestPlans(post({ ...save, lineId: "nope" }))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("keeps the Nhân công to its permissions and passes a refusal on with the sentence of the API", async () => {
    setup([["HARVEST_PLANS", "View"], ["HARVEST_PLANS", "Edit"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-GEN-09", message: "Kế hoạch thu hoạch KHT000001 đã hủy.", field: "Plan" }, { status: 409 }));
    expect((await handleHarvestPlans(post({ action: "plan-line-staffing", id, lineId: line, body: { employeeIds: [] } }))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    setup([["WORK_ASSIGNMENTS", "Create"]]);
    const refused = await handleHarvestPlans(post({ action: "plan-line-staffing", id, lineId: line, body: { employeeIds: [other] } }));
    expect(refused.status).toBe(409);
    expect(await refused.json()).toMatchObject({ status: "rejected", code: "MSG-GEN-09", problem: { message: "Kế hoạch thu hoạch KHT000001 đã hủy." } });
    setup([["WORK_ASSIGNMENTS", "Create"]]);
    expect((await handleHarvestPlans(get(`action=plan-staffing&id=${id}`))).status).toBe(403);
  });
});
