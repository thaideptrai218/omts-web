import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { handleCycles, handleCycleWrite } from "./cycles-http";

const raft = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", zone = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", batch = "529ec3ce-af8f-42f7-a08f-4bab36ba7e64", cycle = "529ec3ce-af8f-42f7-a08f-4bab36ba7e65";
const view = { id: cycle, startDate: "2026-11-13", closeDate: null, statusId: 601, status: "Open", rowVersion: "AAAA", raftId: raft, raftCode: "B1-11", targetYieldKg: 2000, seedingCompletedOn: null, assessment: null,
  closedEarly: false, daysOfFarming: 0, canEdit: true, canCancel: true, nurseryBatchId: batch, nurseryCode: "NU000002", nurseryRemaining: 9500, nurserySeeded: 0, seedLot: { itemName: "Hàu giống" } };

function configure(subjectType = "CooperativeOwner", permissions: unknown[] = []) {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: permissions } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const headers = { "X-OMTS-Request": "web", Origin: "http://localhost:3002" };
const jpeg = (name = "plan.jpg") => new File([new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70])], name, { type: "image/jpeg" });
function startRequest(fields: Record<string, string>, photos = [jpeg()]) {
  const form = new FormData();
  Object.entries({ action: "start", id: raft, ...fields }).forEach(([key, value]) => form.set(key, value));
  photos.forEach(photo => form.append("photos", photo, photo.name));
  return new Request("http://localhost:3002/api/cultivation-cycles", { method: "POST", body: form, headers });
}
const startFields = { nurseryBatchId: batch, startDate: "2026-11-13", targetYieldKg: "2000" };

describe("available nursery batches for the start form", () => {
  it("relays GET /api/nursery-batches/available?zoneId with the View permission of the cycles function", async () => {
    configure("Staff", [{ functionCode: "CULTIVATION_CYCLES", action: "View" }]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ batches: [{ id: "n1", code: "NU000002", zoneId: zone, itemName: "Hàu giống", remaining: 6500, completedOn: "2026-11-12", extra: "dropped?" }] }));
    const response = await handleCycles(new Request(`http://localhost:3002/api/cultivation-cycles?action=nursery-available&zoneId=${zone}`));
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/nursery-batches/available?zoneId=${zone}`);
    expect((await response.json()).data.batches[0]).toMatchObject({ id: "n1", code: "NU000002", itemName: "Hàu giống", remaining: 6500 });
  });
  it("needs View, a zone id and no other parameter", async () => {
    configure("Staff", []); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCycles(new Request(`http://localhost:3002/api/cultivation-cycles?action=nursery-available&zoneId=${zone}`))).status).toBe(403);
    configure(); for (const query of ["action=nursery-available", `action=nursery-available&zoneId=x`, `action=nursery-available&zoneId=${zone}&raftId=${raft}`])
      expect((await handleCycles(new Request(`http://localhost:3002/api/cultivation-cycles?${query}`))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("manual start of a cycle (POST /api/cultivation-cycles)", () => {
  it("sends raftId, the nursed batch, the yield, the date and the photos as multipart for a Create permission", async () => {
    configure("Staff", [{ functionCode: "CULTIVATION_CYCLES", action: "Create" }]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ cycle: view, previousCloseDate: null, lanes: [] }, { status: 201 }));
    const response = await handleCycleWrite(startRequest({ ...startFields, note: "Lứa mới" }));
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe("http://127.0.0.1:8080/api/cultivation-cycles"); expect(fetcher.mock.calls[0][1]?.method).toBe("POST");
    const sent = fetcher.mock.calls[0][1]?.body as FormData;
    expect(Object.fromEntries([...sent.entries()].filter(([key]) => key !== "photos"))).toEqual({ raftId: raft, nurseryBatchId: batch, startDate: "2026-11-13", targetYieldKg: "2000", note: "Lứa mới" });
    expect(sent.getAll("photos")).toHaveLength(1);
    expect((await response.json()).data.cycle).toMatchObject({ id: cycle, nurseryCode: "NU000002", nurseryRemaining: 9500 });
  });
  it("refuses a start without the batch, without the yield, with the old seed fields or without a photo, before any backend call", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCycleWrite(startRequest({ startDate: "2026-11-13", targetYieldKg: "2000" }))).status).toBe(400);
    expect((await handleCycleWrite(startRequest({ nurseryBatchId: batch, startDate: "2026-11-13" }))).status).toBe(400);
    expect((await handleCycleWrite(startRequest({ ...startFields, expectedSeedQuantity: "100" }))).status).toBe(400);
    expect((await handleCycleWrite(startRequest({ ...startFields, targetYieldKg: "0" }))).status).toBe(400);
    const noPhoto = await handleCycleWrite(startRequest(startFields, []));
    expect(noPhoto.status).toBe(400); expect((await noPhoto.json()).problem.field).toBe("Photos");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forbids a start without Create", async () => {
    configure("Staff", [{ functionCode: "CULTIVATION_CYCLES", action: "Edit" }]); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCycleWrite(startRequest(startFields))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("passes the refusal about the batch on as an allow-listed problem", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-GEN-09", reasonCode: "NURSERY_POOL_EMPTY", field: "Nursery batch", secret: "no" }, { status: 409 }));
    const response = await handleCycleWrite(startRequest(startFields)), text = await response.text();
    expect(response.status).toBe(409); expect(JSON.parse(text)).toMatchObject({ status: "rejected", problem: { reasonCode: "NURSERY_POOL_EMPTY", field: "Nursery batch" } }); expect(text).not.toContain("secret");
  });
});

describe("edit of a cycle (PUT /api/cultivation-cycles/{id})", () => {
  const edit = (body: unknown) => new Request("http://localhost:3002/api/cultivation-cycles", { method: "POST", body: JSON.stringify({ action: "edit", id: cycle, body }), headers: { "Content-Type": "application/json", ...headers } });
  it("sends the yield, the note and a changed nursed batch with the row version", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ cycle: view }));
    const body = { startDate: "2026-11-12", targetYieldKg: 2200, note: "", nurseryBatchId: batch, rowVersion: "AAAA" };
    expect((await handleCycleWrite(edit(body))).status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/cultivation-cycles/${cycle}`); expect(fetcher.mock.calls[0][1]?.method).toBe("PUT");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual(body);
  });
  it("passes CYCLE_SEED_LOCKED on so the plan can say the batch is fixed", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-GEN-09", reasonCode: "CYCLE_SEED_LOCKED" }, { status: 409 }));
    const response = await handleCycleWrite(edit({ nurseryBatchId: batch, rowVersion: "AAAA" }));
    expect(response.status).toBe(409); expect((await response.json()).problem).toMatchObject({ reasonCode: "CYCLE_SEED_LOCKED" });
  });
  it("refuses unknown fields such as the retired planned seed quantity", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCycleWrite(edit({ expectedSeedQuantity: 100, rowVersion: "AAAA" }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
});
