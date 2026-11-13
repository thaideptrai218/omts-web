import { describe, expect, it } from "vitest";
import { defaultSeedingSort, seedingRunningTotals, sortSeedingRecords } from "./seeding-records-sort";

const rec = (id: string, seedingDate: string, quantity: number, laneNumbers: number[], recordedByName: string | null) =>
  ({ id, seedingDate, recordedAt: `${seedingDate}T08:00:00Z`, quantity, laneNumbers, recordedByName, seedLot: { code: "L" } });
const records = [rec("a", "2026-11-01", 500, [3, 4], "Bình"), rec("b", "2026-11-03", 200, [1, 2], "Âu"), rec("c", "2026-11-02", 900, [10], "Đức"), rec("d", "2026-11-04", 100, [], null)];
const totals = seedingRunningTotals(records);
const ids = (key: string, direction: "asc" | "desc") => sortSeedingRecords(records, { key, direction }, totals).map(r => r.id).join("");

describe("seeding records sort", () => {
  it("defaults to the newest date first and toggles to oldest first", () => {
    expect(defaultSeedingSort).toEqual({ key: "date", direction: "desc" });
    expect(ids("date", "desc")).toBe("dbca");
    expect(ids("date", "asc")).toBe("acbd");
  });
  it("sorts by pieces, first lane number (no lane last) and running total", () => {
    expect(ids("pieces", "asc")).toBe("dbac");
    expect(ids("pieces", "desc")).toBe("cabd");
    expect(ids("lane", "asc")).toBe("bacd");
    expect(ids("total", "desc")).toBe("dbca");
  });
  it("sorts the recorder by Vietnamese collation (Â with A, Đ after D), blank names first when ascending", () => {
    expect(ids("recorder", "asc")).toBe("dbac");
    expect(ids("recorder", "desc")).toBe("cabd");
  });
  it("computes running totals from the oldest record and does not mutate the input", () => {
    expect([...totals.entries()]).toEqual([["a", 500], ["c", 1400], ["b", 1600], ["d", 1700]]);
    expect(records.map(r => r.id).join("")).toBe("abcd");
  });
});
