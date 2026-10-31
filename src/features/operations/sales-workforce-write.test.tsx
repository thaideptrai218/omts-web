// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), options: vi.fn(), subjectType: "Trader" }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read, write: mocks.write }) }));
vi.mock("./lookups", () => ({ loadOptions: (...args: unknown[]) => mocks.options(...args) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType }, permissions: { functionPermissions: [] } }) }));
import { CreatePurchaseRequest, PurchaseRequestDetails } from "./sales-editors";
import { LeaveEditor, MyWorkScreen } from "./my-work-screen";
import { AssignmentEditor } from "./workforce-screen";
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
const record = () => ({ id: ids.receipt, code: "YC-QA", productId: ids.item, productName: "Hàu QA", quantityUnit: "Cage" as const, requestedCages: 5, requestedPickupDate: businessToday(), note: null,
  status: "AWAITING_RESPONSE" as const, acceptedCages: null, acceptedPickupDate: null, allowPayLater: false, responseNote: null, respondedAt: null, cancelledAt: null, cancellationReason: null, createdAt: new Date().toISOString(), customerName: "QA trader", rowVersion: "version-A" });
async function fillRequest() { await screen.findByRole("option", { name: "QA · Hàu QA" }); fireEvent.change(screen.getByLabelText("Sản phẩm *"), { target: { value: ids.item } }); fireEvent.change(screen.getByLabelText("Số lồng yêu cầu *"), { target: { value: "3" } }); }
describe("approved sales/workforce writes and draft safety", () => {
  it("does not send a cage request until confirmation and cancels a late confirmation on unmount", async () => {
    const view = render(<CreatePurchaseRequest onClose={vi.fn()} onSaved={vi.fn()} />); await fillRequest();
    fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" })); await screen.findByRole("button", { name: "Đồng ý" });
    expect(mocks.write).not.toHaveBeenCalled(); view.unmount(); await Promise.resolve(); expect(mocks.write).not.toHaveBeenCalled();
  });
  it("keeps a submitted request blocked after an unknown result and catalogue recovery never replays it", async () => {
    mocks.write.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true }); render(<CreatePurchaseRequest onClose={vi.fn()} onSaved={vi.fn()} />); await fillRequest();
    fireEvent.click(screen.getByRole("button", { name: "Gửi yêu cầu" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await screen.findByText(/Bản nháp đang được giữ/); fireEvent.click(screen.getByRole("button", { name: "Tải lại sản phẩm" }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    expect((screen.getByLabelText("Số lồng yêu cầu *") as HTMLInputElement).value).toBe("3");
    expect((screen.getByLabelText("Số lồng yêu cầu *") as HTMLInputElement).matches(":disabled")).toBe(true);
    expect(mocks.write).toHaveBeenCalledTimes(1); expect(mocks.write.mock.calls[0][1]).toMatchObject({ productId: ids.item, requestedCages: 3 });
    expect(mocks.write.mock.calls[0][1]).not.toHaveProperty("customerId");
  });
  it("adopts a reviewed request version explicitly while retaining the rejection reason", async () => {
    mocks.subjectType = "CooperativeOwner"; mocks.write.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false }).mockResolvedValue({ status: "success", data: record() });
    mocks.read.mockResolvedValue({ status: "success", data: { ...record(), rowVersion: "version-B" } });
    render(<PurchaseRequestDetails record={record()} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Phản hồi *"), { target: { value: "decline" } }); fireEvent.change(screen.getByLabelText("Lý do từ chối *"), { target: { value: "QA giữ lý do" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu phản hồi" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải yêu cầu mới để đối chiếu" }));
    const adopt = await screen.findByRole("button", { name: "Đã đối chiếu, giữ nháp để sửa tiếp" }); expect(mocks.write).toHaveBeenCalledTimes(1);
    expect((screen.getByLabelText("Lý do từ chối *") as HTMLTextAreaElement).value).toBe("QA giữ lý do");
    fireEvent.click(adopt); fireEvent.click(screen.getByRole("button", { name: "Lưu phản hồi" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(2)); expect(mocks.write.mock.calls[1][1]).toMatchObject({ note: "QA giữ lý do", rowVersion: "version-B", accept: false });
  });
  it("shows no Owner response action to a Staff viewer", () => {
    mocks.subjectType = "Staff"; render(<PurchaseRequestDetails record={record()} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Lưu phản hồi" })).toBeNull(); expect(screen.queryByRole("button", { name: "Hủy yêu cầu mua" })).toBeNull();
  });
  it("retains accepted credit terms and response time after a Trader cancellation", () => {
    render(<PurchaseRequestDetails record={{ ...record(), status: "CANCELLED", acceptedCages: 3, acceptedPickupDate: businessToday(), allowPayLater: true, respondedAt: new Date().toISOString(), cancelledAt: new Date().toISOString() }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText("Có")).toBeTruthy(); expect(screen.getByText("Phản hồi lúc")).toBeTruthy(); expect(screen.queryByRole("button", { name: "Hủy yêu cầu mua" })).toBeNull();
  });
  it("sends leave only for the current session without client-chosen employee identity", async () => {
    mocks.write.mockResolvedValue({ status: "success", data: { id: ids.receipt } }); const saved = vi.fn(); render(<LeaveEditor onClose={vi.fn()} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText("Lý do nghỉ *"), { target: { value: "QA nghỉ phép" } }); fireEvent.click(screen.getByRole("button", { name: "Gửi nghỉ phép" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(saved).toHaveBeenCalledOnce()); expect(mocks.write.mock.calls[0][0]).toBe("leave"); expect(mocks.write.mock.calls[0][1]).not.toHaveProperty("employeeId"); expect(mocks.write.mock.calls[0][1]).not.toHaveProperty("accountId");
  });
  it("does not offer leave creation when the account has no linked employee", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: { employeeId: null, name: null, assignments: [], attendance: [], requests: [] } }); render(<MyWorkScreen />);
    await screen.findByText("Chưa có hồ sơ nhân viên gắn với tài khoản này."); expect(screen.queryByRole("button", { name: "Gửi yêu cầu nghỉ phép" })).toBeNull();
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
