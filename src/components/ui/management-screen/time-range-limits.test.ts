import { describe, expect, it } from "vitest";
import { boundedRange, customRange, isTimeNarrowed, timeRangeKey, widestFrom } from "./time-range-limits";
import { allTime, presetValue } from "./time-range-model";

describe("widestFrom", () => {
  it("is the day after the same date five years ago", () => {
    expect(widestFrom("2026-11-12", 5)).toBe("2021-11-13");
  });
  it("stays inside the cap across 29 February", () => {
    expect(widestFrom("2028-02-29", 5)).toBe("2023-03-02");
    expect(widestFrom("2024-03-01", 5)).toBe("2019-03-02");
  });
});

describe("boundedRange", () => {
  it("turns Toàn thời gian into the widest allowed window ending today", () => {
    expect(boundedRange(allTime, "2026-11-12", 5)).toEqual({ from: "2021-11-13", to: "2026-11-12" });
  });
  it("sends presets and custom ranges as chosen", () => {
    expect(boundedRange(presetValue("thisMonth", new Date(2026, 10, 12)), "2026-11-12", 5)).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(boundedRange(customRange("2026-10-01", "2026-10-28"), "2026-11-12", 5)).toEqual({ from: "2026-10-01", to: "2026-10-28" });
  });
});

describe("timeRangeKey", () => {
  it("treats a preset as the same filter on any day", () => {
    expect(timeRangeKey(presetValue("today", new Date(2026, 0, 1)))).toBe(timeRangeKey(presetValue("today", new Date(2026, 5, 9))));
    expect(timeRangeKey(customRange("2026-10-01", "2026-10-28"))).toBe("2026-10-01..2026-10-28");
  });
  it("narrowed only when it is not Toàn thời gian", () => {
    expect(isTimeNarrowed(allTime)).toBe(false);
    expect(isTimeNarrowed(presetValue("thisYear"))).toBe(true);
    expect(isTimeNarrowed(customRange("2026-10-01", "2026-10-28"))).toBe(true);
  });
});
