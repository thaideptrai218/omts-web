import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { cultivationRecordsPlan } from "./cultivation-records-plan";
import { harvestCorrected, harvestCorrection, harvestSaved, harvestValues } from "@/features/cultivation-api/records-contracts";

const raft = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", zone = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", cycle = "529ec3ce-af8f-42f7-a08f-4bab36ba7e64";
const post = (area: "harvest" | "seeding", body: unknown) => cultivationRecordsPlan(area, "POST", new URLSearchParams(), body);
const order = "529ec3ce-af8f-42f7-a08f-4bab36ba7e65";
const trip = { laneNumbers: [1, 2], finishedLaneNumbers: [1], cageCount: 0.5, estimatedKg: null };

describe("finish the harvest of a raft (one call for all lanes)", () => {
  it("posts the lane numbers to the finish-harvest route of the raft and checks the answer covers them", () => {
    const plan = post("harvest", { action: "finish-harvest", id: raft, zoneId: zone, body: { laneNumbers: [1, 3] } });
    expect(plan).toMatchObject({ method: "POST", path: `/api/rafts/${raft}/finish-harvest`, permission: "Create", zoneId: zone, body: { laneNumbers: [1, 3] } });
    expect(plan?.schema.safeParse({ finished: [1], alreadyFinished: [3] }).success).toBe(true);
    expect(plan?.schema.safeParse({ finished: [1], alreadyFinished: [] }).success).toBe(false);
  });
  it.each([{ laneNumbers: [] }, { laneNumbers: [0] }, { laneNumbers: [1, 1] }, { laneNumbers: [1], extra: true }, {}])("rejects the body %j", body => {
    expect(post("harvest", { action: "finish-harvest", id: raft, zoneId: zone, body })).toBeUndefined();
  });
  it("is not offered for seeding and the per-lane route no longer exists", () => {
    expect(post("seeding", { action: "finish-harvest", id: raft, zoneId: zone, body: { laneNumbers: [1] } })).toBeUndefined();
    expect(post("harvest", { action: "finish-lane", id: raft, zoneId: zone, body: { laneNumber: 3 } })).toBeUndefined();
  });
});

