import { describe, expect, it } from "vitest";
import * as c from "./contracts";
import { operationAllowed } from "./permissions";
import { ids, receiptFixture, waterFixture } from "./__tests__/fixtures";
import { businessTime, toApiTime } from "./ui";

describe("purchasing and water contracts", () => {
  it("projects nested evidence and account references without arbitrary sensitive fields", () => {
    const receipt = c.receiptSchema.parse({ ...receiptFixture(), passwordHash: "must-not-leave", supplier: { ...receiptFixture().supplier, accessToken: "must-not-leave" } });
    const water = c.waterSchema.parse({ ...waterFixture(), accessToken: "must-not-leave", measuredBy: { id: ids.supplier, name: "QA", phoneNumber: "must-not-leave" } });
    expect(JSON.stringify({ receipt, water })).not.toContain("must-not-leave");
  });
  it("has no correction contract: a recorded measurement is only voided, with a reason", () => {
    expect("correctWaterSchema" in c).toBe(false);
    expect(c.voidWaterSchema.safeParse({}).success).toBe(false);
    expect(c.voidWaterSchema.safeParse({ reason: "Đo nhầm bè" }).success).toBe(true);
  });
  it("accepts the v2 history row and raw chart points the backend returns", () => {
    const thresholdsUsed = { phMin: 7.5, phMax: 8.5, salinityMin: 18, salinityMax: 32, temperatureMin: 15, temperatureMax: 32 };
    const row = { id: ids.water, measuredAt: "2026-10-29T06:30:00+07:00", raftId: ids.raft, raftCode: "B1-05", ph: 8.72, salinity: 27.5, temperature: 25.75, status: "Active", statusCode: "ACTIVE",
      alertState: "Active", violatedValues: "pH 8.72 > 8.50", measuredBy: { id: ids.supplier, name: "QA" }, thresholdsUsed,
      valuesOutside: [{ indicator: "PH", value: 8.72, unit: null, direction: "High", min: 7.5, max: 8.5 }], voidReason: null };
    expect(c.waterHistorySchema.safeParse({ items: [row], page: 1, pageSize: 20, total: 1, from: "2026-08-01", to: "2026-11-01", message: null, messageCode: null }).success).toBe(true);
    expect(c.waterHistorySchema.safeParse({ items: [{ ...row, alertState: "Corrected" }], page: 1, pageSize: 20, total: 1 }).success).toBe(false);
    const chart = { zoneId: ids.zone, from: "2026-08-01", to: "2026-11-01", thresholds: thresholdsUsed, points: [{ id: ids.water, measuredAt: "2026-10-11T06:50:00+07:00", ph: 8, salinity: 27, temperature: 25.5 }] };
    expect(c.waterChartSchema.safeParse(chart).success).toBe(true);
    expect(c.waterChartSchema.safeParse({ ...chart, points: undefined }).success).toBe(false);
  });
  it.each([{ phMin: null, phMax: 8, salinityMin: null, salinityMax: null, temperatureMin: null, temperatureMax: null }, { phMin: 9, phMax: 8, salinityMin: null, salinityMax: null, temperatureMin: null, temperatureMax: null },
    { phMin: null, phMax: null, salinityMin: null, salinityMax: null, temperatureMin: 30, temperatureMax: null }])("does not accept partial or reversed threshold pairs", (thresholds) => {
    expect(c.setThresholdsSchema.safeParse(thresholds).success).toBe(false);
  });
  it("keeps Vietnam wall time across the client/server boundary", () => {
    expect(businessTime("2026-10-28T20:15:00Z")).toBe("2026-10-29T03:15");
    expect(toApiTime("2026-10-29T03:15")).toBe("2026-10-29T03:15:00+07:00");
  });
  it("does not infer payment-wide or another-zone rights from one grant", () => {
    const staff = { subjectType: "Staff" };
    const grant = { functionCode: "SUPPLIER_PAYMENTS", action: "Create" as const, scope: { kind: "zones" as const, zoneIds: [ids.zone] }, dataScope: "AssignedZone" as const };
    // Supplier payments are not scoped to a zone: any grant that names a zone, or all zones, is enough; a grant naming none is not.
    expect(operationAllowed("supplier-payments", staff, [grant], "Create")).toBe(true);
    expect(operationAllowed("supplier-payments", staff, [{ ...grant, scope: { kind: "zones", zoneIds: [] } }], "Create")).toBe(false);
    expect(operationAllowed("supplier-payments", staff, [{ ...grant, scope: { kind: "all-zones" } }], "Create")).toBe(true);
    expect(operationAllowed("water", staff, [{ ...grant, functionCode: "WATER_MEASUREMENTS" }], "Create", ids.otherZone)).toBe(false);
    expect(operationAllowed("water", staff, [{ ...grant, functionCode: "WATER_MEASUREMENTS" }], "Create", ids.zone)).toBe(true);
    expect(operationAllowed("water", staff, [], "Thresholds", ids.zone)).toBe(false);
    expect(operationAllowed("purchase-receipts", { subjectType: "Trader" }, [], "View")).toBe(false);
  });
  it("fails closed on OwnRecords until the backend enforces creator scope", () => {
    const own = { functionCode: "WATER_MEASUREMENTS", action: "View" as const, scope: { kind: "zones" as const, zoneIds: [ids.zone] }, dataScope: "OwnRecords" as const };
    expect(operationAllowed("water", { subjectType: "Staff" }, [own])).toBe(false);
    expect(operationAllowed("water", { subjectType: "Staff" }, [own, { ...own, dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.otherZone] } }])).toBe(false);
    expect(operationAllowed("water", { subjectType: "Staff" }, [own, { ...own, dataScope: "AssignedZone" }])).toBe(true);
  });
});
