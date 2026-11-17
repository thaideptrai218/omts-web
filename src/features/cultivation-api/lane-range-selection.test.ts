import { describe, expect, it } from "vitest";
import { applyLaneRangeSelection, droppedLanes } from "./lane-range-selection";

const eligible = Array.from({ length: 30 }, (_, index) => index + 1);

describe("lane range selection with exclusions", () => {
  it("selects 1-30 and drops 15 and 18", () => {
    const outcome = applyLaneRangeSelection({ current: [], range: "1-30", exclude: "15, 18", eligible });
    expect(outcome.next).toHaveLength(28);
    expect(outcome.next).not.toContain(15);
    expect(outcome.next).not.toContain(18);
    expect(outcome.excluded).toEqual([15, 18]);
  });
  it("removes lanes from the current selection when only the exclusion is typed", () => {
    expect(applyLaneRangeSelection({ current: [1, 2, 3, 4], range: "", exclude: "2 3", eligible })).toMatchObject({ next: [1, 4], excluded: [2, 3] });
  });
  it("extends the current selection, or replaces it when asked", () => {
    expect(applyLaneRangeSelection({ current: [1, 2], range: "5-6", exclude: "", eligible }).next).toEqual([1, 2, 5, 6]);
    expect(applyLaneRangeSelection({ current: [1, 2], range: "5-6", exclude: "", eligible, replace: true }).next).toEqual([5, 6]);
    expect(applyLaneRangeSelection({ current: [1, 2], range: "", exclude: "", eligible, replace: true }).next).toEqual([1, 2]);
  });
  it("reports lanes that cannot be picked and ignores excluded lanes that were never selected", () => {
    const outcome = applyLaneRangeSelection({ current: [], range: "28-33", exclude: "2", eligible });
    expect(outcome.refused).toEqual([31, 32, 33]);
    expect(outcome.next).toEqual([28, 29, 30]);
    expect(outcome.excluded).toEqual([]);
  });
  it("changes nothing when either field has unreadable text", () => {
    expect(applyLaneRangeSelection({ current: [4], range: "1-3", exclude: "x, 2", eligible })).toEqual({ next: [4], invalid: ["x"], refused: [], excluded: [] });
  });
  it("lets a lane be excluded and chosen again in the same command", () => {
    expect(applyLaneRangeSelection({ current: [], range: "1-5", exclude: "3", eligible }).next).toEqual([1, 2, 4, 5]);
  });
});

describe("dropped lanes", () => {
  it("remembers lanes taken out of the selection and forgets those chosen again", () => {
    const first = droppedLanes([1, 2, 3, 4], [1, 4]);
    expect(first).toEqual([2, 3]);
    expect(droppedLanes([1, 4], [1, 2, 4], first)).toEqual([3]);
    expect(droppedLanes([1, 2, 4], [], [3])).toEqual([1, 2, 3, 4]);
  });
});
