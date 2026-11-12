import { describe, expect, it } from "vitest";
import { eligibleRafts, planList, planView } from "./contracts";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const zone = { id: id(1), code: "Z1", name: "Vùng 1" };
const raft = { raftId: id(2), raftCode: "B1", zone, product: { id: id(3), code: "SP1", name: "Hàu sữa" }, lanes: [{ laneId: id(4), laneNumber: 1, state: "InAnotherPlan", planCode: "KHT000002" }, { laneId: id(5), laneNumber: 2, state: "Free", planCode: null }] };
const plan = {
  id: id(6), code: "KHT000001", statusId: 4202, status: "Assigned", zones: [zone], plannedAt: "2026-11-14T06:00:00+07:00", orders: [], allowedActions: ["Harvest"], createdAt: "2026-11-12T08:00:00+07:00", rowVersion: "v",
  progress: { lines: 1, linesDone: 0, lanes: 1, lanesHarvested: 0, lanesSkipped: 0 },
  lines: [{ id: id(7), lineNumber: 1, raftId: id(2), raftCode: "B1", zone, expectedProduct: null, state: "Open", canHarvest: true, locked: false, lanes: [{ laneId: id(4), laneNumber: 1, state: "Planned" }] }],
};

describe("harvest plan contracts", () => {
  it("reads the eligible rafts as the API sends them and as the BFF hands them on", () => {
    const fromApi = eligibleRafts.parse({ rafts: [raft] });
    expect(fromApi).toMatchObject([{ raftCode: "B1", zone: { code: "Z1" }, product: { name: "Hàu sữa" }, lanes: [{ state: "InAnotherPlan", planCode: "KHT000002" }, { state: "Free" }] }]);
    expect(eligibleRafts.parse(fromApi)).toEqual(fromApi);
    expect(eligibleRafts.parse({ rafts: [{ ...raft, product: null }] })[0].product).toBeNull();
    expect(eligibleRafts.safeParse({ rafts: [{ ...raft, lanes: [{ ...raft.lanes[0], state: "Busy" }] }] }).success).toBe(false);
  });

  it("reads the plans given out as the API sends them and as the BFF hands them on", () => {
    const fromApi = planList.parse({ plans: [plan] });
    expect(fromApi).toMatchObject([{ code: "KHT000001", zones: [{ code: "Z1" }], lines: [{ zone: { code: "Z1" } }] }]);
    expect(planList.parse(fromApi)).toEqual(fromApi);
  });

  it("has the zones of the plan and the zone of each line, and no zone of its own", () => {
    const view = planView.parse(plan);
    expect(view.zones.map((row) => row.code)).toEqual(["Z1"]);
    expect(view).not.toHaveProperty("zone");
    expect(planView.safeParse({ ...plan, lines: [{ ...plan.lines[0], zone: undefined }] }).success).toBe(false);
  });
});
