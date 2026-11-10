// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), subjectType: "Trader" }));
vi.mock("./purchase-repository", () => ({ purchaseRepository: { read: mocks.read, write: mocks.write }, productRepository: { read: mocks.read } }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType }, permissions: { functionPermissions: [] } }) }));
import { TraderPurchasesScreen } from "./trader-purchases-screen";
import type { TraderRequest } from "./contracts";

const request = (patch: Partial<TraderRequest> = {}): TraderRequest => ({ id: "11111111-1111-4111-8111-111111111111", productId: "22222222-2222-4222-8222-222222222222", productName: "Hàu sữa", requestedKg: 500, pickupDate: "2026-11-12",
  note: null, sentAt: "2026-11-09T08:15:00+07:00", statusId: 3201, status: "Awaiting response", fulfilled: false, canCancel: true, response: null, cancelReason: null, cancelledAt: null, rowVersion: "AAAA", ...patch });
const page = (requests: TraderRequest[]) => ({ status: "success", data: { requests, page: 1, pageSize: 20, total: requests.length, message: null, messageCode: null } });

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { vi.resetAllMocks(); mocks.subjectType = "Trader"; });
afterEach(cleanup);

describe("TraderPurchasesScreen", () => {
  it("reads /me/purchases via the 'mine' action and shows pills, kg and the Owner response", async () => {
    mocks.read.mockResolvedValue(page([request({ statusId: 3202, response: { acceptedKg: 300, pickupDate: "2026-11-13", payLaterAgreed: true, note: "Đến sớm", respondedAt: "2026-11-09T09:00:00+07:00" } })]));
    render(<TraderPurchasesScreen />);
    const list = await screen.findByRole("list", { name: "Danh sách đơn mua" });
    expect(mocks.read.mock.calls[0].slice(0, 2)).toEqual(["mine", { page: "1", pageSize: "20" }]);
    expect(within(list).getByText("Đã chấp nhận")).toBeTruthy();
    expect(within(list).getByText("500 kg")).toBeTruthy();
    expect(within(list).getByText("300 kg · lấy ngày 13/11/2026 · cho trả sau")).toBeTruthy();
  });

  it("filters the loaded page by status without another request", async () => {
    mocks.read.mockResolvedValue(page([request(), request({ id: "33333333-3333-4333-8333-333333333333", statusId: 3203 })]));
    render(<TraderPurchasesScreen />); await screen.findByRole("list", { name: "Danh sách đơn mua" });
    fireEvent.click(screen.getByRole("checkbox", { name: /Bị từ chối/ }));
    expect(within(screen.getByRole("list", { name: "Danh sách đơn mua" })).getAllByRole("listitem")).toHaveLength(1);
    expect(mocks.read).toHaveBeenCalledTimes(1);
  });

  it("shows the empty state, and an error with retry that reloads", async () => {
    mocks.read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }).mockResolvedValue(page([]));
    render(<TraderPurchasesScreen />); await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Thử tải lại" }));
    await screen.findByText("Bạn chưa có yêu cầu mua nào");
  });

  it("offers cancel only when CanCancel and sends reason with the row version, then reloads", async () => {
    mocks.read.mockResolvedValue(page([request({ statusId: 3204, canCancel: false }), request({ id: "33333333-3333-4333-8333-333333333333", rowVersion: "BBBB" })]));
    mocks.write.mockResolvedValue({ status: "success", data: request({ statusId: 3204, canCancel: false }) });
    render(<TraderPurchasesScreen />); await screen.findByRole("list", { name: "Danh sách đơn mua" });
    expect(screen.getAllByRole("button", { name: /^Hủy yêu cầu/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: /^Hủy yêu cầu/ }));
    const dialog = await screen.findByRole("dialog", { name: "Hủy yêu cầu mua" });
    fireEvent.change(within(dialog).getByLabelText(/Lý do hủy/), { target: { value: " Đổi kế hoạch " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận hủy" }));
    await waitFor(() => expect(mocks.write).toHaveBeenCalledTimes(1));
    expect(mocks.write.mock.calls[0].slice(0, 2)).toEqual(["cancel", { reason: "Đổi kế hoạch", rowVersion: "BBBB" }]);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
  });

  it("locks the cancel form after an uncertain failure instead of replaying", async () => {
    mocks.read.mockResolvedValue(page([request()]));
    mocks.write.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    render(<TraderPurchasesScreen />); await screen.findByRole("list", { name: "Danh sách đơn mua" });
    fireEvent.click(screen.getByRole("button", { name: /^Hủy yêu cầu/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Xác nhận hủy" }));
    await screen.findByText(/hệ thống không tự gửi lại/);
    expect(screen.queryByRole("button", { name: "Xác nhận hủy" })).toBeNull();
    expect(mocks.write).toHaveBeenCalledTimes(1);
  });

  it("denies non-trader accounts", () => {
    mocks.subjectType = "CooperativeOwner";
    render(<TraderPurchasesScreen />);
    expect(screen.getByRole("alert").textContent).toContain("thương lái");
    expect(mocks.read).not.toHaveBeenCalled();
  });
});
