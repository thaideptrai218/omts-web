import { describe, expect, it } from "vitest";
import type { YieldGroup, YieldLot } from "./contracts";
import { filterCycleGroups, regroup, sortRows } from "./yield-rows";
import { deltaPercent, insightsOf, kpisOf, previousRange } from "./yield-summary-model";
import { aggregateTrend, cumulative, niceMax, weekStart } from "./yield-trend-model";

const lot = (over: Partial<YieldLot>): YieldLot => ({ id: "l", lotCode: "L", harvestDate: "2026-11-02", inPeriod: true, raftId: "r1", raftCode: "B1", zoneId: "z1", zoneCode: "V1", cycleId: "c1", statusId: 1, status: "Open",
  estimatedKg: 100, invoicedKg: 0, returnedKg: 0, soldKg: 0, lostKg: 0, differenceKg: 0, notFinal: false, cageCount: 2, remainingKg: 100, ...over });
const group = (over: Partial<YieldGroup>): YieldGroup => ({ key: "c1", label: "x", zoneId: "z1", zoneCode: "V1", zoneName: "Vùng 1", raftId: "r1", raftCode: "B1", cycleId: "c1", cycleStartDate: "2026-10-01", cycleCloseDate: null, cycleStatus: "Open",
  lotCount: 1, estimatedKg: 100, soldKg: 0, lostKg: 0, differenceKg: 0, notFinal: false, harvestedCages: 2, targetYieldKg: null, availableKg: 100, lots: [lot({})], ...over });

describe("kpis and previous period", () => {
  const groups = [group({}), group({ key: "c2", raftId: "r2", raftCode: "B2", cycleId: "c2", estimatedKg: 300, harvestedCages: 5, targetYieldKg: 1000, availableKg: 300 })];
  it("sums real fields, kg per cage only over groups with cages, target only over groups with a target", () => {
    const k = kpisOf(groups);
    expect(k).toMatchObject({ lots: 2, cages: 7, kg: 400, rafts: 2, targetPct: 30, targetCycles: 1 });
    expect(k.kgPerCage).toBeCloseTo(400 / 7);
    expect(kpisOf([group({ harvestedCages: null, availableKg: null })]).cages).toBeNull();
  });
  it("delta is null without a previous base; previous range is equal length and adjacent", () => {
    expect(deltaPercent(150, 100)).toBe(50);
    expect(deltaPercent(10, 0)).toBeNull();
    expect(previousRange("2026-11-01", "2026-11-30")).toEqual({ from: "2026-10-02", to: "2026-10-31" });
    expect(previousRange("0001-01-01", "2026-11-30")).toBeNull();
  });
});

describe("regroup, filter and sort", () => {
  const groups = [group({}), group({ key: "c0", cycleId: "c0", cycleStatus: "Closed", cycleCloseDate: "2026-09-30", estimatedKg: 50, lots: [lot({ harvestDate: "2026-09-20", estimatedKg: 50 })] }), group({ key: "c3", raftId: "r3", raftCode: "B3", zoneId: "z2", zoneCode: "V2", zoneName: "Vùng 2", lots: [lot({ harvestDate: "2026-11-09", raftId: "r3", zoneId: "z2", zoneCode: "V2" })] })];
  it("merges cycles of one raft and groups by zone or month from lots", () => {
    expect(regroup(groups, "Raft").find((row) => row.raftId === "r1")).toMatchObject({ estimatedKg: 150, lotCount: 2, cycleId: null, cycleStatus: "Open" });
    expect(regroup(groups, "Zone")).toHaveLength(2);
    expect(regroup(groups, "Month").map((row) => row.label)).toEqual(["Tháng 11/2026", "Tháng 09/2026"]);
  });
  it("filters by status and sorts missing values last", () => {
    expect(filterCycleGroups(groups, { raftId: "", statuses: ["closed"] })).toHaveLength(1);
    const rows = regroup([group({ key: "a", harvestedCages: null }), group({ key: "b", raftId: "r2", raftCode: "B2", estimatedKg: 400, harvestedCages: 4 })], "Raft");
    expect(sortRows(rows, "kgPerCage", "desc").map((row) => row.raftCode)).toEqual(["B2", "B1"]);
    expect(sortRows(rows, "kgPerCage", "asc").map((row) => row.raftCode)).toEqual(["B2", "B1"]);
  });
  it("insights list rafts without a harvest and closed cycles with days and target", () => {
    const result = insightsOf([group({ cycleStatus: "Closed", cycleStartDate: "2026-08-01", cycleCloseDate: "2026-09-30", targetYieldKg: 200 })], [{ id: "r1", code: "B1" }, { id: "r9", code: "B9" }]);
    expect(result.notHarvested).toEqual([{ id: "r9", code: "B9" }]);
    expect(result.closed[0]).toMatchObject({ days: 60, targetPct: 50 });
    expect(insightsOf([], undefined).notHarvested).toBeUndefined();
  });
});

describe("trend buckets", () => {
  it("buckets only in-period lots by day, week (Monday) and month, with a running total", () => {
    const groups = [group({ lots: [lot({ harvestDate: "2026-11-02" }), lot({ harvestDate: "2026-11-04", estimatedKg: 50, cageCount: null }), lot({ harvestDate: "2026-11-12", inPeriod: false })] })];
    expect(weekStart("2026-11-04")).toBe("2026-11-02");
    expect(aggregateTrend(groups, "day")).toHaveLength(2);
    const weeks = aggregateTrend(groups, "week");
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toMatchObject({ kg: 150, cages: 2, zoneKg: { V1: 150 } });
    expect(cumulative(aggregateTrend(groups, "day"), "kg")).toEqual([100, 150]);
    expect(niceMax(1630)).toBe(2000);
  });
});
