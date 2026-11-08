import { expect, it } from "vitest";
import { lanePortions } from "./lane-portions";
import { projectRaftCondition } from "./project-raft-condition";
import { mockRafts } from "../mocks/raft-fixtures";
import type { RaftEvent } from "./raft";

const event = (
  id: string,
  kind: RaftEvent["kind"],
  from: number,
  to: number,
  date = "2026-10-01",
): RaftEvent => ({
  id,
  cycleId: "cycle",
  laneNumber: 1,
  kind,
  from,
  to,
  date,
  recordedBy: "Người ghi",
  confirmedBy: null,
});
it("covers an empty lane without inventing seeding or yield", () => {
  expect(lanePortions(24, [])).toEqual([
    { from: 0, to: 24, state: "unseeded", sources: [] },
  ]);
});
it("splits seeded, harvested and written-off ranges while keeping source events", () => {
  const portions = lanePortions(24, [
    event("seed", "seeded", 0, 20),
    event("harvest", "harvested", 0, 8, "2026-10-20"),
    event("loss", "written-off", 16, 20, "2026-10-26"),
  ]);
  expect(portions.map(({ from, to, state }) => ({ from, to, state }))).toEqual([
    { from: 0, to: 8, state: "harvested" },
    { from: 8, to: 16, state: "growing" },
    { from: 16, to: 20, state: "written-off" },
    { from: 20, to: 24, state: "unseeded" },
  ]);
  expect(portions[0].sources.map((source) => source.id)).toEqual([
    "seed",
    "harvest",
  ]);
  expect(
    portions.reduce((total, portion) => total + portion.to - portion.from, 0),
  ).toBe(24);
});
it("never treats a planned harvest as actual harvest", () => {
  expect(lanePortions(10, [event("plan", "planned", 0, 10)])[0].state).toBe(
    "unseeded",
  );
});
it("clips the drawing to the lane but retains the source's original coordinates", () => {
  const original = event("seed", "seeded", -5, 30);
  const portions = lanePortions(24, [original]);
  expect(portions[0]).toMatchObject({ from: 0, to: 24, sources: [original] });
  expect(original.from).toBe(-5);
});
it("lets the later finished event decide without mutating caller data", () => {
  const events = [
    event("seed", "seeded", 0, 10),
    event("loss", "written-off", 0, 5, "2026-10-20"),
    event("harvest", "harvested", 0, 5, "2026-10-21"),
  ];
  const snapshot = structuredClone(events);
  expect(lanePortions(10, events)[0].state).toBe("harvested");
  expect(events).toEqual(snapshot);
});
it.each([0, -1, NaN, Infinity])(
  "does not draw an invalid length %s",
  (length) => expect(lanePortions(length, [])).toEqual([]),
);
it("ignores out-of-range, empty and non-finite segments", () => {
  const portions = lanePortions(10, [
    event("out", "seeded", 12, 15),
    event("empty", "seeded", 3, 3),
    event("bad", "seeded", NaN, 5),
  ]);
  expect(portions).toEqual([
    { from: 0, to: 10, state: "unseeded", sources: [] },
  ]);
});
it("filters future events and keeps planned overlays separate as of a date", () => {
  const record = mockRafts[0];
  const early = projectRaftCondition(record, {
    raftId: record.profile.id,
    date: "2026-10-02",
    cycleId: null,
  });
  expect(early.lanes[0].portions.map((portion) => portion.state)).toEqual([
    "growing",
  ]);
  expect(early.lanes[1].portions[0].state).toBe("unseeded");
  const current = projectRaftCondition(record, {
    raftId: record.profile.id,
    date: "2026-10-28",
    cycleId: null,
  });
  expect(current.lanes[0].planned).toHaveLength(1);
  expect(current.lanes[0].portions.map((portion) => portion.state)).toEqual([
    "harvested",
    "growing",
    "written-off",
  ]);
});
it("uses historical layout and closed cycle without carrying them into a later fallow date", () => {
  const record = mockRafts[1];
  const old = projectRaftCondition(record, {
    raftId: record.profile.id,
    date: "2026-10-09",
    cycleId: null,
  });
  expect(old.layoutVersion).toBe(1);
  expect(old.lanes[0].length).toBe(24);
  expect(old.lanes[0].portions[0].state).toBe("harvested");
  const current = projectRaftCondition(record, {
    raftId: record.profile.id,
    date: "2026-10-28",
    cycleId: null,
  });
  expect(current.layoutVersion).toBe(2);
  expect(current.cycle).toBeNull();
  expect(current.lanes[0]).toMatchObject({
    length: 26,
    portions: [{ state: "unseeded" }],
  });
});
it("does not pretend a future layout existed before its effective date", () => {
  const record = mockRafts[0];
  const result = projectRaftCondition(record, {
    raftId: record.profile.id,
    date: "2026-08-01",
    cycleId: null,
  });
  expect(result.layoutVersion).toBeNull();
  expect(result.lanes).toEqual([]);
});
