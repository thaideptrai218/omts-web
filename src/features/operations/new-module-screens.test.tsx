// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
const mocks = vi.hoisted(() => ({ read: vi.fn(), subjectType: "Trader" }));
vi.mock("./repository", () => ({ createOperationsRepository: () => ({ read: mocks.read }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subjectType }, permissions: { functionPermissions: [] } }) }));
import { PurchaseRequestsScreen, WorkforceScreen } from "./new-module-screens";
import { ids } from "./__tests__/fixtures";
import { backendRequest } from "./__tests__/purchase-request-fixture";
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => { vi.resetAllMocks(); mocks.subjectType = "Trader"; });
afterEach(cleanup);
describe("new API read screens", () => {
  it("routes the Owner to the review feed with the backend status id, never the trader's personal endpoint", async () => {
    mocks.subjectType = "CooperativeOwner";
    mocks.read.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 20, total: 0 } });
    render(<PurchaseRequestsScreen />); await screen.findByText("Không có dữ liệu phù hợp.");
    const status = within(screen.getByRole("group",{name:"Trạng thái yêu cầu"})); fireEvent.click(status.getByRole("checkbox",{name:"Tất cả"})); fireEvent.click(status.getByRole("checkbox",{name:"Đã chấp nhận"}));
    await waitFor(() => expect(mocks.read.mock.calls.at(-1)?.[1]).toMatchObject({ status: "3202", page: "1" }));
    // The only non-list read is the cooperative kg/lồng lookup (harvest settings); never the trader's "mine" endpoint.
    expect(mocks.read.mock.calls.every((args) => args[0] === "list" || args[0] === "settings")).toBe(true);
    expect(mocks.read.mock.calls.some((args) => args[0] === "mine")).toBe(false);
  });
  it("lists kg requests with customer, pickup date and response, then opens the detail read", async () => {
    mocks.subjectType = "CooperativeOwner";
    mocks.read.mockImplementation(async (action) => ({ status: "success", data: action === "detail" ? backendRequest() : { items: [backendRequest({ statusId: 3202, fulfilled: true, response: { acceptedKg: 100, pickupDate: "2026-11-13", payLaterAgreed: true, note: null, respondedAt: "2026-11-09T09:00:00+07:00" } })], page: 1, pageSize: 20, total: 1 } }));
    render(<PurchaseRequestsScreen />); await screen.findByText("Thương lái An");
    expect(screen.getByText("120,5 kg")).toBeTruthy(); expect(screen.getByText("12/11/2026")).toBeTruthy(); expect(screen.getByText(/Đã hoàn thành/)).toBeTruthy(); expect(screen.getByText("100 kg · lấy ngày 13/11/2026 · cho trả sau")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Mở yêu cầu" })); await waitFor(() => expect(mocks.read.mock.calls.some((args) => args[0] === "detail")).toBe(true));
  });
  it("renders absent attendance truthfully in the attendance view of the workforce day", async () => {
    mocks.read.mockResolvedValue({ status: "success", data: [{ id: ids.receipt, employeeId: ids.item, employeeName: "QA nhân viên", zoneId: ids.zone, raftId: null, raftCode: null, jobTypeId: null, job: "Chăm sóc", date: "2026-10-31", checkedInAt: null, checkedOutAt: null }] });
    render(<WorkforceScreen />); await screen.findByText("QA nhân viên"); fireEvent.click(screen.getByRole("tab",{name:"Chấm công"})); expect(screen.getAllByText("Chưa ghi nhận")).toHaveLength(2);
    expect(mocks.read).toHaveBeenCalledTimes(1);
  });
});
