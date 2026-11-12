// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

const ids = {
  customer: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", kg: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02",
  cage: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b03", request: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b04", order: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", account: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06",
};
const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "owner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  push: vi.fn(), create: vi.fn(), update: vi.fn(), requestDraft: vi.fn(), detail: vi.fn(), print: vi.fn(), all: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  orderRepository: { create: state.create, update: state.update, requestDraft: state.requestDraft, detail: state.detail, print: state.print },
}));
vi.mock("@/features/products/repository", async (original) => ({ ...(await original<typeof import("@/features/products/repository")>()), productRepository: { all: state.all } }));
vi.mock("@/features/purchase-documents/repository", async (original) => ({
  ...(await original<typeof import("@/features/purchase-documents/repository")>()), listReceivers: vi.fn(async () => ({ status: "success", data: [{ id: ids.customer, name: "Thu ngân" }] })),
}));
vi.mock("@/features/cash-book/repository", async (original) => ({ ...(await original<typeof import("@/features/cash-book/repository")>()), listAccounts: vi.fn(async () => ({ status: "success", data: [] })) }));
import { OrderEditorPage } from "./order-editor";
import { ToastProvider } from "@/components/ui/toast-provider";

const product = { id: ids.product, code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x", units: [
  { id: ids.kg, unitId: ids.kg, name: "kg", factor: 1, code: "SP000001-K", isBase: true, salePrice: 60000 }, { id: ids.cage, unitId: ids.cage, name: "Lồng", factor: 15, code: "SP000001-L", isBase: false, salePrice: 850000 }] };
const draft = {
  purchaseRequestId: ids.request, customer: { id: ids.customer, code: "KH000001", name: "Thương lái An", phoneNumber: "0900000001" }, sentAt: "2026-11-12T08:00:00+07:00", requestStatusId: 3201,
  lines: [{ productId: ids.product, productCode: "SP000001", productName: "Hàu sữa", unitId: ids.kg, unitCode: "K", unitName: "kg", quantity: 120.5, unitPrice: 60000 }], pickupAt: "2026-11-14T00:00:00+07:00", source: "App", note: "Lấy sớm",
};
const order = {
  id: ids.order, code: "DH000001", statusId: 4101, status: "Draft", orderedAt: "2026-11-12T08:00:00+07:00", pickupAt: null, customer: null, walkInCustomer: true,
  source: "AtPort", receivedBy: { id: ids.customer, name: "Chủ" }, createdBy: null, note: null, subtotal: 60000, discount: 0, discountDecidedByOwner: false, total: 60000, invoicedTotal: 0, customerPaid: 0,
  advanceLeft: 0, advanceReserved: false, lines: [], progress: [], advances: [], invoices: [], harvestPlans: [], purchaseRequest: null, allowedActions: ["Edit"],
  createdAt: "2026-11-12T08:00:00+07:00", completedAt: null, completedManually: false, cancelledAt: null, cancelReason: null, rowVersion: "v1",
};

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.context.identity.subjectType = "CooperativeOwner";
  state.context.permissions.functionPermissions = [];
  state.all.mockResolvedValue({ status: "success", data: [product] });
  state.requestDraft.mockResolvedValue({ status: "success", data: draft });
  state.create.mockResolvedValue({ status: "success", data: { order, message: "ok", messageCode: "MSG-GEN-05", advanceQr: null } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("prefills customer, line, pickup and source from a purchase request and sends them with the request id", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><OrderEditorPage requestId={ids.request} /></ToastProvider>);
  expect(await screen.findByText("Thương lái An")).toBeTruthy();
  expect((screen.getByLabelText("số lượng dòng 1") as HTMLInputElement).value).toBe("120.5");
  expect((screen.getByLabelText("Nguồn đặt") as HTMLSelectElement).disabled).toBe(true);
  await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  expect(state.create.mock.calls[0][0]).toMatchObject({
    purchaseRequestId: ids.request, customerId: ids.customer, walkInCustomer: false, source: "App", pickupAt: "2026-11-14T00:00:00+07:00", note: "Lấy sớm",
    lines: [{ productId: ids.product, unitId: ids.kg, quantity: 120.5, unitPrice: 60000, priceDecidedByOwner: false }],
  });
  expect(state.create.mock.calls[0][0]).not.toHaveProperty("advance");
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/sales/orders?code=DH000001"));
});

