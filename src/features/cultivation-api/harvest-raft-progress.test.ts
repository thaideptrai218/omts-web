import { expect, it } from "vitest";
import { raftHarvestProgress } from "./harvest-raft-progress";

it("averages the harvested share of the seeded lanes and counts the lanes done", () => {
  const lanes = [{ state: "Harvested" }, { state: "BeingHarvested", harvestedPercent: 50 }, { state: "Growing", harvestedPercent: null }, { state: "NotSeeded" }, { state: "OutOfService" }, { state: "Growing", isDamaged: true }];
  expect(raftHarvestProgress(lanes)).toEqual({ percent: 50, done: 1, total: 3 });
});

it("shows nothing for a raft without a lane to harvest", () => {
  expect(raftHarvestProgress([{ state: "NotSeeded" }])).toBeNull();
  expect(raftHarvestProgress([])).toBeNull();
});
