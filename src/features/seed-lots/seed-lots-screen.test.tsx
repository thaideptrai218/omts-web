// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "Staff", username: "nv" }, permissions: { functionPermissions: [] as { functionCode: string; action: string; dataScope?: string; scope?: unknown }[] } },
  list: vi.fn(), exportList: vi.fn(), detail: vi.fn(), push: vi.fn(), linked: "",
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.linked ? { code: state.linked } : {}), useRouter: () => ({ push: state.push }) }));
vi.mock("./repository", () => ({ seedLotRepository: { list: state.list, exportList: state.exportList, detail: state.detail } }));
vi.mock("@/features/input-issues/issue-access", () => ({ useZoneOptions: () => ({ zones: [{ id: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", code: "V01", name: "Vùng 1", inUse: true }], loading: false }) }));
vi.mock("@/features/purchase-documents/repository", async (original) => ({
  ...(await original<typeof import("@/features/purchase-documents/repository")>()),
  usePurchaseLookups: () => ({ suppliers: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08", code: "NCC000001", name: "Trại giống Vân Đồn", phone: "" }], rafts: [], receivers: [], loading: false, refresh: vi.fn(),
    items: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b09", code: "GG000001", name: "Hàu giống 3 cm", unit: "mảnh", group: "Seed", units: [] }, { id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b99", code: "VT000001", name: "Phao", unit: "cái", group: "Material", units: [] }] }),
}));
import { SeedLotsScreen } from "./seed-lots-screen";
import { ToastProvider } from "@/components/ui/toast-provider";
import { ids, seedLotDetailFixture, seedLotRowFixture } from "./seed-lot-test-fixtures";

const totals = { receivedQty: 1000, returnedQty: 100, nursingQty: 0, nurseryLossQty: 0, seededQty: 400, remainingQty: 500 };
const page = (items: unknown[] = [seedLotRowFixture()], patch: object = {}) => ({ status: "success", data: { items, page: 1, pageSize: 15, total: items.length, totals, ...patch } });
const owner = () => { state.context.identity.subjectType = "CooperativeOwner"; };
const grant = (...pairs: [string, string][]) => { state.context.permissions.functionPermissions = pairs.map(([functionCode, action]) => ({ functionCode, action, dataScope: "AssignedZone", scope: { kind: "all-zones" } })); };

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.linked = ""; state.context.identity.subjectType = "Staff"; state.context.permissions.functionPermissions = [];
  state.list.mockResolvedValue(page());
  state.detail.mockResolvedValue({ status: "success", data: seedLotDetailFixture() });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<ToastProvider><SeedLotsScreen /></ToastProvider>);

it("shows nothing and calls nothing to an account that may not read the receipts", async () => {
  mount();
  expect((await screen.findByRole("alert")).textContent).toContain("không có quyền");
  expect(state.list).not.toHaveBeenCalled();
});

it("lists the lots with every column of the plan, the totals, links by code and no action button on a closed row", async () => {
  owner(); mount();
  await screen.findByText("PN000004-1");
  expect(state.list.mock.calls[0][0]).toMatchObject({ sort: "code", sortDir: "desc", page: "1", pageSize: "15" });
  for (const heading of ["Mã lô giống", "Phiếu nhập", "Ngày nhập", "Nhà cung cấp", "Giống", "Sản phẩm", "Nhập", "Còn", "Tiến độ sử dụng", "Thu hoạch \\(kg\\)", "Đã bán \\(kg\\)"]) expect(screen.getByRole("columnheader", { name: new RegExp(`^${heading}`) })).toBeTruthy();
  const totalsRow = screen.getByRole("row", { name: "Tổng hợp theo bộ lọc" });
  expect(within(totalsRow).getByText("Tổng (1 lô)")).toBeTruthy();
  expect(within(totalsRow).getByText("1.000")).toBeTruthy();
  expect(within(totalsRow).getByText("500")).toBeTruthy();
  const line = screen.getByText("PN000004-1").closest("tr")!;
  expect(within(line).getByRole("link", { name: "PN000004" }).getAttribute("href")).toBe("/operations/seed-receipts?code=PN000004");
  expect(within(line).getByRole("link", { name: "Trại giống Vân Đồn" }).getAttribute("href")).toBe("/workspace/suppliers?code=NCC000001");
  expect(within(line).getByRole("link", { name: "Hàu giống 3 cm" }).getAttribute("href")).toBe("/inputs/seeds?code=GG000001");
  expect(within(line).getByRole("link", { name: "Hàu sữa" }).getAttribute("href")).toBe("/sales/products?code=SP000001");
  expect(within(line).getByText("10/11/2026 08:00")).toBeTruthy();
  expect(within(line).queryByText("Đang treo dở")).toBeNull();
  expect(screen.queryByRole("columnheader", { name: /^Trạng thái/ })).toBeNull();
  expect(within(line).getByRole("img", { name: /^Số nhập 1\.000 mảnh: .*Đã thả 400.*Còn kho 500.*Trả NCC 100/ })).toBeTruthy();
  expect(within(line).getByText("195,5 (ước tính)")).toBeTruthy();
  expect(within(line).getByText("120 (ước tính)")).toBeTruthy();
  expect(within(line).queryByRole("button", { name: /^(Ươm|Treo|Trả hàng)/ })).toBeNull();
});

it("sends every filter to the server, fixes nothing but what the user picks, and returns to page 1", async () => {
  owner(); mount();
  await screen.findByText("PN000004-1");
  const last = () => state.list.mock.calls.at(-1)![0];
  expect(screen.queryByLabelText("Trạng thái")).toBeNull();
  fireEvent.change(screen.getByLabelText("Nhà cung cấp"), { target: { value: ids.supplier } });
  await waitFor(() => expect(last()).toMatchObject({ supplierId: ids.supplier, page: "1" }));
  fireEvent.change(screen.getByLabelText("Giống"), { target: { value: ids.item } });
  await waitFor(() => expect(last()).toMatchObject({ itemId: ids.item }));
  expect(screen.getByLabelText("Giống").querySelectorAll("option")).toHaveLength(2);
  fireEvent.change(screen.getByLabelText("Vùng"), { target: { value: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11" } });
  await waitFor(() => expect(last()).toMatchObject({ zoneId: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11" }));
  fireEvent.change(screen.getByLabelText("Tìm lô giống"), { target: { value: "PN0000" } });
  await waitFor(() => expect(last()).toMatchObject({ search: "PN0000" }));
  expect(last()).toMatchObject({ supplierId: ids.supplier, itemId: ids.item });
  expect(last().state).toBeUndefined();
  fireEvent.click(screen.getByRole("button", { name: "Đặt lại" }));
  await waitFor(() => expect(last().supplierId).toBeUndefined());
});

it("sorts on the server by the three sortable columns", async () => {
  owner(); mount();
  await screen.findByText("PN000004-1");
  fireEvent.click(screen.getByRole("columnheader", { name: /^Còn/ }).querySelector("button")!);
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0]).toMatchObject({ sort: "remaining" }));
  fireEvent.click(screen.getByRole("columnheader", { name: /^Ngày nhập/ }).querySelector("button")!);
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0]).toMatchObject({ sort: "receivedAt" }));
});

it("opens the lot of a link by its exact code in the row and shows the code in the search box", async () => {
  owner(); state.linked = "pn000004-1";
  state.list.mockResolvedValue(page([seedLotRowFixture({ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0bff", seedLotCode: "PN000004-10" }), seedLotRowFixture()]));
  mount();
  expect((await screen.findByLabelText("Tìm lô giống") as HTMLInputElement).value).toBe("pn000004-1");
  await waitFor(() => expect(state.detail).toHaveBeenCalledTimes(1));
  expect(state.detail.mock.calls[0][0]).toBe(ids.line);
  expect(await screen.findByRole("region", { name: "Chi tiết PN000004-1" })).toBeTruthy();
});

it("shows the loading, empty, error and retry states", async () => {
  owner();
  state.list.mockResolvedValueOnce({ status: "error", httpStatus: 500, uncertain: false });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
  await screen.findByText("PN000004-1");
  cleanup();
  state.list.mockResolvedValue(page([], { total: 0 }));
  mount();
  expect(await screen.findByText(/Chưa có lô giống/)).toBeTruthy();
});

it("exports the filtered list only to an account that may export", async () => {
  owner(); state.exportList.mockResolvedValue({ status: "success", data: true }); mount();
  await screen.findByText("PN000004-1");
  fireEvent.change(screen.getByLabelText("Nhà cung cấp"), { target: { value: ids.supplier } });
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0]).toMatchObject({ supplierId: ids.supplier }));
  fireEvent.click(screen.getByRole("button", { name: /Xuất file/ }));
  await waitFor(() => expect(state.exportList).toHaveBeenCalledWith(expect.objectContaining({ supplierId: ids.supplier })));
  expect(state.exportList.mock.calls[0][0].page).toBeUndefined();
  cleanup();
  state.context.identity.subjectType = "Staff"; grant(["PURCHASE_RECEIPTS", "View"]);
  mount();
  await screen.findByText("PN000004-1");
  expect(screen.queryByRole("button", { name: /Xuất file/ })).toBeNull();
});
