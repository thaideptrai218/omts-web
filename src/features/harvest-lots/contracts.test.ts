import { describe, expect, it } from "vitest";
import { cageValues, closeValues, lotMovements, lotPage, reopenValues, weighValues } from "./contracts";
import { lotStatusText } from "./lot-labels";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
const row = { id, lotCode: "L1", harvestedAt: "2026-11-17T08:00:00+07:00", harvestDate: "2026-11-17", zoneId: id, zoneCode: "V1", raftId: id, raftCode: "B1", cageCount: 1, estimatedKg: 50,
  figures: { invoicedKg: 0, returnedKg: 0, soldKg: 0, remainingKg: 50, lostKg: 0 }, statusId: 2904, status: "AwaitingWeighing" };
const totals = { cageCount: 1, estimatedKg: 50, weighedKg: 0, soldKg: 0, remainingKg: 50, lostKg: 0 };

describe("lot list contract", () => {
  it("reads optional fields as absent and the products as an empty list", () => {
    const parsed = lotPage.parse({ items: [row], total: 1, page: 1, pageSize: 15, totals });
    expect(parsed.items[0].products).toEqual([]);
    expect(parsed.items[0].weighedKg).toBeUndefined();
  });
  it("refuses a page without totals or a row with a text status id", () => {
    expect(lotPage.safeParse({ items: [row], total: 1, page: 1, pageSize: 15 }).success).toBe(false);
    expect(lotPage.safeParse({ items: [{ ...row, statusId: "2904" }], total: 1, page: 1, pageSize: 15, totals }).success).toBe(false);
  });
  it("reads movements as a list or as items", () => {
    const movement = { id, occurredAt: "2026-11-17T08:00:00+07:00", kind: "LotClose", quantityKg: -5 };
    expect(lotMovements.parse([movement])).toHaveLength(1);
    expect(lotMovements.parse({ items: [movement] })).toHaveLength(1);
  });
});

describe("lot writes", () => {
  it("weigh: only the version and an optional time (the kg come from the cages)", () => {
    expect(weighValues.safeParse({ rowVersion: "v" }).success).toBe(true);
    expect(weighValues.safeParse({ rowVersion: "v", weighedAt: "2026-11-17T10:30:00+07:00" }).success).toBe(true);
    expect(weighValues.safeParse({ rowVersion: "v", weighedKg: 2 }).success).toBe(false);
  });
  it("cage kg: above 0, at most 3 decimals", () => {
    expect(cageValues.safeParse({ kg: 12.125 }).success).toBe(true);
    expect(cageValues.safeParse({ kg: 0 }).success).toBe(false);
    expect(cageValues.safeParse({ kg: 1.0001 }).success).toBe(false);
  });
  it("reopen needs a reason; close needs a reason above 0 kg", () => {
    expect(reopenValues.safeParse({ rowVersion: "v", reason: " " }).success).toBe(false);
    expect(closeValues.safeParse({ rowVersion: "v", leftoverKg: 2 }).success).toBe(false);
    expect(closeValues.safeParse({ rowVersion: "v", leftoverKg: 0 }).success).toBe(true);
  });
});

describe("status 2904", () => {
  it("is Chờ cân by id or by the name the API sends, in either casing", () => {
    expect(lotStatusText(2904)).toBe("Chờ cân");
    expect(lotStatusText(undefined, "AwaitingWeighing")).toBe("Chờ cân");
    expect(lotStatusText(undefined, "AWAITINGWEIGHING")).toBe("Chờ cân");
    expect(lotStatusText(2902)).toBe("Mở lại");
  });
});
