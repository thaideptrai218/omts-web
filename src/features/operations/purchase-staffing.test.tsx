// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), subjectType: "CooperativeOwner" }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read, write: mocks.write }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType } }) }));
import { PurchaseRequestDetails } from "./sales-editors";
import { PlanStaffingEditor, ShiftResponseEditor } from "./purchase-staffing";
import { purchaseRequestSchema, type PurchaseRequest } from "./new-module-contracts";
import { businessToday } from "./ui";
import { ids } from "./__tests__/fixtures";
const staffing = () => ({ cages: 5, workDate: businessToday(), pickupDate: businessToday(), cagesPerEmployeePerDay: 2, requiredEmployees: 3, invitedEmployees: 3, approvedEmployees: 2, declinedEmployees: 0, pendingEmployees: 1, hasEnoughStaff: false, note: null });
const request = (): PurchaseRequest => ({ id: ids.receipt, code: "YC-ST", productId: ids.item, productName: "Hàu", quantityUnit: "Cage", requestedCages: 5, requestedPickupDate: businessToday(), note: null, status: "AWAITING_STAFF", acceptedCages: null, acceptedPickupDate: null, allowPayLater: false, responseNote: null, respondedAt: null, cancelledAt: null, cancellationReason: null, createdAt: new Date().toISOString(), customerName: "Thương lái", rowVersion: "request-v1", staffing: staffing() });
const shift = () => ({ id: ids.line, purchaseRequestId: ids.receipt, requestCode: "YC-ST", productName: "Hàu", cages: 5, workDate: businessToday(), pickupDate: businessToday(), requiredEmployees: 3, approvedEmployees: 2, approved: null, reason: null, note: null, requestStatus: "AWAITING_STAFF" as const, canRespond: true, rowVersion: "shift-v1" });
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
});
beforeEach(() => { vi.resetAllMocks(); mocks.subjectType = "CooperativeOwner"; mocks.read.mockResolvedValue({ status: "success", data: [] }); });
afterEach(cleanup);
describe("purchase staffing workflow", () => {
  it("parses the new waiting state but strips employee identities from public summaries", () => {
    const result = purchaseRequestSchema.parse({ ...request(), staffing: { ...staffing(), employeeNames: ["Private"] } });
    expect(result.status).toBe("AWAITING_STAFF");
    expect(JSON.stringify(result)).not.toContain("Private");
  });
  it("blocks acceptance before staffing is sufficient even when the form is forced", async () => {
    render(<PurchaseRequestDetails record={request()} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByRole("option", { name: "Chấp nhận" }) as HTMLOptionElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Phản hồi *"), { target: { value: "accept" } });
    fireEvent.submit(screen.getByRole("button", { name: "Lưu phản hồi" }).closest("form")!);
    await screen.findByText("Cần đủ nhân viên đồng ý kế hoạch trước khi nhận đơn.");
    expect(mocks.write).not.toHaveBeenCalled();
  });
  it("accepts only the frozen plan with its current parent version", async () => {
    mocks.write.mockResolvedValue({ status: "success", data: { ...request(), status: "ACCEPTED" } });
    render(<PurchaseRequestDetails record={{ ...request(), staffing: { ...staffing(), approvedEmployees: 3, hasEnoughStaff: true } }} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText("Số lồng chấp nhận *") as HTMLInputElement).readOnly).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Lưu phản hồi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ acceptedCages: 5, pickupDate: businessToday(), rowVersion: "request-v1" });
  });
  it("never fetches employee invitation names for a Trader", () => {
    mocks.subjectType = "Trader";
    render(<PurchaseRequestDetails record={request()} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Hủy yêu cầu mua" })).toBeTruthy();
    expect(screen.queryByText("Lời mời nhân viên")).toBeNull();
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it("keeps the staffing draft blocked after an unknown write and never replays on read", async () => {
    mocks.read.mockImplementation(async (action) => ({ status: "success", data: action === "staffing-employees" ? [{ id: ids.item, name: "Nhân viên An", available: true, unavailableReason: null }] : request() }));
    mocks.write.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    render(<PlanStaffingEditor record={{ ...request(), status: "AWAITING_RESPONSE", staffing: null }} invitedIds={[]} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Năng suất (lồng/người/ngày) *"), { target: { value: "2" } });
    fireEvent.click(await screen.findByRole("checkbox", { name: /Nhân viên An/ }));
    fireEvent.click(screen.getByRole("button", { name: "Gửi lời mời nhân viên" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải kế hoạch hiện tại" }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledWith("detail", { id: ids.receipt }, expect.anything()));
    expect(mocks.write).toHaveBeenCalledOnce();
    expect((screen.getByLabelText("Năng suất (lồng/người/ngày) *") as HTMLInputElement).value).toBe("2");
    expect((screen.getByRole("button", { name: "Gửi lời mời nhân viên" }) as HTMLButtonElement).matches(":disabled")).toBe(true);
  });
  it("requires a reason when declining and submits no client employee identity", async () => {
    mocks.write.mockResolvedValue({ status: "success", data: { ...shift(), approved: false, canRespond: false } });
    render(<ShiftResponseEditor record={shift()} period={{ from: businessToday(), to: businessToday() }} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Phản hồi ca *"), { target: { value: "decline" } });
    fireEvent.submit(screen.getByRole("button", { name: "Gửi phản hồi ca" }).closest("form")!);
    await screen.findByText("Nhập lý do từ chối, tối đa 500 ký tự."); expect(mocks.write).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Lý do từ chối *"), { target: { value: "Đã có lịch riêng" } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi phản hồi ca" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledOnce());
    expect(mocks.write.mock.calls[0]).toEqual(["respond-shift", { approved: false, reason: "Đã có lịch riêng", rowVersion: "shift-v1" }, expect.anything(), ids.line]);
  });
  it("preserves the frozen empty note when inviting more people and refreshes the parent version", async () => {
    const record = { ...request(), staffing: { ...staffing(), note: "" } };
    const fresh = { ...record, rowVersion: "request-v2" };
    mocks.read.mockImplementation(async (action) => ({ status: "success", data: action === "staffing-employees" ? [{ id: ids.item, name: "Nhân viên An", available: true, unavailableReason: null }] : fresh }));
    mocks.write.mockResolvedValue({ status: "success", data: record.staffing });
    const saved = vi.fn(); render(<PlanStaffingEditor record={record} invitedIds={[]} onClose={vi.fn()} onSaved={saved} />);
    expect((screen.getByLabelText("Ngày làm *") as HTMLInputElement).readOnly).toBe(true);
    fireEvent.click(await screen.findByRole("checkbox", { name: /Nhân viên An/ }));
    fireEvent.click(screen.getByRole("button", { name: "Gửi lời mời nhân viên" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(saved).toHaveBeenCalledWith(fresh));
    expect(mocks.write.mock.calls[0][1]).toMatchObject({ note: "", employeeIds: [ids.item], rowVersion: "request-v1" });
  });
  it("does not unblock an uncertain shift response when refreshing the invitation", async () => {
    mocks.write.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    mocks.read.mockResolvedValue({ status: "success", data: [shift()] });
    render(<ShiftResponseEditor record={shift()} period={{ from: businessToday(), to: businessToday() }} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Gửi phản hồi ca" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải lời mời mới để đối chiếu" }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledOnce());
    expect(mocks.write).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Đã đối chiếu, giữ nháp" })).toBeNull();
    expect((screen.getByRole("button", { name: "Gửi phản hồi ca" }) as HTMLButtonElement).matches(":disabled")).toBe(true);
  });
});
