import { describe, expect, it } from "vitest";
import { formatLaneRanges, laneSummary, parseLaneRanges } from "./harvest-lane-ranges";

describe("harvest lane ranges", () => {
  it("compresses runs of three or more and keeps pairs and singles", () => {
    expect(formatLaneRanges([15, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe("1–10, 15");
    expect(formatLaneRanges([1, 2, 5, 7, 8, 9])).toBe("1, 2, 5, 7–9");
    expect(formatLaneRanges([4, 4, 4])).toBe("4");
    expect(formatLaneRanges([])).toBe("");
    expect(laneSummary([1, 2, 3, 15])).toBe("Làn 1–3, 15");
    expect(laneSummary([])).toBe("");
  });
  it("reads ranges, singles and mixed separators into sorted unique numbers", () => {
    expect(parseLaneRanges("1-10, 15, 20-25")).toEqual({ numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 21, 22, 23, 24, 25], invalid: [] });
    expect(parseLaneRanges("7–5 ; 5 3").numbers).toEqual([3, 5, 6, 7]);
    expect(parseLaneRanges("").numbers).toEqual([]);
  });
  it("reports what it cannot read instead of guessing", () => {
    expect(parseLaneRanges("1-3, abc, 0, 4-").invalid).toEqual(["abc", "0", "4-"]);
    expect(parseLaneRanges("1-99999").invalid).toEqual(["1-99999"]);
  });
  it("round trips what it formats", () => {
    const lanes = [1, 2, 3, 4, 9, 12, 13, 30, 31, 32];
    expect(parseLaneRanges(formatLaneRanges(lanes)).numbers).toEqual(lanes);
  });
});
