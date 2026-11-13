import { describe, expect, it } from "vitest";
import { defaultSeedingPercents, overRemainingPercentProblem, remainingLanePercent, remainingPercentByLane } from "./seeding-lane-remaining-percent";

describe("remaining percent of a seeding lane", () => {
  it("prefers the backend remainingPercent, else 100 minus seeded, else 100", () => {
    expect(remainingLanePercent({ remainingPercent: 40, seededPercent: 10 })).toBe(40);
    expect(remainingLanePercent({ seededPercent: 60 })).toBe(40);
    expect(remainingLanePercent({})).toBe(100);
    expect(remainingLanePercent(undefined)).toBe(100);
    expect(remainingLanePercent({ seededPercent: 33.333 })).toBe(66.67);
  });
  it("defaults the selected lanes to what is left", () => {
    const remaining = remainingPercentByLane([{ laneNumber: 1, seededPercent: 60, remainingPercent: 40 }, { laneNumber: 2 }]);
    expect(defaultSeedingPercents([1, 2], remaining)).toEqual({ 1: "40", 2: "100" });
  });
  it("refuses a percent above what is left, naming the lane", () => {
    const remaining = { 1: 40, 2: 100 };
    expect(overRemainingPercentProblem([1, 2], { 1: "45", 2: "100" }, remaining)).toBe("Làn 1 chỉ còn 40% có thể thả.");
    expect(overRemainingPercentProblem([1, 2], { 1: "40", 2: "99,5" }, remaining)).toBeUndefined();
    expect(overRemainingPercentProblem([3], { 3: "100" }, remaining)).toBeUndefined();
  });
});
