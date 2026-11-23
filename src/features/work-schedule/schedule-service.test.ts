import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ employees: vi.fn(), read: vi.fn(), write: vi.fn(), options: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: (area: string) => ({ read: area === "employees" ? mocks.employees : mocks.read, write: mocks.write }) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: (...args: unknown[]) => mocks.options(...args) }));
import { scheduleService } from "./schedule-service";
import { testIds as ids } from "./__tests__/schedule-fixtures";
beforeEach(() => vi.resetAllMocks());

describe("existing repository adapters", () => {
  const draft = { employeeId: ids.person, zoneId: ids.zone, raftId: "", jobTypeId: ids.job, day: "2026-11-23" };
  it("maps zone-level create, future move, today's crew change and removal to existing actions", () => {
    scheduleService.create(draft);
    expect(mocks.write.mock.lastCall).toMatchObject({ 0: "assign", 1: { zoneId: ids.zone, jobTypeId: ids.job, date: draft.day, employeeIds: [ids.person], moveExisting: false }, 4: ids.zone });
    scheduleService.create({ ...draft, raftId: ids.raft }, true);
    expect(mocks.write.mock.lastCall?.[1]).toEqual({ raftId: ids.raft, jobTypeId: ids.job, date: draft.day, employeeIds: [ids.person], moveExisting: true });
    scheduleService.changeToday(draft);
    expect(mocks.write.mock.lastCall?.slice(0, 2)).toEqual(["crew", { zoneId: ids.zone, jobTypeId: ids.job, employeeIds: [ids.person] }]);
    scheduleService.remove("row", ids.zone);
    expect(mocks.write.mock.lastCall).toMatchObject({ 0: "remove", 1: {}, 3: "row", 4: ids.zone });
  });
  it("scopes paginated active employee reads and projects only roster data", async () => {
    const employee = { id: ids.person, fullName: "An", code: "NV01", status: "Employed", workingZones: [{ id: ids.zone }], outstandingWage: 123 };
    mocks.employees.mockResolvedValueOnce({ status: "success", data: { items: [employee, { ...employee, id: "outside", workingZones: [{ id: ids.otherZone }] }], total: 101 } })
      .mockResolvedValueOnce({ status: "success", data: { items: [{ ...employee, id: ids.secondPerson }], total: 101 } });
    const result = await scheduleService.people(ids.zone, new AbortController().signal);
    expect(mocks.employees).toHaveBeenCalledTimes(2);
    expect(mocks.employees.mock.calls.map((call) => call[1])).toEqual([1, 2].map((page) => ({ zoneId: ids.zone, statusId: "401", page: String(page), pageSize: "100" })));
    expect(result).toEqual({ status: "success", data: [{ id: ids.person, name: "An", code: "NV01", eligible: true }, { id: ids.secondPerson, name: "An", code: "NV01", eligible: true }] });
  });
  it("does not hide a roster failure or start a read after abort", async () => {
    mocks.employees.mockResolvedValue({ status: "error", httpStatus: 403, uncertain: false });
    expect(await scheduleService.people(ids.zone, new AbortController().signal)).toMatchObject({ status: "error", httpStatus: 403 });
    const abort = new AbortController(); abort.abort(); mocks.employees.mockClear();
    expect(await scheduleService.people(ids.zone, abort.signal)).toMatchObject({ status: "error" });
    expect(mocks.employees).not.toHaveBeenCalled();
  });
});
