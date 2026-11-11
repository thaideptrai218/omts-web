import { describe, expect, it } from "vitest";
import { againstThreshold, emptyWaterFilters, filterWater, raftsOf, sortWater, type WaterRow } from "./water-history-model";

const thresholds = { phMin: null, phMax: null, salinityMin: null, salinityMax: null, temperatureMin: null, temperatureMax: null };
const row = (patch: Partial<WaterRow> & { id: string }): WaterRow => ({
  raftId: "raft-a", raftCode: "B01", measuredAt: "2026-11-01T08:00:00+07:00", ph: 7.5, salinity: 20, temperature: 28, status: "Active", statusCode: "ACTIVE",
  alertState: "None", violatedValues: null, measuredBy: { id: "u1", name: "Nguyễn Văn An" }, thresholdsUsed: thresholds, valuesOutside: [], voidReason: null, ...patch,
});
const rows = [
  row({ id: "1", ph: 7.2, measuredAt: "2026-11-01T08:00:00+07:00" }),
  row({ id: "2", ph: 9.1, raftId: "raft-b", raftCode: "B10", measuredAt: "2026-11-03T08:00:00+07:00", violatedValues: "pH 9,1 cao hơn ngưỡng", measuredBy: null }),
  row({ id: "3", ph: 6.4, raftId: "raft-b", raftCode: "B10", measuredAt: "2026-11-02T08:00:00+07:00", valuesOutside: [{ indicator: "pH", value: 6.4, unit: null, direction: "Low", min: 6.5, max: 8.5 }] }),
];

describe("water history list", () => {
  it("keeps only rows outside their thresholds when asked", () => {
    expect(filterWater(rows, { ...emptyWaterFilters, exceeded: true }).map(r => r.id)).toEqual(["2", "3"]);
  });
  it("filters by raft and by accent-free search over raft code and recorder", () => {
    expect(filterWater(rows, { ...emptyWaterFilters, raftId: "raft-b" }).map(r => r.id)).toEqual(["2", "3"]);
    expect(filterWater(rows, { ...emptyWaterFilters, search: "nguyen van an" }).map(r => r.id)).toEqual(["1", "3"]);
  });
  it("sorts the whole set by time or value in both directions", () => {
    expect(sortWater(rows, "time", "desc").map(r => r.id)).toEqual(["2", "3", "1"]);
    expect(sortWater(rows, "ph", "asc").map(r => r.id)).toEqual(["3", "1", "2"]);
  });
  it("lists each raft once, in natural order", () => {
    expect(raftsOf(rows)).toEqual([["raft-a", "B01"], ["raft-b", "B10"]]);
  });
  it("judges a value against the thresholds it was recorded with", () => {
    expect(againstThreshold(7, null, null)).toBe("none");
    expect(againstThreshold(7, 6.5, 8.5)).toBe("ok");
    expect(againstThreshold(6, 6.5, 8.5)).toBe("low");
    expect(againstThreshold(9, 6.5, 8.5)).toBe("high");
  });
});
