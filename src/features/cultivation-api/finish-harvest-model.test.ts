import { describe, expect, it } from "vitest";
import { toggleLaneSelection } from "@/features/farming-management/lane-selection";
import { finishHarvestResult, finishHarvestValues, matchesFinishedSelection } from "./finish-harvest-contracts";
import { eligibleToFinish } from "./finish-harvest-model";
import { projectFarmingProblem } from "./farming-problem";

describe("bulk finish pure models", () => {
  it("selects and deselects a shift range, excluding blocked and hidden lanes", () => {
    expect(toggleLaneSelection([1], [1, 3, 5, 8], 5, 1, true)).toEqual([1, 3, 5]);
    expect(toggleLaneSelection([1, 3, 5, 8], [1, 3, 5, 8], 1, 5, true)).toEqual([8]);
    expect(toggleLaneSelection([1], [1, 3], 2, 1, true)).toEqual([1]);
    expect(toggleLaneSelection([1], [1, 3], 3, 8, true)).toEqual([1, 3]);
  });
  it("requires distinct physical lanes and a strict bulk body", () => {
    expect(finishHarvestValues.safeParse({ laneNumbers: [1, 200], rowVersion: "AAAA" }).success).toBe(true);
    for (const laneNumbers of [[], [0], [201], [1.5], [1, 1]]) expect(finishHarvestValues.safeParse({ laneNumbers }).success).toBe(false);
    expect(finishHarvestValues.safeParse({ laneNumbers: [1], ignored: true }).success).toBe(false);
  });
  it("rejects overlapping results and requires complete result coverage", () => {
    expect(finishHarvestResult.safeParse({ finished: [1], alreadyFinished: [1] }).success).toBe(false);
    expect(matchesFinishedSelection([1, 2], { finished: [2], alreadyFinished: [1] })).toBe(true);
    expect(matchesFinishedSelection([1, 2], { finished: [1], alreadyFinished: [] })).toBe(false);
    expect(matchesFinishedSelection([1, 2], { finished: [1, 3], alreadyFinished: [] })).toBe(false);
  });
  it("requires harvesting state, explicit eligibility and a healthy active lane", () => {
    const lane = { laneNumber: 1, state: "BeingHarvested", canFinish: true };
    expect(eligibleToFinish(lane)).toBe(true);
    for (const change of [{ state: "Growing" }, { state: "Harvested" }, { canFinish: undefined }, { isDamaged: true }, { isOutOfService: true }, { statusId: 2002 }, { laneNumber: 201 }]) expect(eligibleToFinish({ ...lane, ...change })).toBe(false);
  });
  it("projects the conflict lane list without arbitrary upstream fields", () => {
    const lanes = [{ laneNumber: 3, reasonCode: "LaneDamaged", message: "Làn đang hỏng.", secret: "discard" }];
    const expected = [{ laneNumber: 3, reasonCode: "LaneDamaged", message: "Làn đang hỏng." }];
    expect(projectFarmingProblem(lanes)?.lanes).toEqual(expected);
    expect(projectFarmingProblem({ lanes })?.lanes).toEqual(expected);
    expect(projectFarmingProblem({ lanes: [{ laneNumber: 201, reasonCode: "x", message: "x" }] })).toBeUndefined();
  });
});
