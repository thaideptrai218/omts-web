// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

const ids = {
  zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", customer: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", order: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", invoice: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06",
  kgProduct: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", cageProduct: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02", kgUnit: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b11", cageUnit: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b12",
  kgOrderLine: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b21", cageOrderLine: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b22", lotA: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b31", lotB: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b32", line: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b41",
};
const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "owner", accountId: "x" }, permissions: { functionPermissions: [] as { functionCode: string; action: string; scope: { kind: string }; dataScope: string }[] } },
  push: vi.fn(), draft: vi.fn(), lots: vi.fn(), invoice: vi.fn(), pending: vi.fn(), create: vi.fn(), update: vi.fn(), orderDetail: vi.fn(), finish: vi.fn(), products: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/harvest-settings-lookup/use-kg-per-cage", () => ({ useKgPerCage: () => ({ kgPerCage: undefined, loading: false }) }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  invoiceEditorRepository: { draft: state.draft, lots: state.lots, invoice: state.invoice, pending: state.pending, create: state.create, update: state.update },
}));
vi.mock("@/features/sales-orders/repository", async (original) => ({ ...(await original<typeof import("@/features/sales-orders/repository")>()), orderRepository: { detail: state.orderDetail, finish: state.finish } }));
vi.mock("@/features/products/repository", async (original) => ({ ...(await original<typeof import("@/features/products/repository")>()), productRepository: { all: state.products } }));
// The QR / SMS step makes its own calls; only its being reached matters here.
vi.mock("@/features/sales-invoices/invoice-finish-panel", () => ({ InvoiceFinishPanel: ({ invoice }: { invoice: { code: string } }) => <p>Đã lập hóa đơn {invoice.code}</p> }));
import { InvoiceEditorPage } from "./invoice-editor";
import { ToastProvider } from "@/components/ui/toast-provider";

const lot = (id: string, code: string, plan?: string) => ({ id, lotCode: code, raftId: ids.zone, raftCode: "B0", zoneId: ids.zone, zoneCode: "VP01", zoneName: "Vùng", harvestDate: "2026-11-01", remainingKg: 100, statusId: 1, status: "Open", originState: "NotPublished", withdrawnAt: null,
  ...(plan ? { harvestPlanCode: plan, suggested: true } : {}) });
