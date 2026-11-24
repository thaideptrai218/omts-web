// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ lookups: vi.fn(), rafts: vi.fn(), create: vi.fn(), changeToday: vi.fn(), remove: vi.fn() }));
vi.mock("./schedule-service", () => ({ scheduleService: mocks }));
import { ToastProvider } from "@/components/ui/toast-provider";
import { businessToday } from "@/features/operations/ui";
import { ScheduleCellDialog } from "./schedule-cell-dialog";
import { shiftDay, type ScheduleCell } from "./schedule-model";
import { testAssignment, testIds as ids } from "./__tests__/schedule-fixtures";
import { installDialogPolyfill, removeDialogPolyfill } from "./__tests__/dialog-polyfill";

beforeAll(installDialogPolyfill); afterAll(removeDialogPolyfill); afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.lookups.mockResolvedValue({ status: "success", data: { jobs: [{ id: ids.job, name: "Vệ sinh" }, { id: ids.secondPerson, name: "Thu hoạch" }], employees: [] } });
  // Real BFF raft options intentionally have no zoneId; the request already scoped them.
  mocks.rafts.mockResolvedValue({ status: "success", data: [{ id: ids.raft, code: "BE01", statusId: 101 }] });
  mocks.create.mockResolvedValue({ status: "success", data: [] });
  mocks.changeToday.mockResolvedValue({ status: "success", data: { done: true } });
  mocks.remove.mockResolvedValue({ status: "success", data: { done: true } });
});
function mount(cell: ScheduleCell) {
  const saved = vi.fn();
  render(<ToastProvider><ScheduleCellDialog cell={cell} zoneId={ids.zone} allowed={() => true} onClose={vi.fn()} onSaved={saved} /></ToastProvider>);
  return saved;
}
const person = { id: ids.person, name: "Nguyễn An", eligible: true };

describe("cell editor", () => {
  it("offers scoped rafts without zoneId and creates one person's assignment", async () => {
    const day = shiftDay(businessToday(), 1), saved = mount({ person, day, assignments: [] });
    const job = await screen.findByRole("combobox", { name: "Loại công việc *" });
    fireEvent.change(job, { target: { value: ids.job } });
    const raft = screen.getByRole("combobox", { name: "Bè làm việc" });
    expect(screen.getByRole("option", { name: "BE01" })).toBeTruthy();
    fireEvent.change(raft, { target: { value: ids.raft } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phân công" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(mocks.create).toHaveBeenCalledWith({ employeeId: ids.person, zoneId: ids.zone, day, raftId: ids.raft, jobTypeId: ids.job }, false);
  });
  it("changes today's job through crew rather than create", async () => {
    const day = businessToday(); mount({ person, day, assignments: [testAssignment({ date: day })] });
    fireEvent.change(await screen.findByRole("combobox", { name: "Loại công việc *" }), { target: { value: ids.secondPerson } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phân công" }));
    await waitFor(() => expect(mocks.changeToday).toHaveBeenCalledOnce());
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("replaces a future job through moveExisting", async () => {
    const day = shiftDay(businessToday(), 1); mount({ person, day, assignments: [testAssignment({ date: day })] });
    fireEvent.change(await screen.findByRole("combobox", { name: "Loại công việc *" }), { target: { value: ids.secondPerson } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phân công" }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce());
    expect(mocks.create.mock.lastCall?.[1]).toBe(true);
  });
  it("confirms before removing and shows success", async () => {
    const saved = mount({ person, day: businessToday(), assignments: [testAssignment()] });
    fireEvent.click(screen.getByRole("button", { name: "Gỡ phân công" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận gỡ" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(mocks.remove).toHaveBeenCalledWith(testAssignment().id, ids.zone);
  });
  it("keeps past cells readonly without loading mutation lookups, and includes help", async () => {
    mount({ person, day: shiftDay(businessToday(), -1), assignments: [testAssignment()] });
    expect(screen.getByText(/Ngày đã qua/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Lưu phân công" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gỡ phân công" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Hướng dẫn" }));
    expect(screen.getByRole("button", { name: "Hướng dẫn" }).getAttribute("aria-expanded")).toBe("true");
    await waitFor(() => expect(mocks.lookups).not.toHaveBeenCalled());
  });
  it("says a past empty cell is past, not a missing permission", () => {
    mount({ person, day: shiftDay(businessToday(), -1), assignments: [] });
    expect(screen.getByText("Ngày đã qua, không thể thêm phân công.")).toBeTruthy();
    expect(screen.queryByText(/không có quyền/)).toBeNull();
  });
  it("keeps uncertain failure visible and disables replay", async () => {
    mocks.create.mockResolvedValue({ status: "error", httpStatus: 0, uncertain: true });
    mount({ person, day: businessToday(), assignments: [] });
    fireEvent.change(await screen.findByRole("combobox", { name: "Loại công việc *" }), { target: { value: ids.job } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phân công" }));
    await screen.findByText(/Hãy đóng và tải lại lịch/);
    fireEvent.click(screen.getByRole("button", { name: "Lưu phân công" }));
    expect(mocks.create).toHaveBeenCalledOnce();
  });
});
