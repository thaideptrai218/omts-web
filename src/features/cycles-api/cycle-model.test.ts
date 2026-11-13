import { describe, expect, it } from "vitest";
import { canStartCycle, cycleStateOf, filterCycleRows, isNurseryBatchLocked, planBody, sortCycleRows, validatePlan, type CycleRow } from "./cycle-model";

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
  const draft = { startDate: "2026-09-01", targetYieldKg: "", note: "", nurseryBatchId: "", productId: "" };
  const cycle = { rowVersion: "v3", nurseryBatchId: "n-1", productId: "p-1" };
  it("needs a start date that is not in the future and a positive yield (required once the cycle has a nursery batch)", () => {
    expect(validatePlan(draft, "2026-11-11")).toEqual({});
    expect(validatePlan({ ...draft, startDate: "" }, "2026-11-11").startDate).toBeTruthy();
    expect(validatePlan({ ...draft, startDate: "2026-12-01" }, "2026-11-11").startDate).toBeTruthy();
    expect(validatePlan({ ...draft, targetYieldKg: "0" }, "2026-11-11").targetYieldKg).toBeTruthy();
    expect(validatePlan({ ...draft, nurseryBatchId: "n-1" }, "2026-11-11").targetYieldKg).toBeTruthy();
    expect(validatePlan({ ...draft, nurseryBatchId: "n-1", targetYieldKg: "2000,5" }, "2026-11-11")).toEqual({});
  });
  it("sends the yield, the note ('' clears it) and the row version; a blank yield is null (kept by the backend)", () => {
    expect(planBody(draft, cycle, false)).toEqual({ startDate: "2026-09-01", targetYieldKg: null, note: "", rowVersion: "v3" });
    expect(planBody({ ...draft, targetYieldKg: "2000,5", note: " Đổi kế hoạch ", nurseryBatchId: "n-1" }, cycle, false)).toEqual({ startDate: "2026-09-01", targetYieldKg: 2000.5, note: "Đổi kế hoạch", rowVersion: "v3" });
  });
  it("sends the nursed batch only when it changed and the cycle is not locked by a seeding", () => {
    expect(planBody({ ...draft, nurseryBatchId: "n-2" }, cycle, false)).toMatchObject({ nurseryBatchId: "n-2" });
    expect(planBody({ ...draft, nurseryBatchId: "n-2" }, cycle, true)).not.toHaveProperty("nurseryBatchId");
    expect(planBody({ ...draft, nurseryBatchId: "" }, cycle, false)).not.toHaveProperty("nurseryBatchId");
  });
  it("sends the farmed product only when it changed and the cycle is not locked by a seeding", () => {
    expect(planBody({ ...draft, productId: "p-2" }, cycle, false)).toMatchObject({ productId: "p-2" });
    expect(planBody({ ...draft, productId: "p-2" }, cycle, true)).not.toHaveProperty("productId");
    expect(planBody({ ...draft, productId: "p-1" }, cycle, false)).not.toHaveProperty("productId");
  });
});

describe("nursed batch lock", () => {
  const free = { nurserySeeded: 0, seedingCompletedOn: null, canChangeNursery: undefined };
  it("is open while nothing was seeded", () => {
    expect(isNurseryBatchLocked(free)).toBe(false);
    expect(isNurseryBatchLocked({ ...free, nurserySeeded: null }, [{ state: "NotSeeded" }, { state: "NotSeeded" }])).toBe(false);
    expect(isNurseryBatchLocked({ ...free, canChangeNursery: true })).toBe(false);
  });
  it("locks as soon as the cycle took seed, finished seeding or a lane left NotSeeded", () => {
    expect(isNurseryBatchLocked({ ...free, nurserySeeded: 3000 })).toBe(true);
    expect(isNurseryBatchLocked({ ...free, seedingCompletedOn: "2026-11-13" })).toBe(true);
    expect(isNurseryBatchLocked(free, [{ state: "NotSeeded" }, { state: "Seeded" }])).toBe(true);
    expect(isNurseryBatchLocked({ ...free, canChangeNursery: false })).toBe(true);
  });
  it("ignores a removed lane (status 2002)", () => expect(isNurseryBatchLocked(free, [{ state: "Harvested", statusId: 2002 }])).toBe(false));
});

describe("starting a cycle by hand", () => {
  const raft = (patch: Partial<CycleRow>): CycleRow => ({ ...row("B1", null), canStart: true, ...patch });
  it("is offered for a raft in use without an open cycle only", () => {
    expect(canStartCycle(raft({}))).toBe(true);
    expect(canStartCycle(raft({ cycle: { ...open, closeDate: "2026-10-30" } }))).toBe(true);
    expect(canStartCycle(raft({ cycle: open }))).toBe(false);
    expect(canStartCycle(raft({ raftStatusId: 102 }))).toBe(false);
    expect(canStartCycle(raft({ canStart: false }))).toBe(false);
  });
});
