import { describe, expect, it } from "vitest";
import { lanePercentRead, lanePercentsProblem, selectedLanePercents } from "./record-lane-percents";

describe("lanePercentRead", () => {
  it("turns the backend array into a lane map and skips unrecorded percents", () => {
    expect(lanePercentRead.parse([{ laneNumber: 1, percent: 60 }, { laneNumber: 2, percent: null }, { laneNumber: 3, percent: 100 }])).toEqual({ "1": 60, "3": 100 });
  });
  it("still accepts a plain map and a missing value", () => {
    expect(lanePercentRead.parse({ "1": 40 })).toEqual({ "1": 40 });
    expect(lanePercentRead.parse(null)).toBeNull();
  });
});

describe("selectedLanePercents", () => {
  it("defaults every selected seeding lane to 100 unless overridden", () => {
    expect(selectedLanePercents([1, 2], { "2": "60" }, 100)).toEqual({ "1": 100, "2": 60 });
  });
  it("leaves harvest lanes without a typed value out of the payload", () => {
    expect(selectedLanePercents([1, 2, 3], { "1": "40", "3": "" })).toEqual({ "1": 40 });
  });
  it("ignores lanes that are not selected", () => {
    expect(selectedLanePercents([2], { "1": "50", "2": "70" })).toEqual({ "2": 70 });
  });
});

describe("lanePercentsProblem", () => {
  it("accepts up to two decimals within (0, 100]", () => {
    expect(lanePercentsProblem([1], { "1": "12.5" }, 100)).toBeUndefined();
    expect(lanePercentsProblem([1], { "1": "100" })).toBeUndefined();
  });
  it("rejects zero, over 100 and more than two decimals", () => {
    for (const value of ["0", "100.5", "10.123"]) expect(lanePercentsProblem([1], { "1": value })).toMatch(/Phần trăm từng làn/);
  });
  it("requires a value per lane for seeding but not for harvest", () => {
    expect(lanePercentsProblem([1, 2], { "1": "" }, 100)).toBe("Nhập phần trăm cho từng làn đã chọn.");
    expect(lanePercentsProblem([1, 2], { "1": "" })).toBeUndefined();
  });
});
