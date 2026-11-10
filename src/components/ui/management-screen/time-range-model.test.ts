import { describe, expect, it } from "vitest";
import { presetValue, toDisplayDate, toQueryDate } from "./time-range-model";

// Wednesday 11 November 2026, close enough to midnight that a UTC conversion would land on another day.
const now = new Date(2026, 10, 11, 0, 30);
const range = (preset: Parameters<typeof presetValue>[0]) => { const value = presetValue(preset, now); return [value.from, value.to]; };

describe("time presets", () => {
  it("keeps the local calendar day", () => {
    expect(toQueryDate(new Date(2026, 0, 1, 0, 5))).toBe("2026-01-01");
    expect(range("today")).toEqual(["2026-11-11", "2026-11-11"]);
    expect(range("yesterday")).toEqual(["2026-11-10", "2026-11-10"]);
  });
  it("starts the week on Monday, also when today is Sunday", () => {
    expect(range("thisWeek")).toEqual(["2026-11-09", "2026-11-15"]);
    expect(range("lastWeek")).toEqual(["2026-11-02", "2026-11-08"]);
    const sunday = presetValue("thisWeek", new Date(2026, 10, 15, 12));
    expect([sunday.from, sunday.to]).toEqual(["2026-11-09", "2026-11-15"]);
  });
  it("counts rolling ranges including today", () => {
    expect(range("last7")).toEqual(["2026-11-05", "2026-11-11"]);
    expect(range("last30")).toEqual(["2026-10-13", "2026-11-11"]);
  });
  it("crosses month, quarter and year boundaries", () => {
    expect(range("thisMonth")).toEqual(["2026-11-01", "2026-11-30"]);
    expect(range("lastMonth")).toEqual(["2026-10-01", "2026-10-31"]);
    expect(range("thisQuarter")).toEqual(["2026-10-01", "2026-12-31"]);
    expect(range("lastQuarter")).toEqual(["2026-07-01", "2026-09-30"]);
    expect(range("lastYear")).toEqual(["2025-01-01", "2025-12-31"]);
    const january = presetValue("lastQuarter", new Date(2026, 0, 20));
    expect([january.from, january.to]).toEqual(["2025-10-01", "2025-12-31"]);
  });
  it("sends no dates for the whole time", () => {
    expect(range("all")).toEqual(["", ""]);
  });
  it("displays dd/mm/yyyy", () => {
    expect(toDisplayDate("2026-03-07")).toBe("07/03/2026");
  });
});
