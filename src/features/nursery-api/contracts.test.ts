import { describe, expect, it } from "vitest";
import { nurseryDetailSchema, nurseryRowSchema, nurseryStatus, nurseryStatusText, nurseryStatusTone } from "./contracts";

const row = { id: "n", code: "NU01", zoneId: "z", zoneCode: "KV01", zoneName: "Vùng 1", quantityIn: 1000,
  startDate: "2026-11-01", daysNursing: 12, statusId: 4002, status: "Completed", rowVersion: "v1" };
describe("nursery v2 read contracts", () => {
  it("accepts rollout extras, drops legacy allocations and defaults absent fields safely", () => {
    const result = nurseryDetailSchema.parse({ ...row, seedLot: { id: "l", code: "LG1", itemName: "Hàu giống", unit: "mảnh" },
      allocations: [{ raftId: "old" }], futureField: true });
    expect(result).toMatchObject({ seeded: 0, remaining: 0, closedOn: null, closeLossPieces: null, usage: [], survivors: null });
    expect(result).not.toHaveProperty("allocations");
    expect(result).not.toHaveProperty("futureField");
  });
  it("derives missing remaining only for a completed nursery and never from allocations", () => {
    expect(nurseryRowSchema.parse({ ...row, survivors: 950, seeded: 300 }).remaining).toBe(650);
    expect(nurseryRowSchema.parse({ ...row, survivors: 950, seeded: 300, remaining: 600 }).remaining).toBe(600);
    expect(nurseryRowSchema.parse({ ...row, statusId: 4004, survivors: 950, seeded: 300, remaining: 650 }).remaining).toBe(0);
    expect(nurseryRowSchema.parse({ ...row, survivors: 100, seeded: 101 }).remaining).toBe(0);
  });
  it("reads usage without optional cycle code or last date and supports status fallback", () => {
    const result = nurseryDetailSchema.parse({ ...row, statusId: undefined, status: "Closed", seedLot: { id: "l", code: "LG1", itemName: "Hàu giống", unit: "mảnh" },
      usage: [{ raftId: "r", raftCode: "BE01", cycleId: "c", seeded: 300, extra: true }] });
    expect(result.statusId).toBe(4004);
    expect(result.usage[0]).toMatchObject({ raftCode: "BE01", seeded: 300 });
    expect(nurseryStatus(4002)).toBe("Chờ thả");
    expect(nurseryStatus(4004)).toBe("Đã đóng");
    expect(nurseryStatusTone(4004)).not.toBe("danger");
    expect(nurseryStatusText({ statusId: 4004, closeLossPieces: 0 })).toBe("Đã đóng (tự động khi thả hết)");
    expect(nurseryStatusText({ statusId: 4004, closeLossPieces: 500 })).toBe("Đã đóng");
    expect(nurseryStatusText({ statusId: 4002, closeLossPieces: 0 })).toBe("Chờ thả");
  });
  it("retains required record identity and finite quantity validation", () => {
    expect(nurseryRowSchema.safeParse({ ...row, id: undefined }).success).toBe(false);
    expect(nurseryRowSchema.safeParse({ ...row, quantityIn: Infinity }).success).toBe(false);
  });
});
