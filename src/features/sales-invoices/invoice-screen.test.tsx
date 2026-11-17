// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";

const state = vi.hoisted(() => ({ read: vi.fn(), replace: vi.fn(), push: vi.fn(), notify: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: state.read, write: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: state.replace, push: state.push }) }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: state.notify }) }));
import { SalesInvoiceScreen } from "./invoice-screen";

const sale = { code: "HD000124", status: "Awaiting", zone: { id: "00000000-0000-4000-8000-000000000001", code: "VP01", name: "V" }, customer: null, walkInCustomer: true, total: 5, cashAmount: 0, toPayAmount: 5, receivedAmount: 0, vietQr: null, createdAt: "2026-11-09T03:00:00+07:00", invoiceId: null, invoice: null, endedAt: null };
const serve = (sales: unknown[]) => state.read.mockImplementation(async (_action: string, _query: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(sales) }));
beforeEach(() => { state.read.mockReset(); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("sends the old address to the orders with a hint when no VietQR sale is waiting", async () => {
  serve([]);
  render(<SalesInvoiceScreen />);
  await waitFor(() => expect(state.replace).toHaveBeenCalledWith("/sales/orders"));
  expect(state.notify.mock.calls[0][0].title).toMatch(/Xử lý đặt hàng/);
});

it("stays while a VietQR sale is waiting for its transfer so that it can still be followed", async () => {
  serve([sale]);
  render(<SalesInvoiceScreen />);
  expect(await screen.findByText("Giao dịch VietQR đang chờ")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Mở danh sách đơn đặt hàng" }).getAttribute("href")).toBe("/sales/orders");
  expect(state.replace).not.toHaveBeenCalled();
});

it("does not redirect when the waiting sales cannot be read", async () => {
  state.read.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  render(<SalesInvoiceScreen />);
  expect(await screen.findByRole("alert")).toBeTruthy();
  expect(state.replace).not.toHaveBeenCalled();
});