it("switches the unit of a line to its list price and asks the Owner's question again with the flag set", async () => {
  state.context.identity.subjectType = "Staff";
  state.context.permissions.functionPermissions = [{ functionCode: "SALES_ORDERS", action: "Create" }];
  state.create.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-SALE-10", confirmation: { field: "lines[0].priceDecidedByOwner", lineNumber: 1 } });
  const user = userEvent.setup();
  render(<ToastProvider><OrderEditorPage /></ToastProvider>);
  await user.click(await screen.findByLabelText("Tìm khách hàng"));
  await user.click(await screen.findByRole("button", { name: /Khách lẻ/ }));
  await user.type(screen.getByLabelText("Tìm hàng hóa theo mã hoặc tên"), "Hàu");
  await user.click(await screen.findByRole("button", { name: /Hàu sữa/ }));
  await user.selectOptions(screen.getByLabelText("Đơn vị tính dòng 1"), ids.cage);
  expect((screen.getByLabelText("Đơn giá dòng 1") as HTMLInputElement).value).toBe("850.000");
  expect((screen.getByLabelText("Nguồn đặt") as HTMLSelectElement).value).toBe("AtPort");
  await user.click(screen.getByRole("button", { name: "Đặt hàng" }));
  expect(await screen.findByText("Đơn giá khác bảng giá")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Chủ HTX đã đồng ý" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(2));
  expect(state.create.mock.calls[0][0].lines[0]).toMatchObject({ unitId: ids.cage, quantity: 1, unitPrice: 850000, priceDecidedByOwner: false });
  expect(state.create.mock.calls[1][0]).toMatchObject({ walkInCustomer: true, customerId: null, source: "AtPort", deduplicationKey: state.create.mock.calls[0][0].deduplicationKey });
  expect(state.create.mock.calls[1][0].lines[0].priceDecidedByOwner).toBe(true);
});

it("keeps what was typed and shows the first problem when the form is incomplete", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><OrderEditorPage /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: "Đặt hàng" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Chọn khách hàng");
  expect(state.create).not.toHaveBeenCalled();
});

const openOrder = {
  ...order, customer: { id: ids.customer, code: "KH000001", name: "Thương lái An", phoneNumber: "0900000001" }, walkInCustomer: false, allowedActions: ["Edit", "AddAdvance"], statusId: 4102, status: "Delivering",
  lines: [{ id: ids.request, lineNumber: 1, productId: ids.product, productCode: "SP000001", productName: "Hàu sữa", unitId: ids.kg, unitCode: "K", unitName: "kg", factor: 1, quantity: 1, unitPrice: 60000, listPrice: 60000, amount: 60000, deliveredQuantity: 0, note: null }],
};

it("takes one more advance when an open order is opened again: it travels with the update", async () => {
  state.detail.mockResolvedValue({ status: "success", data: openOrder });
  state.update.mockResolvedValue({ status: "success", data: { order: openOrder, message: "ok", messageCode: "MSG-GEN-05", advanceQr: null } });
  const user = userEvent.setup();
  render(<ToastProvider><OrderEditorPage id={ids.order} /></ToastProvider>);
  await user.type(await screen.findByLabelText("Khách thanh toán"), "20000");
  await user.click(screen.getByRole("radio", { name: "Chuyển khoản" }));
  await user.type(screen.getByLabelText("Mã giao dịch ngân hàng"), " FT1 ");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
  expect(state.update.mock.calls[0][0]).toBe(ids.order);
  expect(state.update.mock.calls[0][1]).toMatchObject({ rowVersion: "v1", advance: { amount: 20000, method: "OtherTransfer", bankReference: "FT1" } });
  expect(state.update.mock.calls[0][1]).not.toHaveProperty("zoneId");
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/sales/orders?code=DH000001"));
});

it("offers the advance only to a customer with a profile and no zone at all", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><OrderEditorPage /></ToastProvider>);
  await user.click(await screen.findByLabelText("Tìm khách hàng"));
  await user.click(await screen.findByRole("button", { name: /Khách lẻ/ }));
  expect(screen.queryByLabelText("Khách thanh toán")).toBeNull();
  expect(screen.queryByLabelText("Vùng")).toBeNull();
});
