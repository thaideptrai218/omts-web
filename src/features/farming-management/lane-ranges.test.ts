import { describe, expect, it } from "vitest";
import { compressLaneNumbers, parseLaneRanges } from "./lane-ranges";

describe("lane ranges", () => {
  it("compresses unsorted duplicates and skips invalid lane numbers", () => {
    expect(compressLaneNumbers([20, 2, 1, 3, 12, 15, 16, 17, 18, 19, 2, 0, -1, 1.5])).toBe("1–3, 12, 15–20");
    expect(compressLaneNumbers([])).toBe("");
    expect(compressLaneNumbers(Array.from({ length: 100 }, (_, index) => index + 1))).toBe("1–100");
  });
  it("parses ranges and deduplicates overlapping selections", () => {
    expect(parseLaneRanges("1-3, 2, 10–12")).toEqual([1, 2, 3, 10, 11, 12]);
    expect(parseLaneRanges("")).toEqual([]);
  });
  it("rejects malformed, reversed and unbounded ranges", () => {
    for (const input of ["0", "4-2", "1-201", "1.5", "1,", "abc", "1-999999999"]) expect(parseLaneRanges(input)).toBeNull();
  });
});
