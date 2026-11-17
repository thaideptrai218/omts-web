import { describe, expect, it } from "vitest";
import { backdateProblem, backdateWindow, shiftDateOnly } from "./backdate-window";

describe("backdate window", () => {
  it("shifts across month and year boundaries", () => {
    expect(shiftDateOnly("2026-11-11", 30)).toBe("2026-10-12");
    expect(shiftDateOnly("2026-01-10", 30)).toBe("2025-12-11");
  });
  it("uses 30 days back when there is no cycle floor or the floor is older", () => {
    expect(backdateWindow("2026-11-11")).toEqual({ min: "2026-10-12", max: "2026-11-11" });
    expect(backdateWindow("2026-11-11", "2026-09-01").min).toBe("2026-10-12");
  });
  it("lets a later cycle start narrow the window", () => {
    expect(backdateWindow("2026-11-11", "2026-11-05").min).toBe("2026-11-05");
  });
  it("reports future, too old and acceptable dates", () => {
    const window = backdateWindow("2026-11-11", "2026-11-05");
    expect(backdateProblem("2026-11-12", window, "Ngày thả giống")).toMatch(/sau hôm nay/);
    expect(backdateProblem("2026-11-01", window, "Ngày thả giống", true)).toMatch(/trước ngày bắt đầu chu kỳ/);
    expect(backdateProblem("2026-09-01", backdateWindow("2026-11-11"), "Ngày đo")).toMatch(/30 ngày/);
    expect(backdateProblem("2026-11-08", window, "Ngày thả giống")).toBeUndefined();
    expect(backdateProblem("", window, "Ngày thả giống")).toBeUndefined();
  });
});
