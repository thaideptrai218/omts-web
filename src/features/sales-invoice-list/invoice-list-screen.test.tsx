// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { detail, ids, listResult, sent } from "./invoice-list-test-fixtures";

const { read, write, download, workspace, zones } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), download: vi.fn(), workspace: vi.fn(), zones: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read, write, download }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: workspace }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: zones }));
vi.mock("@/features/customer-lookup/customer-search", () => ({ CustomerSearch: () => <p>Chọn khách hàng</p> }));
import { SalesInvoiceListScreen } from "./invoice-list-screen";

const owner = { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } };
type Replies = { list?: unknown; detail?: unknown };
/** Repository giả trả dữ liệu mẫu nhưng vẫn đi qua schema zod thật của hợp đồng. */
function serve({ list = listResult(), detail: det = detail() }: Replies = {}) {
  read.mockImplementation(async (action: string, _query: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(action === "list" ? list : det) }));
}
const openRow = async () => { render(<SalesInvoiceListScreen />); fireEvent.click(await screen.findByRole("button", { name: /Hóa đơn HD000123/ })); await screen.findByRole("tablist"); };

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  workspace.mockReturnValue(owner); zones.mockResolvedValue({ status: "success", data: [{ id: ids.zone, code: "VP01", name: "Vùng nuôi 1" }] });
  download.mockResolvedValue({ status: "success", data: true });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("SalesInvoiceListScreen", () => {
  it("lists invoices with Vietnamese labels only and the API totals", async () => {
    serve(); render(<SalesInvoiceListScreen />);
    const row = (await screen.findByRole("button", { name: /Hóa đơn HD000123/ })).closest("tr")!;
    expect(within(row).getByText("Hoàn thành")).toBeTruthy(); expect(within(row).getByText("Còn nợ")).toBeTruthy(); expect(within(row).getByText("Đã gửi")).toBeTruthy(); expect(within(row).getByText("Trả sau")).toBeTruthy();
    expect(screen.getByText("Số hóa đơn khớp bộ lọc").nextSibling?.textContent).toBe("1");
    expect(screen.getByText(/15\.800\.000/, { selector: "dd" })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/Completed|Cancelled|Sent|PayLater/);
    expect(read.mock.calls[0].slice(0, 2)).toMatchObject(["list", { from: expect.any(String), page: "1", pageSize: "20" }]);
  });

  it("shows an error with retry, and an empty state when nothing matches", async () => {
    read.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }); render(<SalesInvoiceListScreen />);
    expect(await screen.findByText("Chưa tải được danh sách hóa đơn")).toBeTruthy();
    serve({ list: { ...listResult([]), message: "No data", messageCode: "MSG-GEN-10" } }); fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Không có hóa đơn nào")).toBeTruthy(); expect(screen.queryByText("No data")).toBeNull();
  });

  it("denies a role without view permission and sends no request", () => {
    workspace.mockReturnValue({ identity: { subjectType: "Trader" }, permissions: { functionPermissions: [] } }); render(<SalesInvoiceListScreen />);
    expect(screen.getByText("Bạn chưa có quyền xem hóa đơn bán")).toBeTruthy(); expect(read).not.toHaveBeenCalled();
  });

  it("opens the detail directly under the clicked row, as an accessible disclosure with four tabs", async () => {
    serve(); await openRow();
    const button = screen.getByRole("button", { name: /Hóa đơn HD000123/ }), row = button.closest("tr")!;
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(row.nextElementSibling?.id).toBe(button.getAttribute("aria-controls"));
    expect(read.mock.calls.find((c) => c[0] === "detail")?.[1]).toEqual({ id: ids.invoice });
    expect(screen.getAllByRole("tab").map((t) => t.textContent)).toEqual(["Thông tin", "Thanh toán", "Gửi hóa đơn", "Chỉnh sửa"]);
    expect(screen.getByRole("table", { name: "Dòng hàng của hóa đơn" })).toBeTruthy(); expect(screen.getByText("Hàu sữa")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Thanh toán" }));
    const payments = within(screen.getByRole("table", { name: "Thanh toán của hóa đơn" })); expect(payments.getByText("TT-001")).toBeTruthy(); expect(payments.getByText("Tiền mặt")).toBeTruthy(); expect(screen.getByText("Chờ xác nhận")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Gửi hóa đơn" })); expect(screen.getByText("Tin nhắn SMS")).toBeTruthy();
    fireEvent.click(button); expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("keeps create-return disabled, resends with an empty body, prints one invoice", async () => {
    serve(); await openRow();
    expect((screen.getByRole("button", { name: "Tạo phiếu trả hàng bán" }) as HTMLButtonElement).disabled).toBe(true);
    write.mockResolvedValue({ status: "success", data: sent(detail()) });
    write.mockImplementation(async (_a: string, _b: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(sent(detail())) }));
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại" }));
    expect(await screen.findByText("Đã gửi lại hóa đơn cho khách.")).toBeTruthy(); expect(write.mock.calls[0].slice(0, 2)).toEqual(["resend", {}]); expect(write.mock.calls[0][3]).toBe(ids.invoice);
    fireEvent.click(screen.getByRole("button", { name: "In" })); await waitFor(() => expect(download).toHaveBeenCalledWith({ id: ids.invoice }));
  });

  it("offers only the actions the API allows", async () => {
    serve({ detail: detail({ allowedActions: ["Print"] }) }); await openRow();
    expect(screen.queryByRole("button", { name: "Gửi lại" })).toBeNull(); expect(screen.queryByRole("button", { name: "Tạo phiếu trả hàng bán" })).toBeNull(); expect(screen.getByRole("button", { name: "In" })).toBeTruthy();
  });

  it("exports the list with the applied filters", async () => {
    serve(); render(<SalesInvoiceListScreen />); await screen.findByRole("button", { name: /Hóa đơn HD000123/ });
    fireEvent.click(screen.getByRole("button", { name: "Xuất Excel danh sách" }));
    await waitFor(() => expect(download).toHaveBeenCalledTimes(1));
    expect(download.mock.calls[0][0]).toMatchObject({ from: expect.any(String), to: expect.any(String) }); expect(download.mock.calls[0][0].page).toBeUndefined();
  });

  it("hides Sửa / Hủy until the backend has the correction branch, then shows history and the buttons", async () => {
    serve(); await openRow(); fireEvent.click(screen.getByRole("tab", { name: "Chỉnh sửa" }));
    expect(screen.queryByRole("button", { name: "Hủy hóa đơn" })).toBeNull(); cleanup(); vi.clearAllMocks();
    workspace.mockReturnValue(owner); serve({ detail: detail({}, true) }); await openRow(); fireEvent.click(screen.getByRole("tab", { name: "Chỉnh sửa" }));
    expect(screen.getByText("Sửa lỗi nhập liệu")).toBeTruthy(); expect(screen.getByRole("button", { name: "Sửa hóa đơn" })).toBeTruthy(); expect(screen.getByRole("button", { name: "Hủy hóa đơn" })).toBeTruthy();
  });
});

describe("cancel and correction dialogs (need the unmerged OMTS-224 backend branch)", () => {
  const cancelled = () => detail({ statusId: 3502, status: "Cancelled", allowedActions: ["Print"], cancelReason: "Bán nhầm" }, true);
  async function openCancel() { serve({ detail: detail({}, true) }); await openRow(); fireEvent.click(screen.getByRole("tab", { name: "Chỉnh sửa" })); fireEvent.click(screen.getByRole("button", { name: "Hủy hóa đơn" })); return screen.getByRole("dialog"); }

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
    fireEvent.click(screen.getByRole("tab", { name: "Thông tin" })); expect(screen.getByText(/Hóa đơn đã hủy.*Lý do: Bán nhầm/)).toBeTruthy();
  });

  it("does not replay an uncertain write: the button locks and offers a reload", async () => {
    const dialog = await openCancel();
    fireEvent.change(within(dialog).getByLabelText(/Lý do hủy/), { target: { value: "Bán nhầm" } });
    write.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    fireEvent.click(within(dialog).getByRole("button", { name: "Hủy hóa đơn" }));
    expect(await within(dialog).findByText("Tải lại hóa đơn để đối chiếu")).toBeTruthy();
    expect((within(dialog).getByRole("button", { name: "Hủy hóa đơn" }) as HTMLButtonElement).disabled).toBe(true); expect(write).toHaveBeenCalledTimes(1);
  });

  it("validates a correction and sends the corrected lines with the row version", async () => {
    serve({ detail: detail({}, true) }); await openRow(); fireEvent.click(screen.getByRole("tab", { name: "Chỉnh sửa" })); fireEvent.click(screen.getByRole("button", { name: "Sửa hóa đơn" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Lý do sửa/), { target: { value: "Nhập sai kg" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu chỉnh sửa" })); expect(await within(dialog).findByText("Chưa có thay đổi nào so với hóa đơn hiện tại.")).toBeTruthy();
    fireEvent.change(within(dialog).getByLabelText("Dòng 1: số kg"), { target: { value: "125" } });
    write.mockImplementation(async (_a: string, _b: unknown, schema: { parse(v: unknown): unknown }) => ({ status: "success", data: schema.parse(sent(detail({ totalKg: 125 }, true))) }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu chỉnh sửa" }));
    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    const [action, body, , id] = write.mock.calls[0];
    expect(action).toBe("correct"); expect(id).toBe(ids.invoice);
    expect(body).toMatchObject({ kind: "DataEntryError", reason: "Nhập sai kg", rowVersion: "AAAA", discount: 0, otherCharges: 0, lines: [{ productId: ids.product, harvestLotId: ids.lot, kg: 125, unitPrice: 85_000 }] });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});

