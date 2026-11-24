// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
const mocks = vi.hoisted(() => ({ read: vi.fn(), record: vi.fn(), crew: vi.fn(), zones: vi.fn(), permissions: [] as FunctionPermission[] }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "Staff" }, permissions: { functionPermissions: mocks.permissions } }) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: (...args: unknown[]) => mocks.zones(...args) }));
vi.mock("./attendance-today-service", () => ({ readAttendanceToday: (...args: unknown[]) => mocks.read(...args), recordAttendance: (...args: unknown[]) => mocks.record(...args), startCrew: (...args: unknown[]) => mocks.crew(...args) }));
import { businessToday } from "@/features/operations/ui";
import { AttendanceTodayScreen } from "./attendance-today-screen";
import { assignment, ids, snapshot, staff } from "./attendance-today.fixtures";

const day = businessToday();
const grant = (action: FunctionPermission["action"]): FunctionPermission => ({ functionCode: "ATTENDANCE", action, dataScope: "AssignedZone", scope: { kind: "zones", zoneIds: [ids.zone] } });
const mount = () => render(<ToastProvider><AttendanceTodayScreen /></ToastProvider>);
const success = (data: unknown) => ({ status: "success", data });
const yesterday = () => { const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10); };

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  vi.resetAllMocks(); window.localStorage.clear();
  mocks.permissions = [grant("View"), grant("Create")];
  mocks.read.mockResolvedValue(success(snapshot(day)));
  mocks.record.mockResolvedValue(success({}));
  mocks.crew.mockResolvedValue(success([assignment(day)]));
  mocks.zones.mockResolvedValue(success([{ id: ids.zone, name: "Vùng Đông" }, { id: ids.other, name: "Vùng Tây" }]));
});
afterEach(cleanup);

