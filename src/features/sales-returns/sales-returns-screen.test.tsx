// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "owner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string; dataScope?: string; scope?: unknown }[] } },
  list: vi.fn(), exportList: vi.fn(), detail: vi.fn(), cancel: vi.fn(), customers: vi.fn(), push: vi.fn(), notify: vi.fn(), linked: "",
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.linked ? { code: state.linked } : {}), useRouter: () => ({ push: state.push }) }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: state.notify }) }));
vi.mock("./repository", () => ({ returnRepository: { list: state.list, exportList: state.exportList, detail: state.detail, cancel: state.cancel, preview: vi.fn(), create: vi.fn() } }));
vi.mock("@/features/customers/repository", async (original) => ({ ...(await original<typeof import("@/features/customers/repository")>()), customerRepository: { list: state.customers } }));
vi.mock("@/features/zones-api/in-use-zones", async () => (await import("@/test/header-zone-rows")).inUseZonesMock);
import { SalesReturnsScreen } from "./sales-returns-screen";
import { ids, page, view } from "./return-test-fixtures";
import { HeaderZones, chooseHeaderZones, headerZoneIds } from "@/test/header-zones";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  chooseHeaderZones([]);
  state.linked = ""; state.context.identity.subjectType = "CooperativeOwner"; state.context.permissions.functionPermissions = [];
  state.list.mockResolvedValue({ status: "success", data: page() });
  state.detail.mockResolvedValue({ status: "success", data: view() });
  state.customers.mockResolvedValue({ status: "success", data: { items: [{ id: ids.customer, code: "KH000004", name: "Trần Văn Lái", phoneNumber: "0901234567" }], page: 1, pageSize: 8, total: 1 } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const mount = () => render(<HeaderZones><SalesReturnsScreen /></HeaderZones>);
const openRow = async () => { mount(); fireEvent.click(await screen.findByRole("button", { name: "Mở TL000001" })); return within(await screen.findByRole("region", { name: "Chi tiết TL000001" })); };
const last = () => state.list.mock.calls.at(-1)![0];
const staffWith = (...grants: [string, string][]) => { state.context.identity.subjectType = "Staff"; state.context.permissions.functionPermissions = grants.map(([functionCode, action]) => ({ functionCode, action, dataScope: "AssignedZone", scope: { kind: "all-zones" } })); };

describe("the list Trả hàng bán", () => {
  it("shows nothing and calls nothing to an account that may not read sales returns", () => {
    staffWith(["SALES_INVOICES", "View"]); mount();
    expect(screen.getByRole("alert").textContent).toContain("không có quyền");
    expect(state.list).not.toHaveBeenCalled();
  });
  it("lists the returns newest code first with every column, links to the invoice, order and customer, and the totals of the filtered returns", async () => {
    mount(); await screen.findByText("TL000001");
    expect(last()).toMatchObject({ sort: "code", sortDir: "desc", page: "1", pageSize: "10" });
    expect(last().from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const heading of ["Mã phiếu", "Thời gian", "Hóa đơn", "Đơn đặt hàng", "Khách hàng", "Vùng", "Giá trị", "Kg bán lại", "Kg hủy", "Trạng thái"]) expect(screen.getByRole("columnheader", { name: new RegExp(heading) })).toBeTruthy();
    const row = screen.getByText("TL000001").closest("tr")!;
    expect(within(row).getByText("17/11/2026 10:30")).toBeTruthy();
    expect(within(row).getByRole("link", { name: "HD000123" }).getAttribute("href")).toBe("/operations/sales-invoice-list?code=HD000123");
    expect(within(row).getByRole("link", { name: "DH000010" }).getAttribute("href")).toBe("/sales/orders?code=DH000010");
    expect(within(row).getByRole("link", { name: "Trần Văn Lái" }).getAttribute("href")).toBe("/workspace/customers?code=KH000004");
    expect(within(row).getByText("V01")).toBeTruthy();
    expect(within(row).getByText("4.250.000")).toBeTruthy();
    expect(within(row).getByText("Đã ghi nhận")).toBeTruthy();
    const totals = screen.getByRole("row", { name: "Tổng hợp theo bộ lọc" });
    expect(within(totals).getByText("Tổng (1 phiếu)")).toBeTruthy();
    expect(within(totals).getByText("4.250.000")).toBeTruthy();
    expect(within(totals).getByText("30")).toBeTruthy();
    expect(within(totals).getByText("20")).toBeTruthy();
    expect(within(row).queryByRole("button", { name: /Hủy|Xem hóa đơn/ })).toBeNull();
  });
  it("shows a walk-in customer and an invoice without an order as plain text", async () => {
    state.list.mockResolvedValue({ status: "success", data: page({ items: [{ ...page().items[0], customer: null, salesOrder: null, zoneCode: null }] }) });
    mount(); const row = (await screen.findByText("TL000001")).closest("tr")!;
    expect(within(row).getByText("Khách lẻ")).toBeTruthy();
    expect(within(row).queryByRole("link", { name: /^DH/ })).toBeNull();
  });
  it("sends every filter to the server and goes back to page 1", async () => {
    mount(); await screen.findByText("TL000001");
    fireEvent.click(screen.getByLabelText("Đã hủy"));
    await waitFor(() => expect(last()).toMatchObject({ statusId: "4102", page: "1" }));
    fireEvent.change(await screen.findByLabelText("Vùng nuôi", { selector: "select" }), { target: { value: headerZoneIds[1] } });
    await waitFor(() => expect(last()).toMatchObject({ zoneIds: headerZoneIds[1] }));
    fireEvent.change(screen.getByLabelText("Tìm phiếu trả hàng"), { target: { value: "HD000123" } });
    await waitFor(() => expect(last()).toMatchObject({ search: "HD000123" }));
    fireEvent.change(screen.getByLabelText("Tìm khách hàng"), { target: { value: "Trần" } });
    fireEvent.click(await screen.findByRole("button", { name: /Trần Văn Lái/ }));
    await waitFor(() => expect(last()).toMatchObject({ customerId: ids.customer }));
    fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
    await waitFor(() => expect(last().statusId).toBeUndefined());
    expect(last().customerId).toBeUndefined(); expect(last().zoneIds).toBe(headerZoneIds[1]);
  });
  it("follows the header zones: a subset is sent as zoneIds, the rail says so, and choosing a zone in the rail narrows the header", async () => {
    chooseHeaderZones([headerZoneIds[0], headerZoneIds[2]]); mount();
    await waitFor(() => expect(last()).toMatchObject({ zoneIds: `${headerZoneIds[0]},${headerZoneIds[2]}`, page: "1" }));
    const select = await screen.findByLabelText("Vùng nuôi", { selector: "select" }) as HTMLSelectElement;
    expect(select.selectedOptions[0].textContent).toBe("2 vùng đã chọn");
    fireEvent.change(select, { target: { value: "" } });
    await waitFor(() => expect(last().zoneIds).toBeUndefined());
    expect(JSON.parse(localStorage.getItem("omts.selected-zones.v1.header-zones-test")!)).toEqual({ kind: "all" });
  });
  it("sorts on the server by the header that was clicked", async () => {
    mount(); await screen.findByText("TL000001");
    fireEvent.click(screen.getByRole("button", { name: /Giá trị/ }));
    await waitFor(() => expect(last()).toMatchObject({ sort: "value", sortDir: "asc" }));
    fireEvent.click(screen.getByRole("button", { name: /Thời gian/ }));
    await waitFor(() => expect(last()).toMatchObject({ sort: "returnDate" }));
  });
  it("opens a linked return by its code among every date", async () => {
    state.linked = "TL000001"; mount();
    await waitFor(() => expect(state.list).toHaveBeenCalled());
    expect(state.list.mock.calls[0][0]).toMatchObject({ search: "TL000001" });
    expect(state.list.mock.calls[0][0].from).toBeUndefined();
    expect(await screen.findByRole("region", { name: "Chi tiết TL000001" })).toBeTruthy();
    expect(state.detail).toHaveBeenCalledWith(ids.ret, expect.anything());
  });
  it("exports the file with the same filters and no paging", async () => {
    state.exportList.mockResolvedValue({ status: "success", data: true }); mount(); await screen.findByText("TL000001");
    fireEvent.click(screen.getByLabelText("Đã hủy"));
    await waitFor(() => expect(last()).toMatchObject({ statusId: "4102" }));
    fireEvent.click(screen.getByRole("button", { name: /Xuất file/ }));
    await waitFor(() => expect(state.exportList).toHaveBeenCalled());
    expect(state.exportList.mock.calls[0][0]).toMatchObject({ statusId: "4102", sort: "code", sortDir: "desc" });
    expect(state.exportList.mock.calls[0][0].page).toBeUndefined(); expect(state.exportList.mock.calls[0][0].pageSize).toBeUndefined();
  });
  it("has no add button: a return is made from an invoice", async () => {
    mount(); await screen.findByText("TL000001");
    expect(screen.queryByRole("button", { name: /Thêm|Tạo/ })).toBeNull();
  });
  it("says so when no return matches, and offers a retry when the read fails instead of calling it empty", async () => {
    state.list.mockResolvedValue({ status: "success", data: page({ items: [], total: 0 }) });
    const { unmount } = mount();
    expect(await screen.findByText(/Chưa có phiếu trả hàng bán/)).toBeTruthy();
    unmount();
    state.list.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByText(/Chưa có phiếu trả hàng bán/)).toBeNull();
    state.list.mockResolvedValue({ status: "success", data: page() });
    fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));
    expect(await screen.findByText("TL000001")).toBeTruthy();
  });
});