const unit = (unitId: string, name: string, factor: number, isBase: boolean, salePrice: number) => ({ id: unitId, unitId, name, factor, code: name, isBase, salePrice });
const product = (id: string, code: string, name: string, units: ReturnType<typeof unit>[]) => ({ id, code, name, unitPrice: 50_000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x", units });
const draft = {
  order: { id: ids.order, code: "DH000001", statusId: 4101, status: "Draft", canFinish: false }, zone: { id: ids.zone, code: "VP01", name: "Vùng" },
  customer: { id: ids.customer, code: "KH000001", name: "Thương lái An", phoneNumber: null }, walkInCustomer: false,
  lines: [
    { salesOrderLineId: ids.kgOrderLine, lineNumber: 1, productId: ids.kgProduct, productCode: "SP000001", productName: "Hàu sữa", unitId: ids.kgUnit, unitCode: "K", unitName: "kg", factor: 1, orderedQuantity: 100, deliveredQuantity: 40, quantity: 60,
      unitPrice: 50_000, listPrice: 52_000, amount: 3_000_000, suggestedLotId: ids.lotA, suggestedLotCode: "B01-1", suggestedByPlan: true },
    { salesOrderLineId: ids.cageOrderLine, lineNumber: 2, productId: ids.cageProduct, productCode: "SP000002", productName: "Hàu lồng", unitId: ids.cageUnit, unitCode: "L", unitName: "Lồng", factor: 15, orderedQuantity: 2, deliveredQuantity: 0, quantity: 2,
      unitPrice: 1_200_000, listPrice: 1_200_000, amount: 2_400_000, suggestedLotId: ids.lotB, suggestedLotCode: "B02-1", suggestedByPlan: false },
  ],
  subtotal: 5_400_000, orderDiscount: 100_000, discountShare: 72_973, total: 5_327_027, advanceLeft: 500_000, advanceUse: 500_000, nextCode: "HD000002",
};
const saved = (canFinish: boolean) => ({ invoice: { id: ids.invoice, code: "HD000001" }, change: 0, subtractedFromDebt: 0, message: "ok", messageCode: "MSG-GEN-05", order: { id: ids.order, code: "DH000001", statusId: 4102, canFinish } });
const invoice = {
  id: ids.invoice, code: "HD000001", invoicedAt: "2026-11-12T09:00:00+07:00", invoiceDate: "2026-11-12", zone: { id: ids.zone, code: "VP01", name: "Vùng" }, customer: { id: ids.customer, name: "Thương lái An", phoneNumber: null, code: "KH000001" },
  walkInCustomer: false, salesOrder: { id: ids.order, code: "DH000001" }, note: "cũ", purchaseRequestId: null, takesRequestInFull: false, totalKg: 60, subtotal: 3_000_000, discount: 40_541, discountDecidedByOwner: false, otherCharges: 0, priceCutTotal: 0, total: 2_959_459,
  paymentTerm: "PayLater", statusId: 3501, status: "Completed", payments: [], createdBy: { id: ids.customer, name: "Chủ" }, qrToken: null, qrUrl: null, qrDecidedAt: null, deliveryStatusId: 1602, deliveryStatus: "Sent", sendings: [], rowVersion: "AAAA",
  lines: [{ id: ids.line, lineNumber: 1, productId: ids.kgProduct, productName: "Hàu sữa", harvestLotId: ids.lotA, lotCode: "B01-1", kg: 60, unitPrice: 50_000, listPrice: 52_000, priceSource: "OrderPrice", amount: 3_000_000, soldWholeLot: true,
    unit: { id: ids.kgUnit, code: "kg", name: "kg", factor: 1 }, quantity: 60, salesOrderLineId: ids.kgOrderLine }],
};

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.context.identity.subjectType = "CooperativeOwner";
  state.draft.mockResolvedValue({ status: "success", data: draft });
  state.lots.mockResolvedValue({ status: "success", data: { lots: [lot(ids.lotB, "B02-1"), lot(ids.lotA, "B01-1", "KHT000001")], message: null, messageCode: null } });
  state.products.mockResolvedValue({ status: "success", data: [
    product(ids.kgProduct, "SP000001", "Hàu sữa", [unit(ids.kgUnit, "kg", 1, true, 52_000)]),
    product(ids.cageProduct, "SP000002", "Hàu lồng", [unit("u-base", "kg", 1, true, 80_000), unit(ids.cageUnit, "Lồng", 15, false, 1_200_000)]),
  ] });
  state.pending.mockResolvedValue({ status: "success", data: [] });
  state.create.mockResolvedValue({ status: "success", data: saved(false) });
  state.finish.mockResolvedValue({ status: "success", data: { order: {}, creditLeft: 0 } });
  state.invoice.mockResolvedValue({ status: "success", data: invoice });
  state.orderDetail.mockResolvedValue({ status: "success", data: { id: ids.order, lines: [{ id: ids.kgOrderLine, quantity: 100, deliveredQuantity: 100, unitPrice: 50_000 }] } });
  state.update.mockResolvedValue({ status: "success", data: { invoice, deliveryStatusId: 1602, deliveryStatus: "Sent", qrUrl: null, lots: [], message: null, messageCode: null } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = (props: { orderId?: string; invoiceId?: string }) => render(<ToastProvider><InvoiceEditorPage {...props} /></ToastProvider>);

it("opens the order with its remaining lines, the lot of the plan chosen, the discount share and the advance set against the invoice", async () => {
  mount({ orderId: ids.order });
  expect(await screen.findByText("Hóa đơn bán · đơn DH000001")).toBeTruthy();
  expect((screen.getByLabelText("số lượng dòng 1") as HTMLInputElement).value).toBe("60");
  expect((screen.getByLabelText("Lô thu hoạch dòng 1") as HTMLSelectElement).value).toBe(ids.lotA);
  expect(screen.getByText("KHT000001")).toBeTruthy();
  expect(state.lots).toHaveBeenCalledWith(ids.order, expect.anything());
  expect((screen.getByLabelText("Mã hóa đơn") as HTMLInputElement).placeholder).toBe("HD000002 (tự động)");
  // The lot of the plan that serves the order comes first in the list even though the API listed it second.
  const lotOptionsOfLine1 = within(screen.getByLabelText("Lô thu hoạch dòng 1")).getAllByRole("option");
  expect(lotOptionsOfLine1[1].textContent).toMatch(/^KHT000001 · B01-1/);
  expect(lotOptionsOfLine1[2].textContent).toMatch(/^B02-1/);
  expect((screen.getByLabelText("Đơn giá dòng 2") as HTMLInputElement).value).toBe("1.200.000");
  // The unit of a line of the order is fixed by the order: a locked cell select, like the unit of a receipt line that already gave goods away.
  expect(screen.getByRole("columnheader", { name: "ĐVT" })).toBeTruthy();
  const unitOfLine2 = screen.getByLabelText("Đơn vị tính dòng 2") as HTMLSelectElement;
  expect(unitOfLine2.disabled).toBe(true); expect(unitOfLine2.value).toBe(ids.cageUnit);
  expect(screen.getByText("Thương lái An", { exact: false })).toBeTruthy();
  // 60 kg × 50.000 + 2 Lồng × 1.200.000 = 5.400.000; share of the 100.000 discount = 72.973; advance 500.000.
  expect(screen.getByText("Khách cần trả").nextElementSibling?.textContent).toBe("5.327.027");
  expect(screen.getByText("Đã tạm ứng (tự động)").nextElementSibling?.textContent).toBe("500.000");
});

it("sends the invoice of the order with the unit quantity and the weighed kg, then asks to end the order and ends it on agreement", async () => {
  const user = userEvent.setup();
  state.create.mockResolvedValue({ status: "success", data: saved(true) });
  mount({ orderId: ids.order });
  await screen.findByText("Hóa đơn bán · đơn DH000001");
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  expect((await screen.findByRole("alert")).textContent).toMatch(/Dòng 2: nhập số kg cân/);
  expect(state.create).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Kg cân dòng 2"), "28,5");
  await user.type(screen.getByLabelText("Khách thanh toán"), "4827027");
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  expect(state.create.mock.calls[0][0]).toMatchObject({
    salesOrderId: ids.order, discount: 72_973, payment: { cashAmount: 4_827_027, rest: "None" },
    lines: [
      { productId: ids.kgProduct, harvestLotId: ids.lotA, kg: 60, salesOrderLineId: ids.kgOrderLine, unitId: ids.kgUnit, unitPrice: 50_000 },
      { productId: ids.cageProduct, harvestLotId: ids.lotB, kg: 28.5, salesOrderLineId: ids.cageOrderLine, unitId: ids.cageUnit, quantity: 2, unitPrice: 1_200_000 },
    ],
  });
  expect(state.create.mock.calls[0][0]).not.toHaveProperty("customerId");
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getByText("Kết thúc đơn đặt hàng?")).toBeTruthy();
  await user.click(within(dialog).getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.finish).toHaveBeenCalledWith(ids.order));
  expect(await screen.findByText("Đã lập hóa đơn HD000001")).toBeTruthy();
});

it("keeps the order as it is when the question to end it is skipped, and does not ask when nothing is left to deliver", async () => {
  const user = userEvent.setup();
  state.create.mockResolvedValueOnce({ status: "success", data: saved(true) });
  mount({ orderId: ids.order });
  await screen.findByText("Hóa đơn bán · đơn DH000001");
  await user.type(screen.getByLabelText("Kg cân dòng 2"), "28,5");
  await user.type(screen.getByLabelText("Khách thanh toán"), "4827027");
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  await user.click(await screen.findByRole("button", { name: "Bỏ qua" }));
  expect(state.finish).not.toHaveBeenCalled();
  expect(await screen.findByText("Đã lập hóa đơn HD000001")).toBeTruthy();
  cleanup();
  mount({ orderId: ids.order });
  await screen.findByText("Hóa đơn bán · đơn DH000001");
  await user.type(screen.getByLabelText("Kg cân dòng 2"), "28,5");
  await user.type(screen.getByLabelText("Khách thanh toán"), "4827027");
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  expect(await screen.findByText("Đã lập hóa đơn HD000001")).toBeTruthy();
  expect(screen.queryByText("Kết thúc đơn đặt hàng?")).toBeNull();
});

it("answers the question of pay later and sends the same save again with the agreement and the same key", async () => {
  const user = userEvent.setup();
  state.create.mockResolvedValueOnce({ status: "error", httpStatus: 409, uncertain: false, code: "MSG-SALE-12", invoiceConfirmation: { field: "payment.payLaterOwnerAgreed", laterAmount: 4_827_027, debtAmount: 0 } });
  mount({ orderId: ids.order });
  await screen.findByText("Hóa đơn bán · đơn DH000001");
  await user.type(screen.getByLabelText("Kg cân dòng 2"), "28,5");
  await user.click(screen.getByRole("checkbox", { name: /Trả sau/ }));
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  await user.click(await screen.findByRole("button", { name: "Chủ HTX đã đồng ý" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(2));
  expect(state.create.mock.calls[0][0].payment).toMatchObject({ rest: "PayLater", payLaterOwnerAgreed: false });
  expect(state.create.mock.calls[1][0].payment).toMatchObject({ rest: "PayLater", payLaterOwnerAgreed: true });
  expect(state.create.mock.calls[1][0].deduplicationKey).toBe(state.create.mock.calls[0][0].deduplicationKey);
});

it("starts a VietQR sale for the rest and sends nothing about the debt", async () => {
  const user = userEvent.setup();
  state.create.mockResolvedValueOnce({ status: "error", httpStatus: 409, uncertain: false });
  mount({ orderId: ids.order });
  await screen.findByText("Hóa đơn bán · đơn DH000001");
  await user.type(screen.getByLabelText("Kg cân dòng 2"), "28,5");
  await user.click(screen.getByRole("button", { name: "Thanh toán VietQR" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  expect(state.create.mock.calls[0][0].payment).toEqual({ cashAmount: 0, rest: "VietQr", subtractExtraFromDebt: null, payLaterOwnerAgreed: false });
  expect((await screen.findByRole("alert")).textContent).toMatch(/VietQR/);
});

it("changes an invoice like a receipt: prefilled, customer and zone locked, a change saved whole with the row version after the user confirms", async () => {
  const user = userEvent.setup();
  mount({ invoiceId: ids.invoice });
  expect(await screen.findByText("Sửa hóa đơn HD000001")).toBeTruthy();
  expect((screen.getByLabelText("số lượng dòng 1") as HTMLInputElement).value).toBe("60");
  expect((screen.getByLabelText("Ghi chú") as HTMLTextAreaElement).value).toBe("cũ");
  expect(screen.getByText("Thương lái An")).toBeTruthy(); expect(screen.getByRole("link", { name: "KH000001" }).getAttribute("href")).toBe("/workspace/customers?code=KH000001");
  expect(screen.queryByLabelText("Khách thanh toán")).toBeNull();
  const quantity = screen.getByLabelText("số lượng dòng 1");
  await user.clear(quantity); await user.type(quantity, "70");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  const confirm = await screen.findByRole("dialog");
  expect(within(confirm).getByText(/Khách nợ thêm 500\.000 đ/)).toBeTruthy();
  await user.click(within(confirm).getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
  expect(state.update.mock.calls[0][0]).toBe(ids.invoice);
  expect(state.update.mock.calls[0][1]).toEqual({
    code: "HD000001", note: "cũ", rowVersion: "AAAA", discount: 40_541, discountDecidedByOwner: false, otherCharges: 0, notSoldWholeLotIds: [],
    lines: [{ productId: ids.kgProduct, harvestLotId: ids.lotA, kg: 70, salesOrderLineId: ids.kgOrderLine, unitId: ids.kgUnit, unitPrice: 50_000 }],
  });
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/operations/sales-invoice-list?code=HD000001"));
});

it("asks whether the cooperative may owe the customer when the change lowers the invoice below what was paid", async () => {
  const user = userEvent.setup();
  state.update.mockResolvedValueOnce({ status: "error", httpStatus: 409, uncertain: false, invoiceConfirmation: { field: "confirmOwedBack", owedBackAmount: 120_000 } });
  mount({ invoiceId: ids.invoice });
  await screen.findByText("Sửa hóa đơn HD000001");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Đồng ý" }));
  const owed = await screen.findByText("Hợp tác xã sẽ nợ lại khách");
  expect(owed).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Vẫn lưu hóa đơn" }));
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(2));
  expect(state.update.mock.calls[0][1]).not.toHaveProperty("confirmOwedBack");
  expect(state.update.mock.calls[1][1]).toMatchObject({ confirmOwedBack: true, rowVersion: "AAAA" });
});

it("refuses an invoice that was cancelled and a caller without the right to change invoices", async () => {
  state.invoice.mockResolvedValue({ status: "success", data: { ...invoice, statusId: 3502 } });
  mount({ invoiceId: ids.invoice });
  expect(await screen.findByText("Hóa đơn HD000001 đã hủy nên không sửa được.")).toBeTruthy();
  cleanup();
  state.context.identity.subjectType = "Staff";
  state.context.permissions.functionPermissions = [{ functionCode: "SALES_INVOICES", action: "Create", scope: { kind: "all-zones" }, dataScope: "AssignedZone" }];
  mount({ invoiceId: ids.invoice });
  expect(await screen.findByText("Bạn không có quyền sửa hóa đơn bán.")).toBeTruthy();
});
