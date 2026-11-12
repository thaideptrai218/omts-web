// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const ids = { order: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", customer: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", invoice: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07", cash: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08", qr: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b09" };
const state = vi.hoisted(() => ({ detail: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner", username: "owner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), orderRepository: { detail: state.detail } }));
import { OrderDetailPanel } from "./order-detail";
import { ToastProvider } from "@/components/ui/toast-provider";

const order = {
  id: ids.order, code: "DH000001", statusId: 4102, status: "Delivering", orderedAt: "2026-11-12T08:00:00+07:00", pickupAt: null,
  customer: { id: ids.customer, code: "KH000001", name: "Thương lái An", phoneNumber: "0900000001" }, walkInCustomer: false, source: "Phone", receivedBy: { id: ids.customer, name: "Chủ" }, createdBy: null,
  note: null, subtotal: 300000, discount: 0, discountDecidedByOwner: false, total: 300000, invoicedTotal: 100000, customerPaid: 50000, advanceLeft: 50000, advanceReserved: true,
  lines: [], progress: [],
  advances: [
    { paymentId: ids.cash, paymentCode: "PT000001", amount: 50000, method: "Cash", statusId: 3602, status: "Completed", paidAt: "2026-11-12T09:00:00+07:00", bankReference: null, collectedBy: null, allocatedToInvoices: 0, reserved: true },
    { paymentId: ids.qr, paymentCode: "PT000002", amount: 70000, method: "OtherTransfer", statusId: 3604, status: "Pending transfer", paidAt: "2026-11-12T10:00:00+07:00", bankReference: null, collectedBy: null, allocatedToInvoices: 0, reserved: true },
  ],
  invoices: [{ id: ids.invoice, code: "HD000001", invoicedAt: "2026-11-12T11:00:00+07:00", total: 100000, statusId: 3501, status: "Completed" }],
  harvestPlans: [], purchaseRequest: null, allowedActions: ["Edit", "AddAdvance", "Finish"],
  createdAt: "2026-11-12T08:00:00+07:00", completedAt: null, completedManually: false, cancelledAt: null, cancelReason: null, rowVersion: "v1",
};
const access = { owner: true, username: "owner", view: true, create: true, edit: true, remove: true, exportFile: true, addCustomer: true };

beforeEach(() => { state.detail.mockResolvedValue({ status: "success", data: order }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("lists the invoices and every advance payment in the history, newest first, each code opening its own list", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><OrderDetailPanel id={ids.order} access={access} onChanged={() => undefined} /></ToastProvider>);
  await user.click(await screen.findByRole("tab", { name: "Lịch sử" }));
  const rows = screen.getAllByRole("row").slice(1);
  expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["HD000001", "PT000002", "PT000001"]);
  expect(within(rows[0]).getByRole("link", { name: "HD000001" }).getAttribute("href")).toBe("/operations/sales-invoice-list?code=HD000001");
  expect(within(rows[2]).getByRole("link", { name: "PT000001" }).getAttribute("href")).toBe("/operations/cash-book?code=PT000001");
  expect(within(rows[2]).getAllByRole("cell").map((cell) => cell.textContent).slice(2, 5)).toEqual(["Tiền ứng - Tiền mặt", "Hoàn thành", "50.000"]);
  expect(within(rows[1]).getByRole("button", { name: "Hiện mã QR" })).toBeTruthy();
});

it("has no button to take an advance: that is done in the order editor", async () => {
  render(<ToastProvider><OrderDetailPanel id={ids.order} access={access} onChanged={() => undefined} /></ToastProvider>);
  await screen.findByRole("button", { name: /Mở phiếu/ });
  expect(screen.queryByRole("button", { name: /Thu tiền ứng/ })).toBeNull();
});