describe("office attendance today", () => {
  it("denies without loading data when no function grants exist", () => {
    mocks.permissions = []; mount();
    expect(screen.getByRole("alert").textContent).toContain("không có quyền");
    expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.zones).not.toHaveBeenCalled();
  });

  it("shows first-load skeleton then raft and internal groups with one granted zone auto-selected", async () => {
    mount();
    expect(screen.getByRole("status", { name: "Đang tải dữ liệu" })).toBeTruthy();
    await screen.findByText("Nguyễn An");
    expect(screen.getByRole("region", { name: "Bè B01 · Vùng Đông" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Nhân viên nội bộ" })).toBeTruthy();
    expect((screen.getByRole("combobox", { name: "Vùng làm việc" }) as HTMLSelectElement).value).toBe(ids.zone);
    expect(screen.queryByRole("option", { name: "Vùng Tây" })).toBeNull();
    expect(screen.queryByText(/đơn giá|tiền lương|bảng lương/i)).toBeNull();
  });

  it("records one person immediately using the existing assignment endpoint contract", async () => {
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Vào làm cho Nguyễn An" }));
    await waitFor(() => expect(mocks.record).toHaveBeenCalledOnce());
    expect(mocks.record).toHaveBeenCalledWith("assignment", ids.assignment, "check-in", ids.zone);
    await screen.findByText("Đã ghi vào làm cho Nguyễn An.");
  });

  it("keeps rows visible but disables stale actions until the post-write refresh finishes", async () => {
    let finish!: (value: ReturnType<typeof success>) => void;
    mocks.read.mockResolvedValueOnce(success(snapshot(day))).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Vào làm cho Nguyễn An" }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Nguyễn An")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Vào làm cho Nguyễn An" }) as HTMLButtonElement).disabled).toBe(true);
    finish(success(snapshot(day, { assignments: [assignment(day, { checkedInAt: `${day}T07:00:00+07:00` })] })));
    await screen.findByRole("button", { name: "Ra về cho Nguyễn An" });
    expect(screen.queryByRole("button", { name: "Vào làm cho Nguyễn An" })).toBeNull();
  });

  it("uses per-person endpoints for crew checkout and has no additional reason rule", async () => {
    mocks.read.mockResolvedValue(success(snapshot(day, { assignments: [assignment(day, { checkedInAt: `${day}T07:00:00+07:00` })] })));
    mount();
    const group = await screen.findByRole("region", { name: "Bè B01 · Vùng Đông" });
    fireEvent.click(within(group).getByRole("button", { name: "Ra về cả tổ (1)" }));
    const dialog = screen.getByRole("dialog", { name: "Ra về cả tổ" });
    expect(within(dialog).queryByRole("textbox")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận ra về" }));
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith("assignment", ids.assignment, "check-out", ids.zone));
  });

  it("requires the existing reason only for assignment crew start and includes help", async () => {
    mount();
    const group = await screen.findByRole("region", { name: "Bè B01 · Vùng Đông" });
    fireEvent.click(within(group).getByRole("button", { name: "Vào làm cả tổ (1)" }));
    const dialog = screen.getByRole("dialog", { name: "Vào làm cả tổ" });
    // The help button only exists where a guide link is configured (HelpLink without helpHref renders nothing).
    expect(within(dialog).queryByRole("button", { name: "Hướng dẫn (chưa có)" })).toBeNull();
    fireEvent.submit(within(dialog).getByRole("button", { name: "Xác nhận vào làm" }).closest("form")!);
    expect(mocks.crew).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText("Lý do vào làm cả tổ *"), { target: { value: "Bắt đầu vệ sinh lồng" } });
    fireEvent.submit(within(dialog).getByRole("button", { name: "Xác nhận vào làm" }).closest("form")!);
    await waitFor(() => expect(mocks.crew).toHaveBeenCalledOnce());
    expect(mocks.crew.mock.calls[0]).toEqual([{ raftId: ids.raft, startTime: expect.any(String), reason: "Bắt đầu vệ sinh lồng", employeeIds: [ids.worker] }, ids.zone]);
  });

  it("records the internal group without inventing a reason or assignment", async () => {
    mount();
    const group = await screen.findByRole("region", { name: "Nhân viên nội bộ" });
    fireEvent.click(within(group).getByRole("button", { name: "Vào làm cả tổ (1)" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("textbox")).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận vào làm" }));
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith("staff", ids.staff, "check-in", undefined));
    expect(mocks.crew).not.toHaveBeenCalled();
  });

  it("offers yesterday assignment checkout but never sends an undated staff checkout for yesterday", async () => {
    const previous = yesterday();
    mocks.read.mockResolvedValue(success(snapshot(day, { assignments: [assignment(previous, { checkedInAt: `${previous}T22:00:00+07:00` })],
      staff: [staff(previous, { checkedInAt: `${previous}T22:00:00+07:00` })] })));
    mount();
    const carry = await screen.findByRole("region", { name: "Chưa ra về từ hôm qua" });
    expect(within(carry).queryByRole("button", { name: "Ra về cho Trần Bình" })).toBeNull();
    fireEvent.click(within(carry).getByRole("button", { name: "Ra về cho Nguyễn An" }));
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith("assignment", ids.assignment, "check-out", ids.zone));
  });

  it("retains the date-targeted checkout of an assigned internal employee without duplicating them", async () => {
    const previous = yesterday(), checkedInAt = `${previous}T22:00:00+07:00`;
    mocks.read.mockResolvedValue(success(snapshot(day, { assignments: [assignment(previous, { employeeId: ids.staff, checkedInAt })],
      staff: [staff(previous, { checkedInAt })] })));
    mount();
    const carry = await screen.findByRole("region", { name: "Chưa ra về từ hôm qua" });
    expect(within(carry).getAllByText("Trần Bình")).toHaveLength(1);
    fireEvent.click(within(carry).getByRole("button", { name: "Ra về cho Trần Bình" }));
    await waitFor(() => expect(mocks.record).toHaveBeenCalledWith("assignment", ids.assignment, "check-out", ids.zone));
  });

  it("keeps an ambiguous mutation blocked until the user reconciles, with no automatic replay", async () => {
    mocks.record.mockResolvedValue({ status: "error", httpStatus: 0, uncertain: true });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Vào làm cho Nguyễn An" }));
    const reviewed = await screen.findByRole("button", { name: "Đã đối chiếu kết quả" });
    await waitFor(() => expect((reviewed as HTMLButtonElement).disabled).toBe(false));
    expect((screen.getByRole("button", { name: "Vào làm cho Nguyễn An" }) as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.record).toHaveBeenCalledOnce();
    fireEvent.click(reviewed);
    expect((screen.getByRole("button", { name: "Vào làm cho Nguyễn An" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("closes a partial batch, reports each result and names the actual successful person", async () => {
    const second = "88888888-8888-4888-8888-888888888888";
    mocks.read.mockResolvedValue(success(snapshot(day, { staff: [staff(day), staff(day, { employeeId: second, employeeName: "Lê Cường" })],
      scope: [{ id: ids.staff, zoneIds: [ids.zone] }, { id: second, zoneIds: [ids.zone] }] })));
    mocks.record.mockResolvedValueOnce({ status: "error", httpStatus: 400, uncertain: false }).mockResolvedValueOnce(success({}));
    mount();
    const group = await screen.findByRole("region", { name: "Nhân viên nội bộ" });
    fireEvent.click(within(group).getByRole("button", { name: "Vào làm cả tổ (2)" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận vào làm" }));
    await screen.findByText("Đã ghi vào làm cho Lê Cường.");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.record).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status", { name: "Kết quả chấm công" }).textContent).toContain("Trần Bình:");
  });

  it("keeps retry and read-only feedback visible", async () => {
    mocks.permissions = [grant("View")];
    // A 403 is final (the list offers "Về tổng quan"); a temporary failure keeps the retry button.
    mocks.read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }).mockResolvedValue(success(snapshot(day)));
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại chấm công" }));
    await screen.findByText("Nguyễn An");
    expect(screen.queryByRole("button", { name: "Vào làm cho Nguyễn An" })).toBeNull();
    expect(screen.getByText(/chỉ có quyền xem chấm công/)).toBeTruthy();
  });
});
