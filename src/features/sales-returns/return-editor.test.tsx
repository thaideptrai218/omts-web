// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { detail as invoiceFixture, listResult, listRow } from "@/features/sales-invoice-list/invoice-list-test-fixtures";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "owner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string; dataScope?: string; scope?: unknown }[] } },
  preview: vi.fn(), create: vi.fn(), invoiceRead: vi.fn(), push: vi.fn(), notify: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/ui/toast-provider", () => ({ useToast: () => ({ notify: state.notify }) }));
vi.mock("./repository", () => ({ returnRepository: { preview: state.preview, create: state.create } }));
vi.mock("@/features/sales-invoice-list/use-invoice-list", () => ({ invoiceRepository: { read: state.invoiceRead } }));
vi.mock("@/features/customer-lookup/customer-search", () => ({
  CustomerSearch: ({ value, onSelect }: { value: { name: string } | null; onSelect(customer: { id: string; name: string; phoneNumber: string | null } | null): void }) =>
    value ? <p>Đã chọn {value.name}</p> : <button type="button" onClick={() => onSelect({ id: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0c", name: "Khách Mua", phoneNumber: null })}>Chọn Khách Mua</button>,
}));
import { ReturnEditorPage } from "./return-editor";
import { ids, preview, saved } from "./return-test-fixtures";

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });

const lotQuestion = { status: "error", httpStatus: 409, uncertain: false, invoiceConfirmation: { field: "thrownAwayLots", harvestLotId: ids.lotB, lotCode: "LTH000008", discardedKg: 20, remainingKg: 40 } };
function serveInvoice() {
  state.invoiceRead.mockImplementation(async (action: string, _query: unknown, schema: { parse(value: unknown): unknown }) => ({
    status: "success", data: schema.parse(action === "list" ? listResult([{ ...listRow, id: ids.invoice }]) : invoiceFixture({ id: ids.invoice })),
  }));
}
beforeEach(() => {
  state.context.identity.subjectType = "CooperativeOwner"; state.context.permissions.functionPermissions = [];
  serveInvoice();
  state.preview.mockResolvedValue({ status: "success", data: preview() });
  state.create.mockResolvedValue({ status: "success", data: saved() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const mount = (invoice = "HD000123") => render(<ReturnEditorPage invoice={invoice} />);
const loaded = async (invoice?: string) => { mount(invoice); await screen.findByRole("table", { name: "Dòng hàng của hóa đơn" }); };
const choose = (line: number, outcome: "Bán lại" | "Hủy bỏ") => fireEvent.click(within(screen.getByRole("radiogroup", { name: `Xử lý dòng ${line}` })).getByLabelText(outcome));
const fillReason = (text = "Hàu chết nhiều") => fireEvent.change(screen.getByLabelText(/Lý do trả hàng/), { target: { value: text } });
const complete = () => fireEvent.click(screen.getByRole("button", { name: "Hoàn thành" }));
const answerConfirm = async (name: "Đồng ý" | "Quay lại") => fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name }));
const asManager = () => { state.context.identity.subjectType = "Staff"; state.context.permissions.functionPermissions = [{ functionCode: "SALES_RETURNS", action: "Create", dataScope: "AssignedZone", scope: { kind: "all-zones" } }]; };
const lineBody = (a: string, b: string) => [{ invoiceLineId: ids.lineA, outcome: a }, { invoiceLineId: ids.lineB, outcome: b }];

describe("the editor page of a new return", () => {
  it("has its own page: back button and title with the search on the first row, the invoice lines on the left, the invoice and its money on the right", async () => {
    await loaded();
    expect(screen.getByRole("heading", { level: 1, name: "Tạo phiếu trả hàng" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Quay lại danh sách" }).getAttribute("href")).toBe("/operations/sales-returns");
    expect(screen.getByLabelText("Tìm dòng hàng")).toBeTruthy();
    expect(screen.getByText(/không trả một phần/)).toBeTruthy();
    const table = within(screen.getByRole("table", { name: "Dòng hàng của hóa đơn" }));
    expect(table.getAllByRole("columnheader").map((header) => header.textContent?.replace(/Tất cả bán lại · Tất cả hủy bỏ/, ""))).toEqual(["STT", "Tên hàng", "Lô thu hoạch", "kg", "Đơn giá", "Thành tiền", "Xử lý"]);
    expect(table.getByRole("link", { name: "LTH000007" }).getAttribute("href")).toBe("/farming/harvest-lots?code=LTH000007");
    expect(table.getByText("Closed")).toBeTruthy();
    expect(table.getByText("2.550.000")).toBeTruthy();
    const side = within(screen.getByRole("complementary", { name: "Thông tin phiếu trả hàng" }));
    expect(side.getByRole("link", { name: "HD000123" }).getAttribute("href")).toBe("/operations/sales-invoice-list?code=HD000123");
    expect(side.getByRole("link", { name: "DH000010" }).getAttribute("href")).toBe("/sales/orders?code=DH000010");
    expect(side.getByRole("link", { name: "Trần Văn Lái" }).getAttribute("href")).toBe("/workspace/customers?code=KH000004");
    expect(side.getByText("VP01")).toBeTruthy();
    expect(side.getByText(/KN000001 · .* · Accepted · Trả lại toàn bộ hàng/)).toBeTruthy();
    for (const [label, value] of [["Giá trị phiếu trả (2 dòng)", "4.250.000"], ["Công nợ hiện tại của khách", "1.000.000"], ["Công nợ sau phiếu trả", "-3.250.000"], ["Hợp tác xã nợ lại khách", "3.250.000"]]) {
      expect(side.getByText(label).parentElement!.textContent).toBe(`${label}${value}`);
    }
    expect(side.getByRole("button", { name: "Hoàn thành" })).toBeTruthy();
    expect(state.preview.mock.calls[0].slice(0, 2)).toEqual([ids.invoice, undefined]);
  });
  it("finds the invoice by its code among the invoices of that code, and takes an id as it is", async () => {
    await loaded();
    expect(state.invoiceRead.mock.calls.find((call) => call[0] === "list")![1]).toMatchObject({ code: "HD000123" });
    cleanup(); state.invoiceRead.mockClear(); state.preview.mockClear();
    await loaded(ids.invoice);
    expect(state.invoiceRead.mock.calls.some((call) => call[0] === "list")).toBe(false);
    expect(state.preview.mock.calls[0][0]).toBe(ids.invoice);
  });
  it("says so when no invoice has that code, and when the preview is refused, with a retry", async () => {
    state.invoiceRead.mockResolvedValue({ status: "success", data: listResult([]) });
    mount("HD999999");
    expect((await screen.findByRole("alert")).textContent).toMatch(/Không tìm thấy/);
    expect(state.preview).not.toHaveBeenCalled();
    cleanup(); serveInvoice();
    state.preview.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
    mount();
    expect((await screen.findByRole("alert")).textContent).toMatch(/Trạng thái hiện tại không cho phép/);
    fireEvent.click(screen.getByRole("button", { name: "Tải lại" }));
    expect(await screen.findByRole("table", { name: "Dòng hàng của hóa đơn" })).toBeTruthy();
  });
  it("still opens when the invoice itself may not be read: the preview has the lines, the value and the customer", async () => {
    state.invoiceRead.mockImplementation(async (action: string, _query: unknown, schema: { parse(value: unknown): unknown }) =>
      action === "list" ? { status: "success", data: schema.parse(listResult([{ ...listRow, id: ids.invoice }])) } : { status: "error", httpStatus: 403, uncertain: false });
    await loaded();
    const side = within(screen.getByRole("complementary", { name: "Thông tin phiếu trả hàng" }));
    expect(side.getByRole("link", { name: "HD000123" })).toBeTruthy();
    expect(side.queryByText("Hình thức thanh toán")).toBeNull();
  });
  it("shows nothing and calls nothing to an account that may not create a return", () => {
    state.context.identity.subjectType = "Staff"; state.context.permissions.functionPermissions = [{ functionCode: "SALES_RETURNS", action: "View", dataScope: "AssignedZone", scope: { kind: "all-zones" } }];
    mount();
    expect(screen.getByRole("alert").textContent).toMatch(/không có quyền/);
    expect(state.preview).not.toHaveBeenCalled(); expect(state.invoiceRead).not.toHaveBeenCalled();
  });
  it("searches the lines by product name or lot code", async () => {
    await loaded();
    fireEvent.change(screen.getByLabelText("Tìm dòng hàng"), { target: { value: "pacific" } });
    const table = within(screen.getByRole("table", { name: "Dòng hàng của hóa đơn" }));
    expect(table.queryByText("Hàu sữa")).toBeNull(); expect(table.getByText("Hàu Pacific")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm dòng hàng"), { target: { value: "LTH000007" } });
    expect(table.getByText("Hàu sữa")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm dòng hàng"), { target: { value: "zzz" } });
    expect(table.getByText("Không có dòng hàng phù hợp.")).toBeTruthy();
  });
});

describe("what the editor checks before it asks anything", () => {
  it("wants an outcome for every line, then a reason, and sends nothing until both are there", async () => {
    await loaded();
    complete();
    expect((await screen.findByRole("alert")).textContent).toBe("Chọn Bán lại hoặc Hủy bỏ cho từng dòng hàng.");
    choose(1, "Bán lại");
    expect(screen.getByText("1/2 dòng đã chọn cách xử lý.")).toBeTruthy();
    complete();
    expect(screen.getByRole("alert").textContent).toBe("Chọn Bán lại hoặc Hủy bỏ cho từng dòng hàng.");
    choose(2, "Hủy bỏ"); complete();
    expect(screen.getByRole("alert").textContent).toBe("Nhập lý do trả hàng.");
    fillReason("x".repeat(1001)); complete();
    expect(screen.getByRole("alert").textContent).toMatch(/tối đa 1000/);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(state.create).not.toHaveBeenCalled();
  });
  it("sets every line at once with Tất cả bán lại and Tất cả hủy bỏ", async () => {
    await loaded();
    fireEvent.click(screen.getByRole("button", { name: "Tất cả hủy bỏ" }));
    expect((within(screen.getByRole("radiogroup", { name: "Xử lý dòng 1" })).getByLabelText("Hủy bỏ") as HTMLInputElement).checked).toBe(true);
    expect((within(screen.getByRole("radiogroup", { name: "Xử lý dòng 2" })).getByLabelText("Hủy bỏ") as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tất cả bán lại" }));
    expect((within(screen.getByRole("radiogroup", { name: "Xử lý dòng 2" })).getByLabelText("Bán lại") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("2/2 dòng đã chọn cách xử lý.")).toBeTruthy();
  });
});

describe("saving the return", () => {
  it("the Owner confirms once, then the return is sent with every line and its outcome, the toast names the code and the money owed back, and the list opens on it", async () => {
    await loaded(); choose(1, "Bán lại"); choose(2, "Hủy bỏ"); fillReason(); complete();
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText(/Hoàn thành phiếu trả hàng 4\.250\.000 đ của hóa đơn HD000123\?.*chỉ Chủ hợp tác xã được hủy.*nợ lại khách 3\.250\.000 đ/)).toBeTruthy();
    expect(state.create).not.toHaveBeenCalled();
    fireEvent.click(dialog.getByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(state.push).toHaveBeenCalledWith("/operations/sales-returns?code=TL000001"));
    expect(state.create).toHaveBeenCalledTimes(1);
    expect(state.create).toHaveBeenCalledWith(ids.invoice, { reason: "Hàu chết nhiều", rowVersion: "INV1", lines: lineBody("BackForSale", "ThrownAway") });
    expect(state.notify).toHaveBeenCalledWith({ tone: "success", title: "Đã tạo phiếu trả hàng TL000001.", description: "Hợp tác xã nợ lại khách 3.250.000 đ." });
  });
  it("does not send when the confirmation is declined", async () => {
    await loaded(); choose(1, "Bán lại"); choose(2, "Bán lại"); fillReason(); complete();
    await answerConfirm("Quay lại");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(state.create).not.toHaveBeenCalled(); expect(state.notify).not.toHaveBeenCalled(); expect(state.push).not.toHaveBeenCalled();
  });
  it("a Zone Manager is asked whether the Owner agreed (MSG-CLAIM-04) and sends the answer with the return", async () => {
    asManager(); state.preview.mockResolvedValue({ status: "success", data: preview({ ownerMustAgree: true }) });
    await loaded(); choose(1, "Bán lại"); choose(2, "Bán lại"); fillReason(); complete();
    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText(/Chủ hợp tác xã đã đồng ý nhận lại toàn bộ hàng của hóa đơn HD000123 \(4\.250\.000 đ\) và quyết định lô nào bán lại chưa\?.*phiếu không được lưu/)).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(state.push).toHaveBeenCalled());
    expect(state.create.mock.calls[0][1]).toMatchObject({ ownerAgreed: true });
  });
  it("a Zone Manager who answers no sends nothing: the return is not saved", async () => {
    asManager(); state.preview.mockResolvedValue({ status: "success", data: preview({ ownerMustAgree: true }) });
    await loaded(); choose(1, "Bán lại"); choose(2, "Bán lại"); fillReason(); complete();
    await answerConfirm("Quay lại");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(state.create).not.toHaveBeenCalled();
  });
  it("asks the Owner question when the API asks it although the preview did not, and sends the same return again with the answer", async () => {
    state.create.mockResolvedValueOnce({ status: "error", httpStatus: 409, uncertain: false, invoiceConfirmation: { field: "ownerAgreed", returnValue: 4_250_000 } });
    await loaded(); choose(1, "Bán lại"); choose(2, "Bán lại"); fillReason(); complete();
    await answerConfirm("Đồng ý");
    await answerConfirm("Đồng ý");
    await waitFor(() => expect(state.push).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledTimes(2);
    expect(state.create.mock.calls[0][1].ownerAgreed).toBeUndefined(); expect(state.create.mock.calls[1][1]).toMatchObject({ ownerAgreed: true });
  });
  it("stops with a message when the API keeps asking the Owner question after it was answered", async () => {
    asManager(); state.preview.mockResolvedValue({ status: "success", data: preview({ ownerMustAgree: true }) });
    state.create.mockResolvedValue({ status: "error", httpStatus: 409, uncertain: false, invoiceConfirmation: { field: "ownerAgreed", returnValue: 4_250_000 } });
    await loaded(); choose(1, "Bán lại"); choose(2, "Bán lại"); fillReason(); complete();
    await answerConfirm("Đồng ý");
    expect((await screen.findByRole("alert")).textContent).toMatch(/Chủ hợp tác xã chưa được xác nhận đồng ý/);
    expect(state.create).toHaveBeenCalledTimes(1);
  });
  it("answers the question of a lot that is still for sale by closing it with the kg left and why, then sends the same return with the answer", async () => {
    state.create.mockResolvedValueOnce(lotQuestion);
    await loaded(); choose(1, "Bán lại"); choose(2, "Hủy bỏ"); fillReason(); complete();
    await answerConfirm("Đồng ý");
    const question = within(await screen.findByRole("dialog", { name: "Lô LTH000008 còn đang bán" }));
    expect(question.getByText(/hủy bỏ 20 kg của lô LTH000008, lô còn 40 kg đang để bán/)).toBeTruthy();
    fireEvent.click(question.getByLabelText("Đóng lô ngay"));
    expect((question.getByLabelText("Kg còn lại không bán") as HTMLInputElement).value).toBe("40");
    fireEvent.change(question.getByLabelText("Lý do còn lại", { selector: "select" }), { target: { value: "Spoiled" } });
    fireEvent.click(question.getByRole("button", { name: "Tiếp tục" }));
    await waitFor(() => expect(state.push).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledTimes(2);
    expect(state.create.mock.calls[1][1]).toEqual({ reason: "Hàu chết nhiều", rowVersion: "INV1", lines: lineBody("BackForSale", "ThrownAway"), thrownAwayLots: [{ harvestLotId: ids.lotB, stillForSale: false, leftoverKg: 40, closeReason: "Spoiled" }] });
  });
  it("keeps the lot for sale when the answer is Vẫn để bán, with no kg and no reason", async () => {
    state.create.mockResolvedValueOnce(lotQuestion);
    await loaded(); choose(1, "Bán lại"); choose(2, "Hủy bỏ"); fillReason(); complete();
    await answerConfirm("Đồng ý");
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Lô LTH000008 còn đang bán" })).getByRole("button", { name: "Tiếp tục" }));
    await waitFor(() => expect(state.push).toHaveBeenCalled());
    expect(state.create.mock.calls[1][1].thrownAwayLots).toEqual([{ harvestLotId: ids.lotB, stillForSale: true }]);
  });
  it("asks lot by lot and keeps every answer; stepping back from a question stops the save", async () => {
    const second = { ...lotQuestion, invoiceConfirmation: { ...lotQuestion.invoiceConfirmation, harvestLotId: ids.lotA, lotCode: "LTH000007", remainingKg: 5 } };
    state.create.mockResolvedValueOnce(lotQuestion).mockResolvedValueOnce(second);
    await loaded(); choose(1, "Hủy bỏ"); choose(2, "Hủy bỏ"); fillReason(); complete();
    await answerConfirm("Đồng ý");
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Lô LTH000008 còn đang bán" })).getByRole("button", { name: "Tiếp tục" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Lô LTH000007 còn đang bán" })).getByRole("button", { name: "Tiếp tục" }));
    await waitFor(() => expect(state.push).toHaveBeenCalled());
    expect(state.create).toHaveBeenCalledTimes(3);
    expect(state.create.mock.calls[2][1].thrownAwayLots).toEqual([{ harvestLotId: ids.lotB, stillForSale: true }, { harvestLotId: ids.lotA, stillForSale: true }]);
    cleanup(); vi.clearAllMocks(); serveInvoice(); state.preview.mockResolvedValue({ status: "success", data: preview() });
    state.create.mockResolvedValue(lotQuestion);
    await loaded(); choose(1, "Hủy bỏ"); choose(2, "Hủy bỏ"); fillReason(); complete();
    await answerConfirm("Đồng ý");
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Lô LTH000008 còn đang bán" })).getByRole("button", { name: "Quay lại" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(state.create).toHaveBeenCalledTimes(1); expect(state.push).not.toHaveBeenCalled(); expect(state.notify).not.toHaveBeenCalled();
  });
  it("shows a refusal in the form, not in a toast, and does not leave the page", async () => {
    state.create.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
    await loaded(); choose(1, "Bán lại"); choose(2, "Bán lại"); fillReason(); complete();
    await answerConfirm("Đồng ý");
    expect((await screen.findByRole("alert")).textContent).toMatch(/Trạng thái hiện tại không cho phép/);
    expect(state.notify).not.toHaveBeenCalled(); expect(state.push).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Hoàn thành" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("an invoice sold to a walk-in customer", () => {
  const walkIn = () => state.preview.mockImplementation(async (_id: string, customerId?: string) => ({
    status: "success", data: customerId ? preview({ requiresCustomer: true, customer: null, customerDebt: 0, debtAfter: -4_250_000, owedBackAfter: 4_250_000 }) : preview({ requiresCustomer: true, customer: null, customerDebt: null, debtAfter: null, owedBackAfter: 0 }),
  }));
  it("needs a customer profile before the return can be saved, and shows the debt once one is chosen", async () => {
    walkIn(); await loaded(); choose(1, "Bán lại"); choose(2, "Bán lại"); fillReason();
    const side = within(screen.getByRole("complementary", { name: "Thông tin phiếu trả hàng" }));
    expect(side.getByText("Khách lẻ")).toBeTruthy();
    expect(side.getByText("Công nợ hiện tại của khách").parentElement!.textContent).toBe("Công nợ hiện tại của khách—");
    complete();
    expect((await screen.findByRole("alert")).textContent).toMatch(/chọn hồ sơ khách hàng/);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(side.getByRole("button", { name: "Chọn Khách Mua" }));
    await waitFor(() => expect(state.preview).toHaveBeenLastCalledWith(ids.invoice, "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0c", expect.anything()));
    await waitFor(() => expect(side.getByText("Hợp tác xã nợ lại khách").parentElement!.textContent).toBe("Hợp tác xã nợ lại khách4.250.000"));
    expect(side.getByText("Công nợ sau phiếu trả").parentElement!.textContent).toBe("Công nợ sau phiếu trả-4.250.000");
    complete(); await answerConfirm("Đồng ý");
    await waitFor(() => expect(state.push).toHaveBeenCalled());
    expect(state.create.mock.calls[0][1]).toMatchObject({ customerId: "7c1d0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0c" });
  });
  it("sends no customer for an invoice that has one", async () => {
    await loaded(); choose(1, "Bán lại"); choose(2, "Bán lại"); fillReason(); complete(); await answerConfirm("Đồng ý");
    await waitFor(() => expect(state.push).toHaveBeenCalled());
    expect(state.create.mock.calls[0][1].customerId).toBeUndefined();
  });
});
