import { describe, expect, it } from "vitest";
import { cycleLaborCost, laborCostByRaft } from "./labor-costs-contracts";

const id = "11111111-1111-4111-8111-111111111111";

describe("labour cost contracts", () => {
  it("reads the shifts and the split by employee type and by the way the work was paid", () => {
    const parsed = laborCostByRaft.parse({
      from: "2026-11-01", to: "2026-11-30", total: 1_050_000, totalHours: 17, totalShifts: 3.5,
      byType: [{ employeeType: "SeasonalWorker", hours: 8.5, shifts: 2.5, amount: 750_000 }, { employeeType: "Staff", hours: 8.5, shifts: 1, amount: 300_000 }],
      byKind: [{ kind: "Shift", hours: 8.5, shifts: 2.5, amount: 750_000 }, { kind: "FieldShift", hours: 8.5, shifts: 1, amount: 300_000 }],
      items: [{ raftId: id, raftCode: "B01", zoneId: id, zoneName: "Vùng 1", amount: 1_050_000, hours: 17, shifts: 3.5, byJob: [{ jobTypeId: id, jobName: "Thu hoạch", hours: 17, amount: 1_050_000, shifts: 3.5 }], byType: [], byKind: [] }],
    });
    expect(parsed.byType?.map((row) => row.employeeType)).toEqual(["SeasonalWorker", "Staff"]);
    expect(parsed.items[0]?.shifts).toBe(3.5);
  });

  it("still reads an answer without the new fields and rejects an unknown pay kind", () => {
    expect(laborCostByRaft.parse({ from: "2026-11-01", to: "2026-11-30", total: 0, items: [] }).byKind).toBeUndefined();
    const cycle = { cycleId: id, raftId: id, raftCode: "B01", startDate: "2026-11-01", closeDate: null, amount: 0, days: [] };
    expect(cycleLaborCost.parse(cycle).byType).toBeUndefined();
    expect(() => cycleLaborCost.parse({ ...cycle, byKind: [{ kind: "Salary", hours: 1, shifts: 0, amount: 1 }] })).toThrow();
  });
});