describe("a return opened under its row", () => {
  it("has the tabs Thông tin and Lịch sử, the facts with their links, the lines with their outcome and the sums", async () => {
    const panel = await openRow();
    expect(panel.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Thông tin", "Lịch sử"]);
    expect(panel.getByRole("heading", { name: "TL000001" })).toBeTruthy();
    expect(panel.getByRole("link", { name: "HD000123" }).getAttribute("href")).toBe("/operations/sales-invoice-list?code=HD000123");
    expect(panel.getByRole("link", { name: "DH000010" }).getAttribute("href")).toBe("/sales/orders?code=DH000010");
    expect(panel.getByRole("link", { name: "KH000004" }).getAttribute("href")).toBe("/workspace/customers?code=KH000004");
    expect(panel.getByText("Chủ HTX")).toBeTruthy();
    const lines = within(panel.getByRole("table", { name: "Dòng hàng trả lại" }));
    expect(lines.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["#", "Sản phẩm", "Lô thu hoạch", "Số kg", "Xử lý"]);
    expect(lines.getByRole("link", { name: "LTH000007" }).getAttribute("href")).toBe("/farming/harvest-lots?code=LTH000007");
    expect(lines.getByText("Bán lại")).toBeTruthy(); expect(lines.getByText("Hủy bỏ")).toBeTruthy();
    expect(panel.getByText("Hàu chết nhiều")).toBeTruthy();
    for (const [label, value] of [["Hàng bán lại", "30 kg"], ["Hàng hủy bỏ", "20 kg"], ["Giá trị phiếu trả", "4.250.000"], ["Tính vào công nợ khách", "-4.250.000"]]) {
      expect(panel.getAllByText(label, { selector: "span" }).map((element) => element.parentElement!.textContent), label).toContain(`${label}${value}`);
    }
  });
  it("shows the stock of the lots that took the goods back, in red when cancelling would bring one below zero", async () => {
    const panel = await openRow();
    const lots = within(panel.getByRole("table", { name: "Kho lô sau khi bán lại" }));
    expect(lots.getByRole("link", { name: "LTH000007" }).getAttribute("href")).toBe("/farming/harvest-lots?code=LTH000007");
    expect(lots.getByText("12 kg")).toBeTruthy();
    expect(lots.getByText("-18 kg").className).toMatch(/danger/);
  });
  it("lists in the history when it was recorded, and who cancelled it and why", async () => {
    let panel = await openRow();
    fireEvent.click(panel.getByRole("tab", { name: "Lịch sử" }));
    expect(within(panel.getByRole("table", { name: "Lịch sử phiếu trả hàng" })).getAllByRole("row")).toHaveLength(2);
    cleanup();
    state.detail.mockResolvedValue({ status: "success", data: view({ statusId: 4102, status: "Cancelled", canCancel: false, cancelledAt: "2026-11-18T08:00:00+07:00", cancelledBy: { id: ids.user, name: "Chủ HTX" }, cancelReason: "Nhập nhầm" }) });
    panel = await openRow();
    expect(panel.getByText("Nhập nhầm")).toBeTruthy(); expect(panel.getByText("Đã hủy", { selector: "span, strong" })).toBeTruthy();
    expect(panel.queryByRole("table", { name: "Kho lô sau khi bán lại" })).toBeNull();
    fireEvent.click(panel.getByRole("tab", { name: "Lịch sử" }));
    const rows = within(panel.getByRole("table", { name: "Lịch sử phiếu trả hàng" })).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual(expect.arrayContaining([expect.stringContaining("Ghi nhận phiếu trả hàng"), expect.stringContaining("Hủy phiếu trả hàng")]));
    expect(rows[1].textContent).toContain("Nhập nhầm");
  });
  it("has a retry when the return cannot be read", async () => {
    state.detail.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false });
    mount(); fireEvent.click(await screen.findByRole("button", { name: "Mở TL000001" }));
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại phiếu" }));
    expect(await screen.findByRole("region", { name: "Chi tiết TL000001" })).toBeTruthy();
  });
  it("offers Xem hóa đơn to every viewer and Hủy phiếu only when the API allows the cancellation and the account may delete", async () => {
    let panel = await openRow();
    expect(panel.getByRole("button", { name: "Hủy phiếu" })).toBeTruthy();
    fireEvent.click(panel.getByRole("button", { name: "Xem hóa đơn" }));
    expect(state.push).toHaveBeenCalledWith("/operations/sales-invoice-list?code=HD000123");
    cleanup();
    state.detail.mockResolvedValue({ status: "success", data: view({ canCancel: false }) });
    panel = await openRow();
    expect(panel.queryByRole("button", { name: "Hủy phiếu" })).toBeNull();
    cleanup();
    state.detail.mockResolvedValue({ status: "success", data: view() });
    staffWith(["SALES_RETURNS", "View"]);
    panel = await openRow();
    expect(panel.queryByRole("button", { name: "Hủy phiếu" })).toBeNull();
    expect(panel.getByRole("button", { name: "Xem hóa đơn" })).toBeTruthy();
  });
});

