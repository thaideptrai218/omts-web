// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { detail, ids, listResult, sent } from "./invoice-list-test-fixtures";

const { read, write, download, workspace, zones, push, orderDetail, notify, customers } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), download: vi.fn(), workspace: vi.fn(), zones: vi.fn(), push: vi.fn(), orderDetail: vi.fn(), notify: vi.fn(), customers: vi.fn() }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/sales-orders/repository", () => ({ orderRepository: { detail: orderDetail } }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read, write, download }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: workspace }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: zones }));
vi.mock("@/features/customers/repository", async (original) => ({ ...(await original<typeof import("@/features/customers/repository")>()), customerRepository: { list: customers } }));
import { SalesInvoiceListScreen } from "./invoice-list-screen";

const owner = { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } };
type Replies = { list?: unknown; detail?: unknown };
/** Repository giả trả dữ liệu mẫu nhưng vẫn đi qua schema zod thật của hợp đồng. */
function serve({ list = listResult(), detail: det = detail() }: Replies = {}) {
  read.mockImplementation(async (action: string, _query: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(action === "list" ? list : det) }));
}
const rowButton = /^(Mở|Thu gọn) HD000123$/;
const openRow = async () => { render(<SalesInvoiceListScreen />); fireEvent.click(await screen.findByRole("button", { name: rowButton })); await screen.findByRole("tablist"); };

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  workspace.mockReturnValue(owner); zones.mockResolvedValue({ status: "success", data: [{ id: ids.zone, code: "VP01", name: "Vùng nuôi 1" }] });
  download.mockResolvedValue({ status: "success", data: true });
  orderDetail.mockResolvedValue({ status: "error", httpStatus: 403, uncertain: false });
  customers.mockResolvedValue({ status: "success", data: { items: [{ id: ids.customer, code: "KH000001", name: "Nguyễn Văn Hùng", phoneNumber: "0912345678" }], page: 1, pageSize: 8, total: 1 } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("SalesInvoiceListScreen", () => {
  it("lists invoices with Vietnamese labels only and the API totals", async () => {
    serve(); render(<SalesInvoiceListScreen />);
    const row = (await screen.findByRole("button", { name: rowButton })).closest("tr")!;
    expect(within(row).getByText("Hoàn thành")).toBeTruthy(); expect(within(row).getByText("Còn nợ")).toBeTruthy(); expect(within(row).getByText("Đã gửi")).toBeTruthy(); expect(within(row).getByText("Trả sau")).toBeTruthy();
    expect(screen.getByText(/Số hóa đơn/).textContent).toMatch(/Số hóa đơn 1 · Tổng tiền hóa đơn hoàn thành 15\.800\.000/);
    expect(within(row).getByText("15.800.000")).toBeTruthy(); expect(within(row).getByText("Còn 5.000.000")).toBeTruthy(); expect(within(row).getByText("09/11/2026 10:12")).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Completed|Cancelled|Sent|PayLater/);
    expect(read.mock.calls[0].slice(0, 2)).toMatchObject(["list", { from: expect.any(String), to: expect.any(String), page: "1", pageSize: "20" }]);
  });

  it("shows an error with retry, and an empty state when nothing matches", async () => {
    read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }); render(<SalesInvoiceListScreen />);
    expect((await screen.findByRole("alert")).textContent).toBeTruthy();
    serve({ list: { ...listResult([]), message: "No data", messageCode: "MSG-GEN-10" } }); fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));
    expect(await screen.findByText(/Chưa có hóa đơn trong kỳ này/)).toBeTruthy(); expect(screen.queryByText("No data")).toBeNull();
  });

  it("denies a role without view permission and sends no request", () => {
    workspace.mockReturnValue({ identity: { subjectType: "Trader" }, permissions: { functionPermissions: [] } }); render(<SalesInvoiceListScreen />);
    expect(screen.getByText("Bạn không có quyền xem chức năng này.")).toBeTruthy(); expect(read).not.toHaveBeenCalled();
  });

  it("opens the detail directly under the clicked row, as an accessible disclosure with four tabs", async () => {
    serve(); await openRow();
    const button = screen.getByRole("button", { name: rowButton }), row = button.closest("tr")!;
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(row.nextElementSibling?.querySelector("section")?.getAttribute("aria-label")).toBe("Chi tiết HD000123");
    expect(read.mock.calls.find((c) => c[0] === "detail")?.[1]).toEqual({ id: ids.invoice });
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Thông tin", "Lịch sử thanh toán", "Gửi hóa đơn", "Lịch sử chỉnh sửa"]);
    expect(screen.getByRole("table", { name: "Dòng hàng của hóa đơn" })).toBeTruthy(); expect(screen.getByText("Hàu sữa")).toBeTruthy();
    // The order the invoice was made from: a link in the list and in the detail; each line shows its unit and quantity.
    expect(screen.getAllByRole("link", { name: "DH000010" }).every((link) => link.getAttribute("href") === "/sales/orders?code=DH000010")).toBe(true);
    expect(screen.getAllByRole("link", { name: "DH000010" })).toHaveLength(2);
    expect(within(screen.getByRole("table", { name: "Dòng hàng của hóa đơn" })).getAllByRole("columnheader").map((h) => h.textContent)).toContain("Đơn vị");
    expect(screen.getByText("Giá đơn đặt hàng")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Lịch sử thanh toán" }));
    const payments = within(screen.getByRole("table", { name: "Thanh toán của hóa đơn" })); expect(payments.getByText("TT-001")).toBeTruthy(); expect(payments.getByText("Tiền mặt")).toBeTruthy(); expect(payments.getByText("Chờ xác nhận")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Gửi hóa đơn" })); expect(screen.getByText("Tin nhắn SMS")).toBeTruthy();
    fireEvent.click(button); expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("keeps create-return disabled, resends with an empty body, prints one invoice", async () => {
    serve(); await openRow();
    expect((screen.getByRole("button", { name: "Tạo phiếu trả hàng bán" }) as HTMLButtonElement).disabled).toBe(true);
    write.mockResolvedValue({ status: "success", data: sent(detail()) });
    write.mockImplementation(async (_a: string, _b: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(sent(detail())) }));
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại" }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith({ tone: "success", title: "Đã gửi lại hóa đơn cho khách." })); expect(write.mock.calls[0].slice(0, 2)).toEqual(["resend", {}]); expect(write.mock.calls[0][3]).toBe(ids.invoice);
    fireEvent.click(screen.getByRole("button", { name: "In" })); await waitFor(() => expect(download).toHaveBeenCalledWith({ id: ids.invoice }));
  });

  it("offers only the actions the API allows", async () => {
    serve({ detail: detail({ allowedActions: ["Print"] }) }); await openRow();
    expect(screen.queryByRole("button", { name: "Gửi lại" })).toBeNull(); expect(screen.queryByRole("button", { name: "Tạo phiếu trả hàng bán" })).toBeNull(); expect(screen.getByRole("button", { name: "In" })).toBeTruthy();
  });

  it("exports the list with the applied filters", async () => {
    serve(); render(<SalesInvoiceListScreen />); await screen.findByRole("button", { name: rowButton });
    fireEvent.click(screen.getByRole("button", { name: "Xuất file" }));
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    expect(download.mock.calls[0][0]).toMatchObject({ from: expect.any(String), to: expect.any(String) }); expect(download.mock.calls[0][0].page).toBeUndefined();
  });

  it("puts Chỉnh sửa (to the editor route) and Hủy in the footer of an invoice the caller may change; the edit tab keeps the history and the price cut", async () => {
    serve({ detail: detail({}, true) }); await openRow();
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" })); expect(push).toHaveBeenCalledWith(`/sales/invoices/${ids.invoice}/edit`);
    expect(screen.getByRole("button", { name: "Hủy hóa đơn" })).toBeTruthy(); expect(screen.queryByRole("button", { name: "Giảm giá sau khiếu nại" })).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Lịch sử chỉnh sửa" }));
    expect(screen.getByText("Sửa lỗi nhập liệu")).toBeTruthy(); expect(screen.getByRole("button", { name: "Giảm giá sau khiếu nại" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sửa hóa đơn" })).toBeNull();
  });

  it("shows neither Chỉnh sửa nor Hủy when the API does not allow them or the invoice is cancelled", async () => {
    serve({ detail: detail({ allowedActions: ["Print"] }, true) }); await openRow();
    expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull(); expect(screen.queryByRole("button", { name: "Hủy hóa đơn" })).toBeNull();
    cleanup(); vi.clearAllMocks(); workspace.mockReturnValue(owner); orderDetail.mockResolvedValue({ status: "error", httpStatus: 403, uncertain: false });
    serve({ detail: detail({ statusId: 3502, status: "Cancelled" }, true) }); await openRow();
    expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull(); expect(screen.queryByRole("button", { name: "Hủy hóa đơn" })).toBeNull();
  });
});

describe("cancel and price-cut dialogs", () => {
  const cancelled = () => detail({ statusId: 3502, status: "Cancelled", allowedActions: ["Print"], cancelReason: "Bán nhầm" }, true);
  async function openCancel() { serve({ detail: detail({}, true) }); await openRow(); fireEvent.click(screen.getByRole("button", { name: "Hủy hóa đơn" })); return screen.getByRole("dialog"); }

  it("warns that a completed order is reopened and says what happens to its advance", async () => {
    orderDetail.mockResolvedValue({ status: "success", data: { statusId: 4103 } });
    const dialog = await openCancel();
    expect(await within(dialog).findByText(/DH000010 đang Hoàn thành sẽ được mở lại, chuyển về Đang giao/)).toBeTruthy();
    expect(within(dialog).getByText(/Tiền ứng của đơn DH000010/)).toBeTruthy();
    expect(orderDetail.mock.calls[0][0]).toBe(ids.order);
  });

  it("does not warn about reopening when the order is still delivering", async () => {
    orderDetail.mockResolvedValue({ status: "success", data: { statusId: 4102 } });
    const dialog = await openCancel();
    await waitFor(() => expect(orderDetail).toHaveBeenCalled());
    expect(within(dialog).queryByText(/Đơn đặt hàng DH000010/)).toBeNull();
  });

  it("requires a reason, answers the 409 owed-back question, then cancels once with the confirmation flag", async () => {
    const dialog = await openCancel();
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy hóa đơn" })); expect(await within(dialog).findByText("Nhập lý do hủy hóa đơn.")).toBeTruthy(); expect(write).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Lý do hủy/), { target: { value: "Bán nhầm" } });
    write.mockResolvedValueOnce({ status: "error", httpStatus: 409, uncertain: false, invoiceConfirmation: { field: "confirmOwedBack", owedBackAmount: 120_000 } });
    write.mockImplementationOnce(async (_a: string, _b: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(sent(cancelled())) }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy hóa đơn" }));
    expect(await screen.findByText(/hợp tác xã sẽ nợ khách 120\.000/)).toBeTruthy();
    expect(write.mock.calls[0].slice(0, 2)).toEqual(["cancel", { reason: "Bán nhầm", rowVersion: "AAAA" }]);
    fireEvent.click(screen.getByRole("button", { name: "Vẫn hủy hóa đơn" }));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    expect(write.mock.calls[1][1]).toEqual({ reason: "Bán nhầm", rowVersion: "AAAA", confirmOwedBack: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Lý do hủy:")).toBeTruthy(); expect(screen.getByText("Bán nhầm")).toBeTruthy();
    expect(notify).toHaveBeenCalledWith({ tone: "success", title: "Đã hủy hóa đơn HD000123." });
  });

  it("does not replay an uncertain write: the button locks and offers a reload", async () => {
    const dialog = await openCancel();
    fireEvent.change(within(dialog).getByLabelText(/Lý do hủy/), { target: { value: "Bán nhầm" } });
    write.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy hóa đơn" }));
    expect(await within(dialog).findByText("Tải lại hóa đơn để đối chiếu")).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Hủy hóa đơn" }) as HTMLButtonElement).disabled).toBe(true); expect(write).toHaveBeenCalledTimes(1);
  });

  it("validates a price cut after a complaint and sends only the amount with the row version", async () => {
    serve({ detail: detail({}, true) }); await openRow(); fireEvent.click(screen.getByRole("tab", { name: "Lịch sử chỉnh sửa" })); fireEvent.click(screen.getByRole("button", { name: "Giảm giá sau khiếu nại" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Khoản giảm giá (₫)"), { target: { value: "50.000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu giảm giá" })); expect(await within(dialog).findByText("Nhập lý do giảm giá.")).toBeTruthy();
    expect(write).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(/Lý do giảm giá/), { target: { value: "Hàu nhỏ hơn thỏa thuận" } });
    write.mockImplementation(async (_a: string, _b: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(sent(detail({ priceCutTotal: 50_000 }, true))) }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu giảm giá" }));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    const [action, body, , id] = write.mock.calls[0];
    expect(action).toBe("correct"); expect(id).toBe(ids.invoice);
    expect(body).toEqual({ kind: "PriceCutAfterClaim", reason: "Hàu nhỏ hơn thỏa thuận", rowVersion: "AAAA", priceCutAmount: 50_000 });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(notify).toHaveBeenCalledWith({ tone: "success", title: "Đã ghi giảm giá sau khiếu nại cho hóa đơn HD000123." });
  });
});

describe("filter rail and search", () => {
  const lastQuery = () => read.mock.calls.filter((call) => call[0] === "list").at(-1)?.[1];

  it("sends the status, the collection state, the cash box and the code search to the list query", async () => {
    serve(); render(<SalesInvoiceListScreen />); await screen.findByRole("button", { name: rowButton });
    fireEvent.click(screen.getByRole("radio", { name: "Đã hủy" }));
    await waitFor(() => expect(lastQuery()).toMatchObject({ statusId: "3502" }));
    fireEvent.click(screen.getByRole("radio", { name: "Còn nợ" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Tôi thu, chưa được xác nhận" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm hóa đơn" }), { target: { value: " HD000123 " } });
    await waitFor(() => expect(lastQuery()).toMatchObject({ statusId: "3502", paid: "false", cashCollectedByMe: "true", code: "HD000123", page: "1" }));
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    await waitFor(() => expect((lastQuery() as { statusId?: string }).statusId).toBeUndefined());
  });

  it("finds a customer on the server and filters by it, then lets it go", async () => {
    serve(); render(<SalesInvoiceListScreen />); await screen.findByRole("button", { name: rowButton });
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm khách hàng" }), { target: { value: "Hùng" } });
    fireEvent.click(await screen.findByRole("button", { name: /Nguyễn Văn Hùng/ }));
    expect(customers).toHaveBeenCalledWith({ search: "Hùng", pageSize: "8" }, expect.anything());
    await waitFor(() => expect(lastQuery()).toMatchObject({ customerId: ids.customer }));
    fireEvent.click(screen.getByRole("button", { name: "Bỏ chọn tìm khách hàng" }));
    await waitFor(() => expect((lastQuery() as { customerId?: string }).customerId).toBeUndefined());
  });
});
