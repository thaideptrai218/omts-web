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
  it("requires a version and reason for a correction; rejects extra mutation fields", () => {
    const values = { measuredAt: "2026-10-01T08:00:00+07:00", ph: 7.5, salinity: 25 };
    expect(c.correctWaterSchema.safeParse(values).success).toBe(false);
    expect(c.correctWaterSchema.safeParse({ ...values, reason: "Đối chiếu ảnh", recordVersion: 1 }).success).toBe(true);
    expect(c.correctWaterSchema.safeParse({ ...values, reason: "Đối chiếu ảnh", recordVersion: 1, zoneId: ids.zone }).success).toBe(false);
  });
  it.each([{ phMin: null, phMax: 8, salinityMin: null, salinityMax: null }, { phMin: 9, phMax: 8, salinityMin: null, salinityMax: null }])("does not accept partial or reversed threshold pairs", (thresholds) => {
    expect(c.setThresholdsSchema.safeParse(thresholds).success).toBe(false);
  });
  it("keeps Vietnam wall time across the client/server boundary", () => {
    expect(businessTime("2026-10-28T20:15:00Z")).toBe("2026-10-29T03:15");
    expect(toApiTime("2026-10-29T03:15")).toBe("2026-10-29T03:15:00+07:00");
  });
  it("does not infer payment-wide or another-zone rights from one grant", () => {
    const staff = { subjectType: "Staff" };
    const grant = { functionCode: "SUPPLIER_PAYMENTS", action: "Create" as const, scope: { kind: "zones" as const, zoneIds: [ids.zone] }, dataScope: "AssignedZone" as const };
    expect(operationAllowed("supplier-payments", staff, [grant], "Create")).toBe(false);
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