describe("cancelling a return", () => {
  const dialogReason = async (text: string) => {
    const dialog = within(await screen.findByRole("dialog"));
    const submit = dialog.getByRole("button", { name: "Đồng ý" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(dialog.getByLabelText("Lý do"), { target: { value: text } });
    fireEvent.click(submit);
  };
  it("asks for the reason, sends it with the version, tells so and reloads the list", async () => {
    state.cancel.mockResolvedValue({ status: "success", data: view({ statusId: 4102, canCancel: false }) });
    const panel = await openRow(); const calls = state.list.mock.calls.length;
    fireEvent.click(panel.getByRole("button", { name: "Hủy phiếu" }));
    await dialogReason("Nhập nhầm");
    await waitFor(() => expect(state.notify).toHaveBeenCalledWith({ tone: "success", title: "Đã hủy phiếu trả hàng TL000001." }));
    expect(state.cancel).toHaveBeenCalledWith(ids.ret, { reason: "Nhập nhầm", rowVersion: "AAA1" });
    await waitFor(() => expect(state.list.mock.calls.length).toBeGreaterThan(calls));
  });
  it("asks again when taking the goods back would bring a lot below zero, and sends the answer with the same reason", async () => {
    state.cancel.mockResolvedValueOnce({ status: "error", httpStatus: 409, uncertain: false, invoiceConfirmation: { field: "confirmNegativeRemaining", lots: [{ lotCode: "LTH000007", remainingKg: -18 }] } });
    state.cancel.mockResolvedValueOnce({ status: "success", data: view({ statusId: 4102, canCancel: false }) });
    const panel = await openRow();
    fireEvent.click(panel.getByRole("button", { name: "Hủy phiếu" }));
    await dialogReason("Nhập nhầm");
    const question = within(await screen.findByRole("dialog"));
    expect(question.getByText(/LTH000007 \(-18 kg\)/)).toBeTruthy();
    fireEvent.click(question.getByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(state.notify).toHaveBeenCalled());
    expect(state.cancel).toHaveBeenCalledTimes(2);
    expect(state.cancel.mock.calls[1]).toEqual([ids.ret, { reason: "Nhập nhầm", rowVersion: "AAA1", confirmNegativeRemaining: true }]);
  });
  it("sends nothing more when the question is declined, and records nothing", async () => {
    state.cancel.mockResolvedValue({ status: "error", httpStatus: 409, uncertain: false, invoiceConfirmation: { field: "confirmNegativeRemaining", lots: [{ lotCode: "LTH000007", remainingKg: -18 }] } });
    const panel = await openRow();
    fireEvent.click(panel.getByRole("button", { name: "Hủy phiếu" }));
    await dialogReason("Nhập nhầm");
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Quay lại" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(state.cancel).toHaveBeenCalledTimes(1);
    expect(state.notify).not.toHaveBeenCalled();
  });
  it("shows a refusal in the row, not in a toast", async () => {
    state.cancel.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
    const panel = await openRow();
    fireEvent.click(panel.getByRole("button", { name: "Hủy phiếu" }));
    await dialogReason("Nhập nhầm");
    expect((await panel.findByRole("alert")).textContent).toMatch(/Trạng thái hiện tại không cho phép/);
    expect(state.notify).not.toHaveBeenCalled();
  });
});
