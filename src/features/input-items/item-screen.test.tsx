// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  list: vi.fn(), setVat: vi.fn(), detail: vi.fn(), movements: vi.fn(), seedLots: vi.fn(), groups: vi.fn(), linked: "",
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.linked ? { code: state.linked } : {}), useRouter: () => ({ push: vi.fn() }) }));
const vat = vi.hoisted(() => {
  const rate = (id: string, name: string, percent: number | null, patch: object = {}) => ({ id, name, percent, isExempt: percent === null, isSystem: percent === null, isDefault: false, active: true, sortOrder: 0, itemCount: 0, rowVersion: "v", ...patch });
  return { catalogue: { legacy: false, rates: [rate("rate-kct", "KCT", null), rate("rate-5", "5%", 5), rate("rate-8", "8%", 8), rate("rate-10", "10%", 10, { isDefault: true })] } };
});
vi.mock("@/features/vat-rates/use-vat-catalogue", () => ({ useVatCatalogue: () => ({ catalogue: vat.catalogue, loading: false }) }));
vi.mock("@/features/purchase-documents/repository", () => ({ usePurchaseLookups: () => ({ vatCatalogue: vat.catalogue, suppliers: [], items: [], rafts: [], receivers: [], loading: false, refresh: vi.fn() }) }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  inputRepository: { list: state.list, setPurchaseVat: state.setVat, detail: state.detail, movements: state.movements, seedLots: state.seedLots, groups: state.groups, units: vi.fn(), nextCode: vi.fn(), save: vi.fn(), exportList: vi.fn(), exportMovements: vi.fn(), template: vi.fn(), import: vi.fn() },
}));
import { ItemScreen } from "./item-screen";
import { ToastProvider } from "@/components/ui/toast-provider";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const units = [{ id: id(2), unitId: id(3), name: "cái", factor: 1, code: "VT000001-C", isBase: true, isUsed: true }, { id: id(4), unitId: id(5), name: "thùng", factor: 12, code: "VT000001-T", isBase: false, isUsed: false }];
const row = { id: id(1), code: "VT000001", name: "Phao nhựa", group: "Material", itemGroupId: null, itemGroupName: null, unit: "cái", units, description: null, notes: null, photoUrl: null, minQuantity: null, maxQuantity: null,
  costPrice: 1000, lastPurchasePrice: null, onHand: 24, stockValue: 24000, isUsed: true, statusId: 101, status: "In Use", createdAt: "2026-11-10T00:00:00+07:00", createdBy: "Chủ", rowVersion: "v1" };
const view = { ...row, photos: [], hasMovements: true, openingQuantity: null };
const grant = (...pairs: [string, string][]) => { state.context.permissions.functionPermissions = pairs.map(([functionCode, action]) => ({ functionCode, action })); };
const page = (patch: object = {}) => ({ status: "success", data: { items: [row], page: 1, pageSize: 15, total: 1, summary: { stockValue: 123456 }, ...patch } });

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.linked = ""; state.context.identity.subjectType = "CooperativeOwner"; grant();
  state.list.mockResolvedValue(page());
  state.detail.mockResolvedValue({ status: "success", data: view });
  state.groups.mockResolvedValue({ status: "success", data: [] });
  state.movements.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 15, total: 0, unit: "cái" } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("shows the summary of the stock value and the create and import buttons to the Owner", async () => {
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByText("Phao nhựa");
  const summary = screen.getByRole("row", { name: "Tổng hợp theo bộ lọc" });
  expect(within(summary).getByText("123.456")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Tạo mới/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Import file/ })).toBeTruthy();
});

it("hides create, import and export from a staff account that only views, and never uses the word kho", async () => {
  state.context.identity.subjectType = "Staff";
  grant(["PURCHASE_RECEIPTS", "View"]);
  const { container } = render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByText("Phao nhựa");
  expect(screen.queryByRole("button", { name: /Tạo mới/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Import file/ })).toBeNull();
  expect(screen.queryByRole("button", { name: /Xuất file/ })).toBeNull();
  expect(/(^|\s)kho(\s|$)/i.test(container.textContent ?? "")).toBe(false);
});

it("shows no screen to an account that may not see the catalogue", async () => {
  state.context.identity.subjectType = "Staff";
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  expect((await screen.findByRole("alert")).textContent).toMatch(/không có quyền/);
  expect(state.list).not.toHaveBeenCalled();
});

it("converts what is left and the cost into the unit picked for the row", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByText("Phao nhựa");
  const line = screen.getByText("Phao nhựa").closest("tr")!;
  expect(within(line).getByText("1.000")).toBeTruthy();
  expect(within(line).getByText("24")).toBeTruthy();
  await user.selectOptions(within(line).getByLabelText("Đơn vị VT000001"), id(4));
  expect(within(line).getByText("12.000")).toBeTruthy();
  expect(within(line).getByText("2")).toBeTruthy();
});

it("shows only the picked unit in the opened row: its code, cost and quantity, with no unit list", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  const line = (await screen.findByText("Phao nhựa")).closest("tr")!;
  await user.selectOptions(within(line).getByLabelText("Đơn vị VT000001"), id(4));
  await user.click(within(line).getByRole("button", { name: /Mở Phao nhựa/ }));
  const detail = await screen.findByRole("region", { name: "Chi tiết VT000001" });
  expect(within(detail).getByText("VT000001-T")).toBeTruthy();
  expect(within(detail).getByText("12.000 / thùng")).toBeTruthy();
  expect(within(detail).getByText("2 thùng")).toBeTruthy();
  expect(within(detail).queryByText("VT000001-C")).toBeNull();
});