describe("harvest values: purchase request, decimal cages, and no plan cap", () => {
  it("reads the crew suggestions of a raft for one day with the harvest View permission only", () => {
    const query = (extra: Record<string, string> = {}) => new URLSearchParams({ action: "crew-suggestions", id: raft, zoneId: zone, date: "2026-11-12", ...extra });
    expect(cultivationRecordsPlan("harvest", "GET", query())).toMatchObject({ method: "GET", permission: "View", zoneId: zone, path: `/api/rafts/${raft}/crew-suggestions?date=2026-11-12` });
    expect(cultivationRecordsPlan("harvest", "GET", query({ date: "12/11/2026" }))).toBeUndefined();
    expect(cultivationRecordsPlan("harvest", "GET", query({ extra: "1" }))).toBeUndefined();
  });
  it("forwards the optional crew without adding it to a legacy write", () => {
    const legacy = post("harvest", { action: "record", id: raft, zoneId: zone, body: trip });
    expect(legacy?.body).not.toHaveProperty("crew");
    const next = post("harvest", { action: "record", id: raft, zoneId: zone, body: { ...trip, crew: [cycle] } });
    expect(next?.body).toMatchObject({ crew: [cycle] });
    expect(post("harvest", { action: "record", id: raft, zoneId: zone, body: { ...trip, crew: [cycle, cycle] } })).toBeUndefined();
  });
  it("accepts half a cage and an estimate", () => {
    expect(harvestValues.safeParse(trip).success).toBe(true);
    expect(harvestValues.safeParse({ ...trip, cageCount: 12.25, estimatedKg: 612.5 }).success).toBe(true);
  });
  it.each([0, -1, 100_000.01, 0.123, Number.NaN])("refuses cageCount %s", cageCount => expect(harvestValues.safeParse({ ...trip, cageCount }).success).toBe(false));
  it("refuses an estimate with more than 2 decimals or above 1e9", () => {
    expect(harvestValues.safeParse({ ...trip, estimatedKg: 10.005 }).success).toBe(false);
    expect(harvestValues.safeParse({ ...trip, estimatedKg: 1_000_000_001 }).success).toBe(false);
  });
  it("does not take a purchase request: a trip names its plan line instead", () => {
    expect(harvestValues.safeParse(trip).success).toBe(true);
    expect(harvestValues.safeParse({ ...trip, purchaseRequestId: order }).success).toBe(false);
    expect(harvestValues.safeParse({ ...trip, harvestPlanLineId: order }).success).toBe(true);
    expect(harvestValues.safeParse({ ...trip, harvestPlanLineId: "not-a-guid" }).success).toBe(false);
  });
  it("sends the exact multipart fields the backend reads for a trip with decimal cages and a crew", () => {
    const body = { laneNumbers: [1, 2], finishedLaneNumbers: [], cageCount: 14.5, estimatedKg: 700, crew: [cycle] };
    const plan = post("harvest", { action: "record", id: raft, zoneId: zone, body });
    expect(plan?.body).toEqual(body);
    expect(plan).toMatchObject({ multipartFields: true, path: `/api/rafts/${raft}/harvest-lots` });
  });
  it("has no plan cap: a harvest never carries an over-plan confirmation", () => {
    expect(harvestValues.safeParse({ ...trip, confirmOverPlan: true, overPlanReason: "Hàu lớn nhanh" }).success).toBe(false);
    expect(harvestValues.safeParse({ ...trip, cageCount: 100_000, estimatedKg: 999_999_999 }).success).toBe(true);
  });
  it("a correction does not carry the purchase request", () => {
    const fields = { laneNumbers: [1], finishedLaneNumbers: [], cageCount: 0.5, estimatedKg: null };
    expect(harvestCorrection.safeParse({ ...fields, keepPhotoKeys: [], reason: "đếm lại", rowVersion: "v" }).success).toBe(true);
    expect(harvestCorrection.safeParse({ ...fields, purchaseRequestId: order, keepPhotoKeys: [], reason: "đếm lại", rowVersion: "v" }).success).toBe(false);
  });
  it("keeps the JSON record plan on the same contract", () => {
    const plan = post("harvest", { action: "record", id: raft, zoneId: zone, body: { ...trip, cageCount: 2.5 } });
    expect(plan).toMatchObject({ path: `/api/rafts/${raft}/harvest-lots`, multipartFields: true });
    expect(post("harvest", { action: "record", id: raft, zoneId: zone, body: { ...trip, cageCount: 0 } })).toBeUndefined();
  });
});

describe("whole-raft harvest from a plan", () => {
  const fields = { laneNumbers: [], finishedLaneNumbers: [], cageCount: 1, estimatedKg: null, productLines: [{ productId: cycle, cageCount: 1, kg: null }], harvestPlanLineId: order };
  it("forwards empty lanes only with a valid plan line and the plan-harvest fields", () => {
    expect(harvestValues.safeParse(fields).success).toBe(true);
    expect(post("harvest", { action: "record", id: raft, zoneId: zone, body: fields })).toMatchObject({ body: fields, multipartFields: true });
    for (const invalid of [{ ...fields, harvestPlanLineId: undefined }, { ...fields, harvestPlanLineId: "bad" }, { ...fields, productLines: [] }, { ...fields, finishedLaneNumbers: [1] }, { ...fields, cageCount: 0 }]) expect(harvestValues.safeParse(invalid).success).toBe(false);
  });
});

describe("harvest answers keep the optional new fields and tolerate an old backend", () => {
  const lot = { id: raft, lotCode: "KV01-B01-20261111" };
  it("defaults warnings to none for an older backend", () => {
    const old = harvestSaved.parse({ lot });
    expect(old.warnings).toEqual([]);
  });
  it("keeps the non-blocking warnings and the cycle flags", () => {
    const saved = harvestSaved.parse({ lot, everySeededLaneHarvested: true, cycleRowVersion: "AAAA", message: "x",
      warnings: [{ code: "ESTIMATED_KG_FAR_FROM_CAGES", message: "far", details: { workedKg: 100, minKg: 20, maxKg: 200 } }] });
    expect(saved.warnings[0]).toMatchObject({ code: "ESTIMATED_KG_FAR_FROM_CAGES", details: { maxKg: 200 } });
    expect(saved.everySeededLaneHarvested).toBe(true);
  });
  it("parses a corrected lot with a warning list", () => expect(harvestCorrected.safeParse({ lot: {}, warnings: [] }).success).toBe(false));
});

