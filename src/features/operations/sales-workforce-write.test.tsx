// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), options: vi.fn(), subjectType: "Trader" }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read, write: mocks.write }) }));
vi.mock("./lookups", () => ({ loadOptions: (...args: unknown[]) => mocks.options(...args) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType }, permissions: { functionPermissions: [] } }) }));
import { LeaveEditor, MyWorkScreen } from "./my-work-screen";
import { AssignmentEditor, WorkforceScreen } from "./workforce-screen";
import { ids } from "./__tests__/fixtures";
import { businessToday } from "./ui";
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { vi.resetAllMocks(); mocks.subjectType = "Trader"; mocks.options.mockResolvedValue({ status: "success", data: [] }); mocks.read.mockResolvedValue({ status: "success", data: [{ id: ids.item, name: "Hàu QA", code: "QA", availableForPurchase: true }] }); });
afterEach(cleanup);
const raftId = crypto.randomUUID();
describe("approved sales/workforce writes and draft safety", () => {
  it("filters assignments by zone and employee without sending a write or losing the working date", async () => {
    mocks.subjectType = "CooperativeOwner";
    mocks.options.mockResolvedValue({ status: "success", data: [{ id: ids.item, name: "Vùng Đông" }, { id: ids.receipt, name: "Vùng Tây" }] });
    mocks.read.mockResolvedValue({ status: "success", data: [
      { id: "a", employeeId: "e1", employeeName: "Nhân viên An", zoneId: ids.item, raftCode: "BE01", job: "Thu hoạch", date: businessToday(), checkedInAt: null, checkedOutAt: null },
      { id: "b", employeeId: "e2", employeeName: "Nhân viên Bình", zoneId: ids.receipt, raftCode: "BE02", job: "Đo nước", date: businessToday(), checkedInAt: null, checkedOutAt: null },
    ] });
    render(<WorkforceScreen />);
    await screen.findByText("Nhân viên Bình");
    fireEvent.change(screen.getByLabelText("Vùng làm việc"), { target: { value: ids.item } });
    expect(screen.queryByText("Nhân viên Bình")).toBeNull();
    fireEvent.change(screen.getByLabelText("Tìm nhân viên, bè hoặc công việc"), { target: { value: "không khớp" } });
    expect(screen.queryByText("Nhân viên An")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    expect(screen.getByText("Nhân viên Bình")).toBeTruthy();
    expect(screen.getByRole("button", { name: `Ngày làm việc: ${businessToday().split("-").reverse().join("/")}` })).toBeTruthy();
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("sends leave only for the current session without client-chosen employee identity", async () => {
    mocks.write.mockResolvedValue({ status: "success", data: { id: ids.receipt } }); const saved = vi.fn(); render(<LeaveEditor onClose={vi.fn()} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText("Lý do nghỉ *"), { target: { value: "QA nghỉ phép" } }); fireEvent.click(screen.getByRole("button", { name: "Gửi nghỉ phép" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce()); expect(mocks.write.mock.calls[0][0]).toBe("leave"); expect(mocks.write.mock.calls[0][1]).not.toHaveProperty("employeeId"); expect(mocks.write.mock.calls[0][1]).not.toHaveProperty("accountId");
  });
  it("does not offer leave creation when the account has no linked employee", async () => {
    mocks.read.mockImplementation(async () => ({ status: "success", data: { employeeId: null, name: null, assignments: [], attendance: [], requests: [] } })); render(<MyWorkScreen />);
    await screen.findByText("Chưa có hồ sơ nhân viên gắn với tài khoản này."); expect(screen.queryByRole("button", { name: "Xin nghỉ phép" })).toBeNull();
    // Develop không có api/me/purchase-shifts: màn không được đọc hay hiển thị lời mời ca.
    expect(mocks.read.mock.calls.every((args) => args[0] === "list")).toBe(true); expect(screen.queryByText("Lời mời ca theo yêu cầu mua")).toBeNull();
  });
  it("keeps assignment input and selected employees when lookup recovery runs", async () => {
    mocks.subjectType = "CooperativeOwner"; mocks.read.mockResolvedValue({ status: "success", data: { jobs: [{ id: ids.item, name: "QA job" }], employees: [{ id: ids.receipt, name: "QA staff", onLeave: true }] } });
    mocks.options.mockImplementation(async (area) => ({ status: "success", data: area === "zones" ? [{ id: ids.zone, name: "Vùng QA", statusId: 101 }] : [{ id: raftId, code: "B-QA" }] }));
    render(<AssignmentEditor mode="assign" initialDay={businessToday()} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText("Vùng phân công *"), { target: { value: ids.zone } }); await screen.findByRole("option", { name: "B-QA" });
    fireEvent.change(screen.getByLabelText("Bè làm việc *"), { target: { value: raftId } }); fireEvent.click(screen.getByLabelText("QA staff · Đã duyệt nghỉ ngày này"));
    fireEvent.click(screen.getByRole("button", { name: "Tải lại danh mục phân công" })); await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    await waitFor(() => expect((screen.getByLabelText("Bè làm việc *") as HTMLSelectElement).value).toBe(raftId)); expect((screen.getByLabelText("QA staff · Đã duyệt nghỉ ngày này") as HTMLInputElement).checked).toBe(true); expect(mocks.write).not.toHaveBeenCalled();
  });
});
