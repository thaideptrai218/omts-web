import { describe, expect, it } from "vitest";
import { cycleStateOf, filterCycleRows, planBody, sortCycleRows, validatePlan, type CycleRow } from "./cycle-model";

const row = (raftCode: string, cycle: CycleRow["cycle"], raftStatusId = 101): CycleRow => ({ raftId: `00000000-0000-4000-8000-${raftCode.replace(/\D/g, "").padStart(12, "0")}`, raftCode, raftStatusId, raftStatus: "In Use", laneCount: 2, cycle,
  lastCloseDate: null, canStart: false, canEdit: false, canCancel: false });
const open = { id: "00000000-0000-4000-8000-0000000000c1", startDate: "2026-09-01", closeDate: null, statusId: 1, status: "Open", rowVersion: "1" };
const rows = [row("B10", { ...open, closeDate: "2026-10-30" }), row("B02", open), row("B01", null, 102)];

describe("cycle rows", () => {
  it("derives the latest cycle state", () => expect(rows.map(cycleStateOf)).toEqual(["closed", "open", "none"]));
  it("filters by state, raft status and raft code", () => {
    expect(filterCycleRows(rows, { search: "", state: "open", raftStatus: "" }).map(item => item.raftCode)).toEqual(["B02"]);
    expect(filterCycleRows(rows, { search: "", state: "", raftStatus: "102" }).map(item => item.raftCode)).toEqual(["B01"]);
    expect(filterCycleRows(rows, { search: "b1", state: "", raftStatus: "" }).map(item => item.raftCode)).toEqual(["B10"]);
  });
  it("sorts naturally by raft code and by start date", () => {
    expect(sortCycleRows(rows, "raft", "asc").map(item => item.raftCode)).toEqual(["B01", "B02", "B10"]);
    expect(sortCycleRows(rows, "start", "desc").map(item => item.raftCode)).toEqual(["B10", "B02", "B01"]);
  });
});

describe("cycle plan draft", () => {
  const draft = { startDate: "2026-09-01", expectedSeedQuantity: "1000,5", targetYieldKg: "" };
  it("needs a start date that is not in the future and positive optional quantities", () => {
    expect(validatePlan(draft, "2026-11-11")).toEqual({});
    expect(validatePlan({ ...draft, startDate: "" }, "2026-11-11").startDate).toBeTruthy();
    expect(validatePlan({ ...draft, startDate: "2026-12-01" }, "2026-11-11").startDate).toBeTruthy();
    expect(validatePlan({ ...draft, targetYieldKg: "0" }, "2026-11-11").targetYieldKg).toBeTruthy();
  });
  it("sends empty optional fields as null together with the row version", () => {
    expect(planBody(draft, "v3")).toEqual({ startDate: "2026-09-01", expectedSeedQuantity: 1000.5, targetYieldKg: null, rowVersion: "v3" });
  });
});