describe("record history reads", () => {
  const get = (area: "harvest" | "seeding" | "material-usages", query: string) => cultivationRecordsPlan(area, "GET", new URLSearchParams(query));
  it("maps each record kind to its own history route", () => {
    const q = `action=history&id=${raft}&zoneId=${zone}`;
    expect(get("harvest", q)).toMatchObject({ method: "GET", path: `/api/harvest-lots/${raft}/history`, permission: "View" });
    expect(get("seeding", q)?.path).toBe(`/api/seeding-records/${raft}/history`);
    expect(get("material-usages", q)?.path).toBe(`/api/material-usages/${raft}/history`);
  });
  it.each(["action=history", `action=history&id=bad&zoneId=${zone}`, `action=history&id=${raft}&zoneId=${zone}&x=1`])("refuses %s", query => expect(get("harvest", query)).toBeUndefined());
  it("parses the history answer with its changed fields", () => {
    const plan = get("harvest", `action=history&id=${raft}&zoneId=${zone}`)!;
    expect(plan.schema.safeParse([{ at: "2026-11-12T08:00:00+07:00", action: "HarvestLot.Corrected", byName: "A", byRole: "Owner", reason: "r", note: null, changes: [{ field: "cageCount", label: "Số lồng", from: 4, to: 5 }] }]).success).toBe(true);
  });
});

describe("material usage removal", () => {
  it("posts reason and version to the remove route (204)", () => {
    const plan = cultivationRecordsPlan("material-usages", "POST", new URLSearchParams(), { action: "remove", id: raft, zoneId: zone, body: { reason: "Nhập nhầm", rowVersion: "AAAA" } });
    expect(plan).toMatchObject({ method: "POST", path: `/api/material-usages/${raft}/remove`, noContent: true, permission: "Delete" });
    expect(cultivationRecordsPlan("material-usages", "POST", new URLSearchParams(), { action: "remove", id: raft, zoneId: zone, body: { rowVersion: "AAAA" } })).toBeUndefined();
  });
});

describe("seeding over-plan answer", () => {
  it("accepts confirmOverPlan with a reason on record and correct, and refuses one without the other", () => {
    const base = { seedingDate: "2026-11-12", seedLotId: cycle, laneNumbers: [1], quantity: 40 };
    expect(post("seeding", { action: "record", id: cycle, zoneId: zone, body: { ...base, confirmOverPlan: true, overPlanReason: "Hao hụt" } })?.body).toMatchObject({ confirmOverPlan: true });
    expect(post("seeding", { action: "record", id: cycle, zoneId: zone, body: { ...base, confirmOverPlan: true } })).toBeUndefined();
    expect(post("seeding", { action: "correct", id: cycle, zoneId: zone, body: { ...base, reason: "r", rowVersion: "A", confirmOverPlan: true, overPlanReason: "x" } })).toMatchObject({ method: "PUT" });
  });
});

describe("seeding complete: confirm an empty seeding", () => {
  it("passes confirmEmpty and nothing else", () => {
    expect(post("seeding", { action: "complete", id: cycle, zoneId: zone, body: { rowVersion: "AAAA", confirmEmpty: true } })?.body).toEqual({ rowVersion: "AAAA", confirmEmpty: true });
    expect(post("seeding", { action: "complete", id: cycle, zoneId: zone, body: { rowVersion: "AAAA" } })?.body).toEqual({ rowVersion: "AAAA" });
    expect(post("seeding", { action: "complete", id: cycle, zoneId: zone, body: { rowVersion: "AAAA", confirmEmpty: "yes" } })).toBeUndefined();
    // The Owner may complete while crew is not checked out (MSG-LABOR-37), with a reason; anything else stays refused.
    expect(post("seeding", { action: "complete", id: cycle, zoneId: zone, body: { rowVersion: "AAAA", ownerApproved: true, approvalReason: "Quên điểm danh" } })?.body).toEqual({ rowVersion: "AAAA", ownerApproved: true, approvalReason: "Quên điểm danh" });
    expect(post("seeding", { action: "complete", id: cycle, zoneId: zone, body: { rowVersion: "AAAA", ownerApproved: true, extra: 1 } })).toBeUndefined();
  });
});
