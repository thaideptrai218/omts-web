// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "owner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string; dataScope?: string; scope?: unknown }[] } },
  detail: vi.fn(), movements: vi.fn(), remove: vi.fn(), push: vi.fn(), notify: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: state.notify }) }));
vi.mock("./repository", () => ({ lotRepository: { detail: state.detail, movements: state.movements, remove: state.remove, weigh: vi.fn(), cages: vi.fn(async () => ({ status: "success", data: { lotId: "122bb318-a72e-49aa-a8d7-a6169f889007", lotCode: "LTH000007", rowVersion: "v1", canEdit: true, cages: [], products: [] } })), reopen: vi.fn(), close: vi.fn() } }));
vi.mock("@/features/history/history-repository", () => ({ readRecordHistory: vi.fn(async () => ({ status: "success", data: [] })) }));
vi.mock("@/features/cultivation-api/harvest-detail", () => ({ HarvestLotDetail: () => <p>Biểu mẫu sửa chuyến thu hoạch</p> }));
import { LotDetailPanel } from "./lot-detail";
import { ids, lotDetail } from "./lot-test-fixtures";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.context.identity.subjectType = "CooperativeOwner"; state.context.permissions.functionPermissions = [];
  state.detail.mockResolvedValue({ status: "success", data: lotDetail() });
  state.movements.mockResolvedValue({ status: "success", data: [] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const open = async (patch: Record<string, unknown> = {}, onRemoved = vi.fn()) => {
  state.detail.mockResolvedValue({ status: "success", data: lotDetail(patch) });
  render(<LotDetailPanel id={ids.lot} zoneId={ids.zone} onChanged={vi.fn()} onRemoved={onRemoved} />);
  return within(await screen.findByRole("region", { name: "Chi tiết LTH000007" }));
};
const hrefOf = (panel: ReturnType<typeof within>, name: string) => panel.getByRole("link", { name }).getAttribute("href");
const names = (panel: ReturnType<typeof within>) => panel.queryAllByRole("button").map((button: HTMLElement) => button.textContent?.trim()).filter((text: string | undefined) => text && !["Thông tin", "Thu hoạch", "Bán hàng", "Lịch sử"].includes(text));
const staffWith = (...grants: [string, string][]) => { state.context.identity.subjectType = "Staff"; state.context.permissions.functionPermissions = grants.map(([functionCode, action]) => ({ functionCode, action, dataScope: "AssignedZone", scope: { kind: "all-zones" } })); };

describe("lot detail, tab Thông tin", () => {
  it("shows the lot, its status and every fact with its link, in the layout of the invoice row", async () => {
    const panel = await open();
    expect(panel.getByRole("heading", { name: "LTH000007" })).toBeTruthy();
    expect(panel.getByText("Đang mở")).toBeTruthy();
    expect(panel.getByText("17/11/2026 08:00")).toBeTruthy();
    expect(panel.getByText("17/11/2026 09:00 · Cân viên")).toBeTruthy();
    expect(hrefOf(panel, "DEMO-01")).toContain("/farming/zones");
    expect(hrefOf(panel, "B1")).toContain("/farming/rafts");
    expect(hrefOf(panel, "Hành trình chu kỳ")).toBe(`/farming/cycles?zoneId=${ids.zone}&raftId=${ids.raft}&cycleId=${ids.cycle}&tab=journey`);
    expect(hrefOf(panel, "G-2026-01")).toBe("/operations/purchase-receipts?code=PN000004");
    const nursery = new URL(hrefOf(panel, "NU000002")!, "http://x");
    expect(nursery.pathname).toBe("/farming/nursery");
    expect(Object.fromEntries(nursery.searchParams)).toEqual({ code: "NU000002", zoneId: ids.zone });
    expect(hrefOf(panel, "KHT000003")).toBe("/farming/harvest-plans?code=KHT000003");
    expect(hrefOf(panel, "DH000001")).toBe("/sales/orders?code=DH000001");
    expect(hrefOf(panel, "Truy xuất lô")).toBe("/operations/lot-tracing?code=LTH000007");
    expect(panel.getByText("Chủ")).toBeTruthy();
  });
  it("lists the product lines with what was sold of each, and the sums of the lot", async () => {
    const panel = await open();
    const table = within(panel.getByRole("table", { name: "Dòng sản phẩm của lô" }));
    expect(table.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Sản phẩm", "Lồng", "Kg cân", "Đã bán", "Còn lại"]);
    const row = table.getByText("Hàu sữa").closest("tr")!;
    expect(within(row).getByRole("link", { name: "Hàu sữa" }).getAttribute("href")).toBe("/sales/products?code=SP1");
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Hàu sữaSP1", "4", "195,5", "95", "100,5"]);
    for (const [label, value] of [["Cân thực tế", "195,5 kg"], ["Đã bán", "95 kg"], ["Trả lại", "5 kg"], ["Hao hụt", "0 kg"], ["Còn lại", "100,5 kg"]]) {
      const line = panel.getAllByText(label, { selector: "span" }).map((element) => element.parentElement!).find((element) => element.textContent === `${label}${value}`);
      expect(line, label).toBeTruthy();
    }
    expect(panel.queryByText("Chênh lệch")).toBeNull();
    expect(panel.getByText("Số liệu chưa chốt vì lô còn đang bán.")).toBeTruthy();
  });
  it("shows the difference once the lot is final, with how it closed and the invoice that closed it as a link", async () => {
    const panel = await open({ statusId: 2903, status: "Closed", closeDate: "2026-11-18", closeReason: "SoldWholeLot", leftoverKg: 0, canClose: false, canWeigh: false,
      figures: { invoicedKg: 195.5, returnedKg: 0, soldKg: 195.5, remainingKg: 0, lostKg: 0, differenceKg: -4.5, notFinal: false }, references: { seedLots: [], salesOrders: [], closedByInvoice: { id: ids.invoice, code: "HD000009" } } });
    expect(panel.getByText("Chênh lệch")).toBeTruthy();
    expect(panel.getByText("18/11/2026 · Bán hết lô")).toBeTruthy();
    expect(hrefOf(panel, "HD000009")).toBe("/operations/sales-invoice-list?code=HD000009");
    expect(panel.getByText(/Đóng bởi hóa đơn/)).toBeTruthy();
  });
  it("says the lot is not weighed yet and offers no sale button for it", async () => {
    const panel = await open({ statusId: 2904, status: "AwaitingWeighing", weighedKg: null, weighedAt: null, weighedByName: null, productLines: [{ lineNumber: 1, productId: ids.product, productCode: "SP1", productName: "Hàu sữa", cageCount: 4, kg: 200 }], productStocks: [] });
    expect(panel.getAllByText("Chờ cân").length).toBeTruthy();
    expect(panel.getByText(/Chưa cân: lô chỉ được bán sau khi cân/)).toBeTruthy();
    expect(panel.getAllByText("Chưa cân").length).toBeGreaterThanOrEqual(1);
    expect(within(panel.getByRole("table", { name: "Dòng sản phẩm của lô" })).getAllByText("Chờ cân").length).toBeTruthy();
  });
  it("shows nothing sold or left for a lot that is not weighed yet, whose ledger is still zero", async () => {
    const panel = await open({ statusId: 2904, status: "AwaitingWeighing", weighedKg: null, productLines: [{ lineNumber: 1, productId: ids.product, productCode: "SP1", productName: "Hàu sữa", cageCount: 4, kg: 200 }], productStocks: [{ productId: ids.product, productCode: "SP1", productName: "Hàu sữa", harvestedKg: 0, soldKg: 0, returnedKg: 0, remainingKg: 0 }] });
    const row = within(panel.getByRole("table", { name: "Dòng sản phẩm của lô" })).getByText("Hàu sữa").closest("tr")!;
    expect(within(row).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["Hàu sữaSP1", "4", "Chờ cân", "—", "—"]);
  });
  it("shows a dash for a link the API did not give and an empty line table for a lot without lines", async () => {
    const panel = await open({ productLines: [], productStocks: [], harvestPlan: null, references: { seedLots: [], salesOrders: [] } });
    expect(panel.getByText("Lô chưa có dòng sản phẩm.")).toBeTruthy();
    expect(panel.queryByRole("link", { name: "KHT000003" })).toBeNull();
    expect(panel.queryByRole("link", { name: "DH000001" })).toBeNull();
  });
  it("shows a loading state and an error with a retry", async () => {
    state.detail.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false });
    render(<LotDetailPanel id={ids.lot} zoneId={ids.zone} onChanged={vi.fn()} onRemoved={vi.fn()} />);
    expect(screen.getByRole("status", { name: "Đang tải dữ liệu" })).toBeTruthy();
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại lô" }));
    expect(await screen.findByRole("region", { name: "Chi tiết LTH000007" })).toBeTruthy();
  });
});

describe("lot detail, buttons by status", () => {
  it("a lot waiting for its weighing: Cân thực tế and Chỉnh sửa, no sale button", async () => {
    const panel = await open({ statusId: 2904, status: "AwaitingWeighing", weighedKg: null, canWeigh: true, canCorrect: true, canClose: false });
    expect(names(panel)).toEqual(["Cân thực tế", "Chỉnh sửa"]);
  });
  it("an open lot with one order: Lập hóa đơn goes to the invoice editor of that order; Cân lại, Xuất hủy and Đóng lô follow", async () => {
    const panel = await open();
    expect(names(panel)).toEqual(["Lập hóa đơn", "Cân lại", "Xuất hủy", "Đóng lô"]);
    fireEvent.click(panel.getByRole("button", { name: "Lập hóa đơn" }));
    expect(state.push).toHaveBeenCalledWith(`/sales/invoices/new?order=${ids.orderA}&lot=${ids.lot}`);
    fireEvent.click(panel.getByRole("button", { name: "Xuất hủy" }));
    expect(state.push).toHaveBeenLastCalledWith(`/sales/disposals/new?lot=${ids.lot}&zone=${ids.zone}`);
  });
  it("several orders open a small menu to choose the order of the invoice", async () => {
    const panel = await open({ statusId: 2902, status: "Reopened", references: { seedLots: [], salesOrders: [{ id: ids.orderA, code: "DH000001" }, { id: ids.orderB, code: "DH000002" }] } });
    expect(panel.queryByRole("menu")).toBeNull();
    fireEvent.click(panel.getByRole("button", { name: "Lập hóa đơn" }));
    const menu = within(panel.getByRole("menu", { name: "Chọn đơn đặt hàng" }));
    expect(menu.getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Lập hóa đơn cho DH000001", "Lập hóa đơn cho DH000002"]);
    fireEvent.click(menu.getByRole("menuitem", { name: /DH000002/ }));
    expect(state.push).toHaveBeenCalledWith(`/sales/invoices/new?order=${ids.orderB}&lot=${ids.lot}`);
    expect(panel.queryByRole("menu")).toBeNull();
  });
  it("hides Lập hóa đơn without an order that can be invoiced (none, or only done and cancelled ones), because an invoice is made from an order", async () => {
    let panel = await open({ references: { seedLots: [], salesOrders: [] } });
    expect(panel.queryByRole("button", { name: "Lập hóa đơn" })).toBeNull();
    cleanup();
    panel = await open({ references: { seedLots: [], salesOrders: [{ id: ids.orderA, code: "DH000001", statusId: 4403 }, { id: ids.orderB, code: "DH000002", statusId: 4404 }] } });
    expect(panel.queryByRole("button", { name: "Lập hóa đơn" })).toBeNull();
    cleanup();
    panel = await open({ references: { seedLots: [], salesOrders: [{ id: ids.orderA, code: "DH000001", statusId: 4403 }, { id: ids.orderB, code: "DH000002", statusId: 4402 }] } });
    fireEvent.click(panel.getByRole("button", { name: "Lập hóa đơn" }));
    expect(state.push).toHaveBeenCalledWith(`/sales/invoices/new?order=${ids.orderB}&lot=${ids.lot}`);
  });
  it("offers no sale button for a lot with nothing left", async () => {
    const panel = await open({ figures: { invoicedKg: 195.5, returnedKg: 0, soldKg: 195.5, remainingKg: 0, lostKg: 0, differenceKg: 0, notFinal: true } });
    expect(names(panel)).toEqual(["Cân lại", "Đóng lô"]);
  });
  it("a closed lot: Mở lại when the API allows it", async () => {
    const panel = await open({ statusId: 2903, status: "Closed", canWeigh: false, canClose: false, canReopen: true, closeDate: "2026-11-18", closeReason: "Unsold", leftoverKg: 3 });
    expect(names(panel)).toEqual(["Mở lại"]);
    fireEvent.click(panel.getByRole("button", { name: "Mở lại" }));
    expect(screen.getByRole("dialog", { name: "Mở lại lô LTH000007" })).toBeTruthy();
  });
  it("a lot closed by an invoice has no Mở lại: the invoice is cancelled to reopen it", async () => {
    const panel = await open({ statusId: 2903, status: "Closed", canWeigh: false, canClose: false, canReopen: true, references: { seedLots: [], salesOrders: [], closedByInvoice: { id: ids.invoice, code: "HD000009" } } });
    expect(names(panel)).toEqual([]);
  });
  it("Đóng lô opens the confirmation to close the lot", async () => {
    const panel = await open();
    fireEvent.click(panel.getByRole("button", { name: "Đóng lô" }));
    expect(screen.getByRole("dialog", { name: "Đóng lô LTH000007" })).toBeTruthy();
  });
  it("Cân lại opens the weighing inline in the row", async () => {
    const panel = await open();
    fireEvent.click(panel.getByRole("button", { name: "Cân lại" }));
    expect(await screen.findByText("Cân thực tế lô LTH000007")).toBeTruthy();
  });
  it("every button is gated by the right of the account as well as the API flag", async () => {
    staffWith(["HARVESTS", "View"]);
    let panel = await open({ canRemove: true });
    expect(names(panel)).toEqual([]);
    cleanup();
    staffWith(["HARVESTS", "Edit"], ["SALES_INVOICES", "Create"]);
    panel = await open();
    expect(names(panel)).toEqual(["Lập hóa đơn", "Cân lại", "Đóng lô"]);
    cleanup();
    staffWith(["HARVESTS", "Edit"], ["PRODUCT_DISPOSALS", "Create"], ["HARVESTS", "Delete"]);
    panel = await open({ canRemove: true });
    expect(names(panel)).toEqual(["Xóa", "Cân lại", "Xuất hủy", "Đóng lô"]);
  });
  it("hides the buttons the API does not allow", async () => {
    const panel = await open({ canWeigh: false, canClose: false });
    expect(names(panel)).toEqual(["Lập hóa đơn", "Xuất hủy"]);
  });
  it("deletes the lot only after a reason, then tells so and leaves the row", async () => {
    state.remove.mockResolvedValue({ status: "success", data: { done: true } });
    const onRemoved = vi.fn(), panel = await open({ canRemove: true }, onRemoved);
    fireEvent.click(panel.getByRole("button", { name: "Xóa" }));
    const dialog = within(await screen.findByRole("dialog"));
    const submit = dialog.getByRole("button", { name: "Đồng ý" }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(dialog.getByLabelText("Lý do"), { target: { value: "Ghi nhầm" } });
    fireEvent.click(submit);
    await waitFor(() => expect(onRemoved).toHaveBeenCalled());
    expect(state.remove).toHaveBeenCalledWith(ids.lot, ids.zone, "Ghi nhầm", "v1");
    expect(state.notify).toHaveBeenCalledWith({ tone: "success", title: "Đã xóa lô LTH000007." });
  });
  it("shows the refusal of a delete in the tab, not in a toast", async () => {
    state.remove.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
    const panel = await open({ canRemove: true });
    fireEvent.click(panel.getByRole("button", { name: "Xóa" }));
    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.change(dialog.getByLabelText("Lý do"), { target: { value: "Ghi nhầm" } });
    fireEvent.click(dialog.getByRole("button", { name: "Đồng ý" }));
    expect((await panel.findByRole("alert")).textContent).toMatch(/Trạng thái hiện tại không cho phép/);
    expect(state.notify).not.toHaveBeenCalled();
  });
});

describe("lot detail, tab Thu hoạch", () => {
  it("shows the trip, the lanes with their share and the reason it went over the plan", async () => {
    const panel = await open();
    fireEvent.click(panel.getByRole("tab", { name: "Thu hoạch" }));
    const lanes = within(panel.getByRole("table", { name: "Làn thu hoạch" }));
    expect(lanes.getAllByRole("row").slice(1).map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent))).toEqual([["Làn 1", "Đã thu hết", "100%"], ["Làn 2", "Đang thu", "40%"]]);
    expect(panel.getByText("Khách thêm đơn")).toBeTruthy();
    expect(panel.getByText("50 kg/lồng")).toBeTruthy();
    expect(hrefOf(panel, "KHT000003")).toBe("/farming/harvest-plans?code=KHT000003");
  });
  it("offers Chỉnh sửa only when the API allows correcting the trip, and opens the form in the row", async () => {
    let panel = await open();
    fireEvent.click(panel.getByRole("tab", { name: "Thu hoạch" }));
    expect(panel.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
    cleanup();
    panel = await open({ canCorrect: true });
    fireEvent.click(panel.getByRole("tab", { name: "Thu hoạch" }));
    fireEvent.click(panel.getByRole("button", { name: "Chỉnh sửa" }));
    expect(await screen.findByText("Biểu mẫu sửa chuyến thu hoạch")).toBeTruthy();
  });
});

describe("lot detail, tab Bán hàng", () => {
  const movement = (patch: object) => ({ id: ids.lot, occurredAt: "2026-11-17T10:00:00+07:00", kind: "Sale", quantityKg: 20, productName: "Hàu sữa", productCode: "SP1", ...patch });
  it("links each document by its kind, the order of a sale and the customer", async () => {
    state.movements.mockResolvedValue({ status: "success", data: [
      movement({ id: ids.invoice, documentCode: "HD000009", salesOrderCode: "DH000001", partyName: "Trần Lái", partyCode: "KH000004", transactionPrice: 85000 }),
      movement({ id: ids.orderA, kind: "Return", documentCode: "TL000001", quantityKg: 5, partyName: "Trần Lái", partyCode: "KH000004" }),
      movement({ id: ids.orderB, kind: "Disposal", documentCode: "XH000002", quantityKg: -3, salesOrderCode: "DH000099" }),
      movement({ id: ids.plan, kind: "LotClose", quantityKg: -2, documentCode: null }),
    ] });
    const panel = await open();
    fireEvent.click(panel.getByRole("tab", { name: "Bán hàng" }));
    const table = within(await panel.findByRole("table", { name: "Bán hàng của lô" }));
    expect(table.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Thời gian", "Loại", "Chứng từ", "Đơn đặt hàng", "Sản phẩm", "Đối tác", "Số kg", "Đơn giá"]);
    expect(table.getByRole("link", { name: "HD000009" }).getAttribute("href")).toBe("/operations/sales-invoice-list?code=HD000009");
    expect(table.getByRole("link", { name: "TL000001" }).getAttribute("href")).toBe("/operations/sales-returns?code=TL000001");
    expect(table.getByRole("link", { name: "XH000002" }).getAttribute("href")).toBe("/sales/disposals?code=XH000002");
    // The order column belongs to sales only.
    expect(table.getAllByRole("link", { name: "DH000001" })).toHaveLength(1);
    expect(table.getByRole("link", { name: "DH000001" }).getAttribute("href")).toBe("/sales/orders?code=DH000001");
    expect(table.queryByText("DH000099")).toBeNull();
    expect(table.getAllByRole("link", { name: "Trần Lái" })[0].getAttribute("href")).toBe("/workspace/customers?code=KH000004");
    expect(table.getAllByRole("link", { name: "Hàu sữa" })[0].getAttribute("href")).toBe("/sales/products?code=SP1");
    const close = table.getByText("Đóng lô", { selector: "td" }).closest("tr")!;
    expect(within(close).queryByRole("link", { name: /^(HD|TL|XH)/ })).toBeNull();
  });
  it("says so when the lot has no movement, and retries a failed read instead of calling it empty", async () => {
    const panel = await open();
    fireEvent.click(panel.getByRole("tab", { name: "Bán hàng" }));
    expect(await panel.findByText("Lô chưa có lần bán hay xuất nào.")).toBeTruthy();
    cleanup();
    state.movements.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false });
    const again = await open();
    fireEvent.click(again.getByRole("tab", { name: "Bán hàng" }));
    fireEvent.click(await again.findByRole("button", { name: "Tải lại lịch sử bán" }));
    expect(await again.findByText("Lô chưa có lần bán hay xuất nào.")).toBeTruthy();
  });
  it("has no footer button: the movements cannot be exported by the browser", async () => {
    const panel = await open();
    fireEvent.click(panel.getByRole("tab", { name: "Bán hàng" }));
    await panel.findByText("Lô chưa có lần bán hay xuất nào.");
    expect(names(panel)).toEqual([]);
  });
});
