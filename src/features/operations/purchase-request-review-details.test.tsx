// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), subjectType: "CooperativeOwner" }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read, write: mocks.write }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType } }) }));
import { PurchaseRequestReviewDetails } from "./purchase-request-review-details";
import { backendRequest } from "./__tests__/purchase-request-fixture";
import { businessToday } from "./ui";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  vi.resetAllMocks(); mocks.subjectType = "CooperativeOwner";
  // The staffing section reads the chosen employees and the employees on offer; nothing is chosen in these tests.
  mocks.read.mockImplementation(async (action: string) => ({ status: "success", data: action === "staffing" || action === "staffing-employees" ? [] : undefined }));
});
afterEach(cleanup);
const staffing = () => ({ cages: 12, workDate: businessToday(), pickupDate: businessToday(), requiredEmployees: 1, approvedEmployees: 1, hasEnoughStaff: true });
const awaiting = () => backendRequest({ pickupDate: businessToday(), staffing: staffing() });
const confirm = async () => fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));

describe("Owner purchase request review dialog", () => {
  it("shows the customer, cages, pickup date and sendings from the backend view", () => {
    render(<PurchaseRequestReviewDetails record={backendRequest({ sendings: [{ channel: "Sms", phoneNumber: "0900000001", deliveryStatusId: 1603, deliveryStatus: "Not sent", deliveryStatusAt: null }] })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText("Thương lái An")).toBeTruthy(); expect(screen.getByText("12 lồng")).toBeTruthy(); expect(screen.getByText("Gửi chưa thành công")).toBeTruthy();
  });
  it("accepts with cages, date and pay-later through /accept after confirmation", async () => {
    mocks.write.mockResolvedValue({ status: "success", data: backendRequest({ statusId: 3202 }) }); const saved = vi.fn();
    render(<PurchaseRequestReviewDetails record={awaiting()} onClose={vi.fn()} onSaved={saved} />);
    fireEvent.change(screen.getByLabelText("Số lượng chấp nhận *"), { target: { value: "10" } }); fireEvent.click(screen.getByLabelText("Cho trả sau"));
    fireEvent.click(screen.getByRole("button", { name: "Chấp nhận" })); expect(mocks.write).not.toHaveBeenCalled(); await confirm();
    await waitFor(() => expect(saved).toHaveBeenCalledOnce());
    expect(mocks.write).toHaveBeenCalledWith("accept", { acceptedCages: 10, pickupDate: businessToday(), payLaterAgreed: true, note: null, rowVersion: "AAAA" }, expect.anything(), backendRequest().id);
  });
  it("blocks more cages than requested and a decline without reason before any write", async () => {
    render(<PurchaseRequestReviewDetails record={awaiting()} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Số lượng chấp nhận *"), { target: { value: "999" } }); fireEvent.click(screen.getByRole("button", { name: "Chấp nhận" }));
    await screen.findByText(/không được vượt quá/);
    fireEvent.change(screen.getByLabelText("Phản hồi *"), { target: { value: "decline" } }); fireEvent.change(screen.getByLabelText("Lý do từ chối *"), { target: { value: "   " } }); fireEvent.click(screen.getByRole("button", { name: "Từ chối" }));
    await screen.findByText(/Nhập lý do từ chối/); expect(mocks.write).not.toHaveBeenCalled();
  });
  it("declines through /decline and keeps the draft blocked after an unknown result without replay", async () => {
    mocks.write.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    render(<PurchaseRequestReviewDetails record={awaiting()} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Phản hồi *"), { target: { value: "decline" } }); fireEvent.change(screen.getByLabelText("Lý do từ chối *"), { target: { value: "Hết hàng" } });
    fireEvent.click(screen.getByRole("button", { name: "Từ chối" })); await confirm();
    await screen.findByText(/Bản nháp đang được giữ/);
    expect(mocks.write).toHaveBeenCalledTimes(1); expect(mocks.write.mock.calls[0].slice(0, 2)).toEqual(["decline", { note: "Hết hàng", rowVersion: "AAAA" }]);
    expect((screen.getByLabelText("Lý do từ chối *") as HTMLTextAreaElement).matches(":disabled")).toBe(true);
  });
  it("offers no response form once answered, or to a viewer who is not the Owner", () => {
    render(<PurchaseRequestReviewDetails record={backendRequest({ statusId: 3203 })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Chấp nhận" })).toBeNull(); cleanup();
    mocks.subjectType = "Staff"; render(<PurchaseRequestReviewDetails record={awaiting()} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Chấp nhận" })).toBeNull(); expect(screen.getByText(/Chỉ Chủ hợp tác xã/)).toBeTruthy();
  });
});

describe("Chấp nhận needs a staffing plan", () => {
  it("keeps Chấp nhận disabled with a hint until the request has a plan, and Từ chối stays available", () => {
    render(<PurchaseRequestReviewDetails record={backendRequest({ pickupDate: businessToday() })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Chấp nhận" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Lập kế hoạch nhân sự ở trên trước khi chấp nhận/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Kế hoạch nhân sự" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Phản hồi *"), { target: { value: "decline" } });
    expect((screen.getByRole("button", { name: "Từ chối" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("enables Chấp nhận once the request carries a plan, also for an old request that waits for staff", () => {
    render(<PurchaseRequestReviewDetails record={backendRequest({ statusId: 3205, status: "Awaiting staff", pickupDate: businessToday(), staffing: staffing() })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByRole("button", { name: "Chấp nhận" }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByText("Chờ phản hồi")).toBeTruthy();
  });
});