it("searches a linked item by its code among every status", async () => {
  state.linked = "VT000001";
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByRole("tablist");
  expect(state.list.mock.calls[0][0]).toMatchObject({ search: "VT000001", status: "All" });
  expect((screen.getByLabelText("Tìm hàng") as HTMLInputElement).value).toBe("VT000001");
});

it("does not describe a failed read as an empty list", async () => {
  state.list.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByRole("alert");
  expect(screen.queryByText("Chưa có vật tư hay giống nào.")).toBeNull();
});

it("loads the movements of the item on the Nhập – xuất tab", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await user.click(await screen.findByText("Phao nhựa"));
  await user.click(await screen.findByRole("tab", { name: "Nhập – xuất" }));
  await waitFor(() => expect(state.movements).toHaveBeenCalled());
  expect(state.movements.mock.calls[0][0]).toBe(id(1));
  expect(screen.queryByRole("tab", { name: "Lô giống" })).toBeNull();
});

it("offers the seed lots tab only for a seed item", async () => {
  state.detail.mockResolvedValue({ status: "success", data: { ...view, group: "Seed" } });
  state.seedLots.mockResolvedValue({ status: "success", data: { lots: [], unlottedQuantity: 0, suggestedLotId: null, unit: "con" } });
  const user = userEvent.setup();
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await user.click(await screen.findByText("Phao nhựa"));
  await user.click(await screen.findByRole("tab", { name: "Lô giống" }));
  await waitFor(() => expect(state.seedLots).toHaveBeenCalledWith(id(1), expect.anything()));
});

const seedRow = { ...row, id: id(9), code: "GG000001", name: "Hàu giống 3 cm", group: "Seed", purchaseVatRateId: "rate-kct", purchaseVatRateName: "KCT", purchaseVatPercent: null };

it("shows the VAT mua vào of each item, KCT for a seed and a dash when the API sends none, and filters the list by it", async () => {
  state.list.mockResolvedValue(page({ items: [{ ...row, purchaseVatRateId: "rate-8", purchaseVatRateName: "8%", purchaseVatPercent: 8 }, seedRow, { ...row, id: id(8), code: "VT000002", name: "Dây thừng" }], total: 3 }));
  const user = userEvent.setup();
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByText("Phao nhựa");
  expect(within(screen.getByText("Phao nhựa").closest("tr")!).getByText("8%")).toBeTruthy();
  expect(within(screen.getByText("Hàu giống 3 cm").closest("tr")!).getByText("KCT")).toBeTruthy();
  expect(within(screen.getByText("Dây thừng").closest("tr")!).getByText("—")).toBeTruthy();
  await user.selectOptions(screen.getByLabelText("VAT mua vào"), "rate-10");
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0]).toMatchObject({ purchaseVatRateId: "rate-10" }));
});

it("changes the VAT mua vào of the ticked items at once, leaves a seed unticked, and tells it with a toast", async () => {
  state.list.mockResolvedValue(page({ items: [{ ...row, purchaseVatRateId: "rate-10", purchaseVatRateName: "10%", purchaseVatPercent: 10 }, seedRow, { ...row, id: id(8), code: "VT000002", name: "Dây thừng", purchaseVatRateId: "rate-10", purchaseVatRateName: "10%", purchaseVatPercent: 10 }], total: 3 }));
  state.setVat.mockResolvedValue({ status: "success", data: { updated: 2 } });
  const user = userEvent.setup();
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByText("Phao nhựa");
  expect((screen.getByLabelText("Chọn Hàu giống 3 cm") as HTMLInputElement).disabled).toBe(true);
  expect(screen.queryByRole("region", { name: "Thao tác hàng loạt" })).toBeNull();
  await user.click(screen.getByLabelText("Chọn tất cả trên trang"));
  expect(within(screen.getByRole("region", { name: "Thao tác hàng loạt" })).getByText("Đã chọn 2")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Đổi VAT mua vào" }));
  const dialog = await screen.findByRole("dialog");
  await user.selectOptions(within(dialog).getByLabelText("VAT mua vào"), "rate-8");
  await user.click(within(dialog).getByRole("button", { name: "Thay đổi" }));
  await waitFor(() => expect(state.setVat).toHaveBeenCalledWith([id(1), id(8)], "rate-8", vat.catalogue));
  expect(await screen.findByText("Đã đổi VAT mua vào của 2 vật tư thành 8%.")).toBeTruthy();
  await waitFor(() => expect(screen.queryByRole("region", { name: "Thao tác hàng loạt" })).toBeNull());
});

it("keeps the dialog open with the message when the bulk change fails, and offers no bulk change to a staff account", async () => {
  state.setVat.mockResolvedValue({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false });
  const user = userEvent.setup();
  const { unmount } = render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByText("Phao nhựa");
  await user.click(screen.getByLabelText("Chọn Phao nhựa"));
  await user.click(screen.getByRole("button", { name: "Đổi VAT mua vào" }));
  await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Thay đổi" }));
  expect((await within(screen.getByRole("dialog")).findByRole("alert")).textContent).toMatch(/chưa hợp lệ/);
  unmount();
  state.context.identity.subjectType = "Staff";
  grant(["PURCHASE_RECEIPTS", "View"]);
  render(<ToastProvider><ItemScreen /></ToastProvider>);
  await screen.findByText("Phao nhựa");
  expect(screen.queryByLabelText("Chọn Phao nhựa")).toBeNull();
});
