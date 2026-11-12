import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, replacedSession } from "../employees/__tests__/employee-fixture";
import { planFarming } from "./farming-plan";
import { handleFarmingRequest } from "./farming-http";
import { damageValues, repairValues, laneIncidentHistory, laneIncidentSaved, outOfServiceValues } from "@/features/rafts-api/lane-incident-contracts";

const id = "00000000-0000-4000-8000-000000000001";
const query = (action: string, extra = {}) => new URLSearchParams({ action: `lane-${action}`, id, zoneId: id, laneNumber: "2", ...extra });
function request(action: string, body: unknown) {
  return new Request(`http://localhost:3002/api/operations/raft-details?${query(action)}`, { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.resolve.mockResolvedValue(resolved()); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } } });
});
afterEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllEnvs(); });
describe("lane incident plans and BFF", () => {
  it("uses bounded fixed paths, strict reasons and atomic repair materials", () => {
    expect(planFarming("raft-details", "GET", query("history"))?.path).toBe(`/api/rafts/${id}/lane-history?laneNumber=2`);
    expect(planFarming("raft-details", "POST", query("repair"))).toMatchObject({ path: `/api/rafts/${id}/lanes/2/repair`, ownerOnly: false });
    expect(planFarming("raft-details", "POST", query("discontinue"))).toMatchObject({ path: `/api/rafts/${id}/lanes/2/out-of-service`, ownerOnly: false });
    expect(planFarming("raft-details", "POST", query("damage", { laneNumber: "2/x" }))).toBeUndefined();
    expect(planFarming("raft-details", "POST", query("damage", { bad: "field" }))).toBeUndefined();
    expect(damageValues.safeParse({ rowVersion: "v1", reason: " " }).success).toBe(false);
    expect(repairValues.safeParse({ rowVersion: "v1", reason: "x", materials: [] }).success).toBe(false);
    expect(repairValues.safeParse({ rowVersion: "v1", reason: "x" }).success).toBe(true);
    expect(repairValues.safeParse({ rowVersion: "v1", materials: [{ itemId: id, quantity: 2 }] }).success).toBe(false);
    expect(repairValues.safeParse({ rowVersion: "v1", reason: "x", materials: [{ itemId: id, quantity: 0 }] }).success).toBe(false);
    expect(repairValues.safeParse({ rowVersion: "v1", reason: "x", materials: [{ itemId: id, quantity: 2 }], extra: true }).success).toBe(false);
    expect(laneIncidentHistory.safeParse({ incidents: [{ id, laneNumber: 1, kind: "Damaged", occurredAt: "bad-date" }] }).success).toBe(false);
  });
  it("forwards materials as one JSON repair and returns only allowlisted fields", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ lane: { laneNumber: 2, isDamaged: false }, secret: "no" }));
    const body = { rowVersion: "v1", reason: "Buoc day", materials: [{ itemId: id, quantity: 1.5, unit: "m" }] };
    const response = await handleFarmingRequest(request("repair", body), "raft-details");
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0][1]?.body).toBe(JSON.stringify(body));
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ "Content-Type": "application/json" });
    expect(await response.text()).not.toContain("secret");
  });
  it("returns a missing new endpoint as 404 and carries safe stock messages", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({}, { status: 404 }))
      .mockResolvedValueOnce(Response.json({ code: "MSG-INPUT-01", message: "Kho chỉ còn 1 m.", onHand: 1, secret: "no" }, { status: 409 }));
    expect((await handleFarmingRequest(request("damage", { rowVersion: "v1", reason: "Đứt" }), "raft-details")).status).toBe(404);
    const response = await handleFarmingRequest(request("repair", { rowVersion: "v1", reason: "Buoc day", materials: [{ itemId: id, quantity: 2 }] }), "raft-details");
    expect(response.status).toBe(409); const text = await response.text(); expect(text).toContain("Kho chỉ còn 1 m."); expect(text).not.toContain("secret");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("accepts the documented LaneIncidentSaved answer and sends confirm only when asked", () => {
    const view = { id, laneId: id, laneNumber: 3, kind: "OutOfService", occurredAt: "2026-11-12T10:00:00+07:00", occurredOn: "2026-11-12", cycleId: null, reasonCode: "Other", reason: "Hỏng nặng", stateBefore: "Growing", hadSeed: true,
      recordedByAccountId: id, recordedByName: "Chủ HTX", resolvesIncidentId: null, photos: [{ id, sortOrder: 1, url: "/api/files/local/x.png" }], materials: [{ itemId: id, itemCode: "VT1", itemName: "Dây", unit: "m", quantity: 4, issueId: id, issueCode: "XD000012" }] };
    const saved = { incident: view, lane: { id, laneNumber: 3, statusId: 2001, status: "In use", state: "OutOfService", isDamaged: false, isOutOfService: true, lineLengthM: 24, reasonCode: "LaneOutOfService" },
      changed: true, raftRowVersion: "AAAA", cycleRowVersion: "BBBB", everySeededLaneHarvested: false, message: "ok", messageCode: "MSG-GEN-05" };
    expect(laneIncidentSaved.safeParse(saved).success).toBe(true);
    expect(laneIncidentHistory.safeParse({ raftId: id, raftCode: "B1", laneNumber: 3, incidents: [view] }).success).toBe(true);
    expect(outOfServiceValues.safeParse({ rowVersion: "v", reason: "x", confirm: true, cycleRowVersion: "c" }).success).toBe(true);
    expect(outOfServiceValues.safeParse({ rowVersion: "v", reason: "x", confirmWriteOff: true }).success).toBe(false);
  });
  it("does not bypass session recheck for an empty successful photo upload", async () => {
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(replacedSession());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 201 }));
    const form = new FormData(); form.set("payload", "{}"); form.append("photo", new File(["a"], "a.png", { type: "image/png" }));
    const photoRequest = new Request(`http://localhost:3002/api/operations/raft-details?${query("photo", { incidentId: id })}`, { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web" }, body: form });
    expect((await handleFarmingRequest(photoRequest, "raft-details")).status).toBe(401);
  });
  it("projects history photo links through the authorized parent and proxies local files", async () => {
    const data = { incidents: [{ id, laneNumber: 2, kind: "Damaged", occurredAt: "2026-11-12T10:00:00+07:00", photos: [{ id, url: "/api/files/local/a.png?sig=private" }] }] };
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(data));
    const response = await handleFarmingRequest(new Request(`http://localhost:3002/api/operations/raft-details?${query("history")}`), "raft-details");
    const result = await response.json();
    expect(JSON.stringify(result)).not.toContain("private");
    expect(result.data.incidents[0].photos[0].url).toContain("action=lane-photo-view");
    fetcher.mockResolvedValueOnce(Response.json(data)).mockResolvedValueOnce(new Response("image", { headers: { "Content-Type": "image/png" } }));
    expect((await handleFarmingRequest(new Request(`http://localhost:3002${result.data.incidents[0].photos[0].url}`), "raft-details")).status).toBe(200);
  });
});
