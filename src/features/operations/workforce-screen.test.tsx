// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), options: vi.fn(), subjectType: "CooperativeOwner" }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read, write: mocks.write }) }));
vi.mock("./lookups", () => ({ loadOptions: (...args: unknown[]) => mocks.options(...args) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType }, permissions: { functionPermissions: [] } }) }));
import { MyWorkScreen } from "./my-work-screen";
import { ids } from "./__tests__/fixtures";
import { businessToday } from "./ui";
import { WorkforceScreen } from "./workforce-screen";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { vi.resetAllMocks(); window.localStorage.clear(); mocks.subjectType = "CooperativeOwner"; mocks.options.mockResolvedValue({ status: "success", data: [{ id: ids.zone, name: "Vùng Đông" }] }); });
afterEach(cleanup);

const row = (id: string, name: string, patch: Record<string, unknown> = {}) => ({ id, employeeId: ids.item, employeeName: name, zoneId: ids.zone, raftId: ids.water, raftCode: "BE01", jobTypeId: ids.line, job: "Thu hoạch", date: businessToday(), checkedInAt: null, checkedOutAt: null, ...patch });
const shiftDay = (offset: number) => { const date = new Date(`${businessToday()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); };
const footerButtons = ["Ghi vào làm", "Ghi ra về", "Gỡ phân công"];

describe("workforce day board in the management design", () => {
  it("keeps closed rows free of actions and opens one row at a time", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An"), row("b", "Nhân viên Bình")] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    const closed = screen.getByText("Nhân viên An").closest("tr")!;
    expect(within(closed).getAllByRole("button")).toHaveLength(1);
    for (const name of footerButtons) expect(screen.queryByRole("button", { name })).toBeNull();
    fireEvent.click(screen.getByText("Nhân viên An"));
    expect(screen.getByRole("region", { name: "Chi tiết phân công Nhân viên An" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên Bình" }));
    expect(screen.queryByRole("region", { name: "Chi tiết phân công Nhân viên An" })).toBeNull();
    expect(screen.getByRole("region", { name: "Chi tiết phân công Nhân viên Bình" })).toBeTruthy();
  });

  it("offers the footer actions only where the date and check rules allow them", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An"), row("b", "Nhân viên Bình", { date: shiftDay(-1) }), row("c", "Nhân viên Cường", { checkedInAt: "2026-11-11T08:00:00+07:00" })] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên An" }));
    for (const name of footerButtons) expect(screen.getByRole("button", { name })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên Bình" }));
    for (const name of footerButtons) expect(screen.queryByRole("button", { name })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên Cường" }));
    expect(screen.getByRole("button", { name: "Ghi ra về" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Ghi vào làm" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gỡ phân công" })).toBeNull();
  });

  it("hides every footer action from a Staff account without grants", async () => {
    mocks.subjectType = "Staff";
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An")] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên An" }));
    for (const name of footerButtons) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.queryByRole("button", { name: "Tạo phân công" })).toBeNull();
  });

  it("confirms and sends a check-in from the opened row", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An")] });
    mocks.write.mockResolvedValue({ status: "success", data: row("a", "Nhân viên An") });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByRole("button", { name: "Mở phân công Nhân viên An" }));
    fireEvent.click(screen.getByRole("button", { name: "Ghi vào làm" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    expect(mocks.write.mock.calls[0][0]).toBe("check-in");
    expect(mocks.write.mock.calls[0][3]).toBe("a");
  });

  it("queries the stepped day and the owner-only actions stay in the more menu", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [] });
    render(<WorkforceScreen />);
    await screen.findByText("Chưa có phân công cho ngày này.");
    expect(mocks.read.mock.calls.at(-1)?.[1]).toEqual({ day: businessToday() });
    fireEvent.click(screen.getByRole("button", { name: "Ngày trước" }));
    await waitFor(() => expect(mocks.read.mock.calls.at(-1)?.[1]).toEqual({ day: shiftDay(-1) }));
    fireEvent.click(screen.getByRole("button", { name: "Hôm nay" }));
    await waitFor(() => expect(mocks.read.mock.calls.at(-1)?.[1]).toEqual({ day: businessToday() }));
    fireEvent.click(screen.getByRole("button", { name: "Thao tác khác" }));
    for (const name of ["Đổi việc trong ngày", "Thiết lập chấm công", "Duyệt nghỉ phép"]) expect(screen.getByRole("button", { name })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Loại công việc/ })).toBeTruthy();
  });

  it("narrows the table by the attendance status pills without a new request", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An"), row("b", "Nhân viên Bình", { checkedInAt: "2026-11-11T08:00:00+07:00" })] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên An");
    fireEvent.click(screen.getByLabelText("Đang làm", { selector: "input" }));
    expect(screen.queryByText("Nhân viên An")).toBeNull();
    expect(screen.getByText("Nhân viên Bình")).toBeTruthy();
    expect(mocks.read).toHaveBeenCalledTimes(1);
  });

  it("keeps the error state with a retry when the list API fails", async () => {
    mocks.read.mockResolvedValueOnce({ status: "error", httpStatus: 404, uncertain: false }).mockResolvedValue({ status: "success", data: [row("a", "Nhân viên An")] });
    render(<WorkforceScreen />);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Tải lại phân công" }));
    await screen.findByText("Nhân viên An");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("my work in the management design", () => {
  const leave = (id: string, patch: Record<string, unknown> = {}) => ({ id, employeeName: "Nhân viên An", from: "2026-11-20", to: "2026-11-21", reason: "Việc gia đình", approved: null, response: null, rowVersion: "AAAA", cancelledAt: null, ...patch });
  const data = { employeeId: ids.item, name: "Nhân viên An", assignments: [row("a", "Nhân viên An")], attendance: [], requests: [leave(ids.receipt), leave(ids.line, { approved: true, response: "Đồng ý" })] };

  it("switches between assignments, worked days and leave requests", async () => {
    mocks.subjectType = "Staff";
    mocks.read.mockResolvedValue({ status: "success", data });
    render(<MyWorkScreen />);
    await screen.findByText("Thu hoạch");
    fireEvent.click(screen.getByRole("tab", { name: "Ngày công" }));
    await screen.findByText("Không có dữ liệu trong khoảng thời gian đã chọn.");
    fireEvent.click(screen.getByRole("tab", { name: "Yêu cầu nghỉ phép" }));
    expect(screen.getAllByText("Việc gia đình")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Xin nghỉ phép" })).toBeTruthy();
  });

  it("cancels a pending leave only from the opened row after confirming", async () => {
    mocks.subjectType = "Staff";
    mocks.read.mockResolvedValue({ status: "success", data });
    mocks.write.mockResolvedValue({ status: "success", data: leave(ids.receipt, { cancelledAt: "2026-11-11T08:00:00+07:00" }) });
    render(<MyWorkScreen />);
    await screen.findByText("Thu hoạch");
    fireEvent.click(screen.getByRole("tab", { name: "Yêu cầu nghỉ phép" }));
    expect(screen.queryByRole("button", { name: "Hủy nghỉ phép" })).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /^Mở yêu cầu nghỉ/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Hủy nghỉ phép" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    expect(mocks.write.mock.calls[0][0]).toBe("cancel-leave");
    expect(mocks.write.mock.calls[0][3]).toBe(ids.receipt);
  });

  it("opens the leave pop-up from the toolbar", async () => {
    mocks.subjectType = "Staff";
    mocks.read.mockResolvedValue({ status: "success", data });
    render(<MyWorkScreen />);
    await screen.findByText("Thu hoạch");
    fireEvent.click(screen.getByRole("button", { name: "Xin nghỉ phép" }));
    expect(await screen.findByLabelText("Lý do nghỉ *")).toBeTruthy();
  });
});
