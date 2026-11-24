import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn(), employees: vi.fn(), write: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: mocks.employees }) }));
vi.mock("@/features/operations/workforce-shared", () => ({ workforceRepository: { read: mocks.read, write: mocks.write } }));
import { previousDay, readAttendanceToday, recordAttendance, startCrew } from "./attendance-today-service";
import { assignment, ids, staff } from "./attendance-today.fixtures";
const day = "2026-11-20";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.read.mockImplementation(async (action: string, query: { day: string }) => ({ status: "success", data: action === "list" ? [assignment(query.day)] : [staff(query.day)] }));
  mocks.employees.mockResolvedValue({ status: "success", data: { items: [{ id: ids.staff, workingZones: [{ id: ids.zone }] }], total: 1 } });
});

describe("attendance today service on existing repositories", () => {
  it("reads both dates and paginates the scoped Staff roster", async () => {
    mocks.employees.mockResolvedValueOnce({ status: "success", data: { items: [{ id: ids.staff, workingZones: [{ id: ids.zone }] }], total: 101 } })
      .mockResolvedValueOnce({ status: "success", data: { items: [{ id: "second", workingZones: [{ id: ids.other }] }], total: 101 } });
    const result = await readAttendanceToday(day, new AbortController().signal);
    expect(mocks.read.mock.calls.map(call => [call[0], call[1]])).toEqual([["list", { day }], ["list", { day: "2026-11-19" }], ["staff", { day }], ["staff", { day: "2026-11-19" }]]);
    expect(mocks.employees.mock.calls[1][1]).toEqual({ employeeType: "Staff", page: "2", pageSize: "100" });
    expect(result.status === "success" && result.data.scope).toEqual([{ id: ids.staff, zoneIds: [ids.zone] }, { id: "second", zoneIds: [ids.other] }]);
  });

  it("never returns a misleading complete snapshot when any source fails", async () => {
    mocks.read.mockResolvedValueOnce({ status: "error", httpStatus: 403, uncertain: false });
    expect(await readAttendanceToday(day, new AbortController().signal)).toEqual({ status: "error", httpStatus: 403, uncertain: false });
  });

  it("targets assignment checkout by id+zone and internal checkout by employee id without inventing fields", async () => {
    await recordAttendance("assignment", ids.assignment, "check-out", ids.zone);
    expect(mocks.write.mock.calls[0]).toEqual(["check-out", { qrCode: null }, expect.anything(), ids.assignment, ids.zone]);
    await recordAttendance("staff", ids.staff, "check-in");
    expect(mocks.write.mock.calls[1]).toEqual(["staff-check-in", { qrCode: null }, expect.anything(), ids.staff]);
  });

  it("keeps the existing crew reason mandatory and sends the same crew-start payload", async () => {
    const payload = { raftId: ids.raft, startTime: "07:00", reason: "Bắt đầu công việc", employeeIds: [ids.worker] };
    await startCrew(payload, ids.zone);
    expect(mocks.write.mock.calls[0]).toEqual(["crew-start", payload, expect.anything(), undefined, ids.zone]);
    expect(() => startCrew({ ...payload, reason: "" }, ids.zone)).toThrow();
    expect(mocks.write).toHaveBeenCalledOnce();
  });

  it("shifts across calendar boundaries in Vietnamese date-only values", () => {
    expect(previousDay("2026-01-01")).toBe("2025-12-31");
  });
});
