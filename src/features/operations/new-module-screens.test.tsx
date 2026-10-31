// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), subjectType: "Trader" }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType }, permissions: { functionPermissions: [] } }) }));
import { PurchaseRequestsScreen, SalesProductsScreen, WorkforceScreen } from "./new-module-screens";
import { ids } from "./__tests__/fixtures";
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { vi.resetAllMocks(); mocks.subjectType = "Trader"; });
afterEach(cleanup);
describe("new API read screens", () => {
  it("uses only the Trader's own request feed and preserves status when manually reloading", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 20, total: 0 } });
    render(<PurchaseRequestsScreen />); await screen.findByText("Không có dữ liệu phù hợp.");
    fireEvent.change(screen.getByLabelText("Trạng thái yêu cầu"), { target: { value: "ACCEPTED" } });
    await waitFor(() => expect(mocks.read.mock.calls.at(-1)?.[1]).toMatchObject({ status: "ACCEPTED", page: "1" }));
    await waitFor(() => expect((screen.getByRole("button", { name: "Tải lại yêu cầu mua" }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole("button", { name: "Tải lại yêu cầu mua" }));
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(3));
    expect(mocks.read.mock.calls.every((args) => args[0] === "mine")).toBe(true);
    expect((screen.getByLabelText("Trạng thái yêu cầu") as HTMLSelectElement).value).toBe("ACCEPTED");
  });
  it("offers all products only to Owner and renders product content as text", async () => {
    mocks.subjectType = "CooperativeOwner";
    mocks.read.mockResolvedValue({ status: "success", data: [{ id: ids.item, code: "QA", name: "<script>QA</script>", description: null, inUse: true, availableForPurchase: true, rowVersion: "opaque" }] });
    const view = render(<SalesProductsScreen />); await screen.findByText("<script>QA</script>");
    expect(view.container.querySelector("script")).toBeNull();
    fireEvent.change(screen.getByLabelText("Phạm vi sản phẩm"), { target: { value: "all" } });
    await waitFor(() => expect(mocks.read.mock.calls.at(-1)?.[0]).toBe("all"));
  });
  it("recovers a read failure without clearing the entered product search", async () => {
    mocks.read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }).mockResolvedValue({ status: "success", data: [] });
    render(<SalesProductsScreen />); await screen.findByRole("alert");
    fireEvent.change(screen.getByLabelText("Tìm sản phẩm"), { target: { value: "hàu" } });
    fireEvent.click(screen.getByRole("button", { name: "Tải lại sản phẩm" })); await screen.findByText("Không có dữ liệu phù hợp.");
    expect((screen.getByLabelText("Tìm sản phẩm") as HTMLInputElement).value).toBe("hàu");
    expect(screen.queryByLabelText("Phạm vi sản phẩm")).toBeNull();
  });
  it("opens a Trader request detail through the personal endpoint and shows the accepted cage quantity", async () => {
    const record = { id: ids.receipt, code: "YC-QA", productId: ids.item, productName: "Hàu QA", quantityUnit: "Cage", requestedCages: 5,
      requestedPickupDate: "2026-10-31", note: "Ghi chú QA", status: "ACCEPTED", acceptedCages: 3, acceptedPickupDate: "2026-11-01", allowPayLater: true,
      responseNote: "Đã đối chiếu", respondedAt: "2026-10-31T02:00:00+07:00", cancelledAt: null, cancellationReason: null, createdAt: "2026-10-31T01:00:00+07:00", customerName: "QA trader", rowVersion: "opaque" };
    mocks.read.mockImplementation(async (action) => ({ status: "success", data: action === "mine-detail" ? record : { items: [record], page: 1, pageSize: 20, total: 1 } }));
    render(<PurchaseRequestsScreen />); fireEvent.click(await screen.findByRole("button", { name: "Mở yêu cầu" }));
    await screen.findByRole("dialog", { name: "Yêu cầu YC-QA" });
    expect(mocks.read.mock.calls.at(-1)?.slice(0, 2)).toEqual(["mine-detail", { id: ids.receipt }]);
    expect(screen.getByText("Đã đối chiếu")).toBeTruthy(); expect(screen.getByText("3")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Đóng" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
  it("requires a selected workforce day and renders absent attendance truthfully", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [{ id: ids.receipt, employeeId: ids.item, employeeName: "QA nhân viên", zoneId: ids.zone, raftId: null, raftCode: null, jobTypeId: null, job: "Chăm sóc", date: "2026-10-31", checkedInAt: null, checkedOutAt: null }] });
    render(<WorkforceScreen />); await screen.findByText("QA nhân viên"); expect(screen.getAllByText("Chưa ghi nhận")).toHaveLength(2);
    fireEvent.change(screen.getByLabelText("Ngày làm việc"), { target: { value: "" } });
    await waitFor(() => expect((screen.getByRole("button", { name: "Tải lại phân công" }) as HTMLButtonElement).disabled).toBe(true));
    expect(mocks.read).toHaveBeenCalledTimes(1);
  });
});
