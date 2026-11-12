import { describe, expect, it } from "vitest";
import { cycleSummary } from "./contracts";
import { seedCorrection, seedValues, seedingList, seedingRecord } from "./records-contracts";

const id = "00000000-0000-4000-8000-000000000001";
const list = {
  cycleId: id, raftId: id, raftCode: "B1", laneCount: 4, seededCount: 1,
  canRecord: true, canMarkComplete: true, cycleRowVersion: "v1",
};
const record = {
  id, cycleId: id, raftId: id, raftCode: "B1", seedingDate: "2026-11-13",
  quantity: 3000, laneNumbers: [1, 2], recordedAt: "2026-11-13T01:00:00Z", rowVersion: "v1",
};

describe("seeding V2 read contracts", () => {
  it("accepts missing additions and metadata, dropping unknown fields", () => {
    const parsed = seedingList.parse({ ...list, records: [{ ...record, seedLot: { itemName: "Hàu giống", future: true } }], future: true });
    expect(parsed.nurseryRemaining).toBeUndefined();
    expect(parsed.lanes).toEqual([]);
    expect(parsed.lots).toEqual([]);
    expect(parsed.records[0].seedLot).toMatchObject({ itemName: "Hàu giống", code: "", unit: "" });
    expect(parsed).not.toHaveProperty("future");
    expect(parsed.records[0].seedLot).not.toHaveProperty("future");
  });
  it("keeps nursery stock separate from the quantity seeded by this cycle", () => {
    const parsed = seedingList.parse({ ...list, nurseryBatchId: id, nurseryCode: "NU000001", nurseryRemaining: 6500, nurserySeeded: 3000, seedLot: { code: "LG01", itemName: "Hàu giống" } });
    expect(parsed).toMatchObject({ nurseryRemaining: 6500, nurserySeeded: 3000, nurseryCode: "NU000001", seedLot: { code: "LG01" } });
    expect(parsed.seedLot?.receiptCode).toBe("");
  });
  it("does not derive the shared nursery pool from historical allocation data", () => {
    expect(seedingList.parse({ ...list, nurseryAllocated: 4800, nurserySeeded: 1000 }).nurseryRemaining).toBeUndefined();
  });
  it("reads the seedable lane numbers and the remaining percent of each lane", () => {
    const parsed = seedingList.parse({
      ...list, seedableLaneNumbers: [2, 3],
      lanes: [{ laneNumber: 1, seededPercent: 100, remainingPercent: 0, canSeed: true }, { laneNumber: 2, seededPercent: 60, remainingPercent: 40, future: true }],
    });
    expect(parsed.seedableLaneNumbers).toEqual([2, 3]);
    expect(parsed.lanes[1]).toMatchObject({ laneNumber: 2, seededPercent: 60, remainingPercent: 40 });
    expect(parsed.lanes[1]).not.toHaveProperty("future");
  });
  it("leaves seedableLaneNumbers unknown when an older backend omits it", () => {
    expect(seedingList.parse(list).seedableLaneNumbers).toBeUndefined();
  });
  it("reads old records without a lot or photos without failing the whole screen", () => {
    const parsed = seedingRecord.parse(record);
    expect(parsed.seedLot.code).toBe("");
    expect(parsed.photos).toEqual([]);
    expect(parsed.canCorrect).toBe(false);
  });
  it("exposes nursery and original lot metadata on the cycle summary", () => {
    const parsed = cycleSummary.parse({
      id, startDate: "2026-11-13", closeDate: null, statusId: 1, status: "Open", rowVersion: "v1",
      nurseryCode: "NU000001", nurseryRemaining: 6500, nurserySeeded: 3000, seedLot: { itemName: "Hàu giống" },
    });
    expect(parsed).toMatchObject({ nurseryCode: "NU000001", nurseryRemaining: 6500, nurserySeeded: 3000, seedLot: { itemName: "Hàu giống" } });
  });
});

describe("seeding V2 write contracts", () => {
  const daily = { cycleId: id, seedingDate: "2026-11-13", quantity: 3000, laneNumbers: [1, 2], lanePercents: { "1": 50, "2": 100 } };
  it("sends a freely entered daily quantity with cycleId, without a seed lot", () => {
    const parsed = seedValues.parse(daily);
    expect(parsed.quantity).toBe(3000);
    expect(parsed.cycleId).toBe(id);
    expect(parsed).not.toHaveProperty("seedLotId");
    expect(parsed.lanePercents).toEqual({ "1": 50, "2": 100 });
  });
  it.each([0, -1, NaN])("rejects invalid daily quantity %s", quantity => {
    expect(seedValues.safeParse({ ...daily, quantity }).success).toBe(false);
  });
  it("retains correction version, reason and photo identifiers", () => {
    expect(seedCorrection.parse({ ...daily, quantity: 1000, reason: "Đếm lại", rowVersion: "v1", keepPhotoIds: ["photo1"] }))
      .toMatchObject({ quantity: 1000, reason: "Đếm lại", keepPhotoIds: ["photo1"] });
  });
  it("keeps legacy lot inputs and rejects duplicate lanes", () => {
    expect(seedValues.safeParse({ ...daily, cycleId: undefined, seedLotId: id }).success).toBe(true);
    expect(seedValues.safeParse({ ...daily, laneNumbers: [1, 1] }).success).toBe(false);
  });
});
