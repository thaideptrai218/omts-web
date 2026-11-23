// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
const mocks = vi.hoisted(() => ({ zones: vi.fn(), people: vi.fn(), day: vi.fn(), subjectType: "Staff", grants: [] as FunctionPermission[] }));
vi.mock("./schedule-service", () => ({ scheduleService: mocks }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType }, permissions: { functionPermissions: mocks.grants } }) }));
import { WorkScheduleScreen } from "./work-schedule-screen";
import { businessToday } from "@/features/operations/ui";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { shiftDay, weekDays, weekStart } from "./schedule-model";
import { testAssignment, testIds as ids } from "./__tests__/schedule-fixtures";

beforeEach(() => {
  vi.resetAllMocks(); mocks.subjectType = "Staff";
  mocks.grants = ["WORK_ASSIGNMENTS", "LABOR_WORKERS"].map((functionCode) => ({ functionCode, action: "View", scope: { kind: "zones", zoneIds: [ids.zone] }, dataScope: "AssignedZone" }));
  mocks.zones.mockResolvedValue({ status: "success", data: [{ id: ids.zone, name: "Vùng Đông" }, { id: ids.otherZone, name: "Vùng Tây" }] });
  mocks.people.mockResolvedValue({ status: "success", data: [{ id: ids.person, name: "Nguyễn An", code: "NV01", eligible: true }] });
  mocks.day.mockResolvedValue({ status: "success", data: [] });
});
afterEach(cleanup);

describe("weekly screen", () => {
  it("denies access without WORK_ASSIGNMENTS View and makes no data calls", () => {
    mocks.grants = mocks.grants.filter((grant) => grant.functionCode !== "WORK_ASSIGNMENTS");
    render(<WorkScheduleScreen />);
    expect(screen.getByRole("alert").textContent).toContain("chưa được cấp quyền");
    expect(mocks.zones).not.toHaveBeenCalled(); expect(mocks.day).not.toHaveBeenCalled();
  });
  it("limits zone choices to grants and starts all seven day reads in parallel", async () => {
    mocks.day.mockImplementation(() => new Promise(() => undefined));
    render(<WorkScheduleScreen />);
    await waitFor(() => expect(mocks.day).toHaveBeenCalledTimes(7));
    expect(mocks.day.mock.calls.map((call) => call[0])).toEqual(weekDays(weekStart(businessToday())));
    const zone = screen.getByRole("combobox", { name: "Vùng làm việc" });
    expect(within(zone).getByRole("option", { name: "Vùng Đông" })).toBeTruthy();
    expect(within(zone).queryByRole("option", { name: "Vùng Tây" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Chép từ tuần trước" })).toBeNull();
    expect(screen.getAllByRole("status").length).toBeGreaterThan(0);
  });
  it("keeps successful days visible and retries only a failed day", async () => {
    const days = weekDays(weekStart(businessToday())); let fail = true;
    mocks.day.mockImplementation(async (day: string) => day === days[1] && fail ? { status: "error", httpStatus: 503, uncertain: false }
      : { status: "success", data: day === days[0] ? [testAssignment({ date: day })] : [] });
    render(<WorkScheduleScreen />);
    expect(await screen.findByText("BE01 · Vệ sinh")).toBeTruthy();
    const retry = await screen.findByRole("button", { name: `Thử lại ngày ${formatVietnameseDate(days[1])}` });
    fail = false; fireEvent.click(retry);
    await waitFor(() => expect(mocks.day).toHaveBeenCalledTimes(8));
    expect(mocks.day.mock.lastCall?.[0]).toBe(days[1]);
    expect(screen.getByText("BE01 · Vệ sinh")).toBeTruthy();
  });
  it("navigates weeks and aborts requests from the old grid", async () => {
    render(<WorkScheduleScreen />);
    await waitFor(() => expect(mocks.day).toHaveBeenCalledTimes(7));
    const oldSignal = mocks.day.mock.calls[0][1] as AbortSignal;
    fireEvent.click(screen.getByRole("button", { name: "Tuần sau" }));
    await waitFor(() => expect(mocks.day).toHaveBeenCalledTimes(14));
    expect(mocks.day.mock.calls[7][0]).toBe(shiftDay(weekStart(businessToday()), 7));
    expect(oldSignal.aborted).toBe(true);
  });
  it("exposes roster errors and allows retry without rereading the week", async () => {
    mocks.people.mockResolvedValueOnce({ status: "error", httpStatus: 403, uncertain: false }).mockResolvedValue({ status: "success", data: [] });
    render(<WorkScheduleScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Thử lại danh sách nhân viên" }));
    await waitFor(() => expect(mocks.people).toHaveBeenCalledTimes(2));
    expect(mocks.day).toHaveBeenCalledTimes(7);
  });
});
