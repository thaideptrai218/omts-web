// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "Staff", username: "nv" }, permissions: { functionPermissions: [] as { functionCode: string; action: string; dataScope?: string; scope?: unknown }[] } },
  list: vi.fn(), exportList: vi.fn(), detail: vi.fn(), movements: vi.fn(), linked: "",
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.linked ? { code: state.linked } : {}), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./repository", () => ({ lotRepository: { list: state.list, exportList: state.exportList, detail: state.detail, movements: state.movements, weigh: vi.fn(), reopen: vi.fn(), close: vi.fn(), remove: vi.fn() } }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: vi.fn(async () => ({ status: "success", data: [{ id: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a22", code: "B1" }] })) }));
vi.mock("@/features/products/repository", () => ({ productRepository: { all: vi.fn(async () => ({ status: "success", data: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", code: "SP1", name: "Hàu sữa", statusId: 101 }] })) } }));
vi.mock("@/features/input-issues/issue-access", () => ({ useZoneOptions: () => ({ zones: [{ id: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", code: "DEMO-01", name: "Vùng 1", inUse: true }], loading: false }) }));
vi.mock("@/features/history/history-repository", () => ({ readRecordHistory: vi.fn(async () => ({ status: "success", data: [] })) }));
import { LotsScreen } from "./lots-screen";
import { ToastProvider } from "@/components/ui/toast-provider";
import { lotDetail } from "./lot-test-fixtures";

const zone = "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", lot = "122bb318-a72e-49aa-a8d7-a6169f889007";
const row = {
  id: lot, lotCode: "LTH000007", harvestedAt: "2026-11-17T08:00:00+07:00", harvestDate: "2026-11-17", zoneId: zone, zoneCode: "DEMO-01", raftId: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a22", raftCode: "B1", cycleId: null,
  products: [{ productId: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", code: "SP1", name: "Hàu sữa" }], cageCount: 4, estimatedKg: 200, weighedKg: 195.5, weighedAt: "2026-11-17T09:00:00+07:00",
  figures: { invoicedKg: 100, returnedKg: 0, soldKg: 95, remainingKg: 100.5, lostKg: 0 }, statusId: 2901, status: "Open", closeReason: null, harvestPlan: { id: zone, code: "KHT000003" },
};
const totals = { cageCount: 4, estimatedKg: 200, weighedKg: 195.5, soldKg: 95, remainingKg: 100.5, lostKg: 2 };
const page = (patch: object = {}) => ({ status: "success", data: { items: [row], page: 1, pageSize: 15, total: 1, totals, ...patch } });
const detail = lotDetail();
const owner = () => { state.context.identity.subjectType = "CooperativeOwner"; };

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.linked = ""; state.context.identity.subjectType = "Staff"; state.context.permissions.functionPermissions = [];
  state.list.mockResolvedValue(page());
  state.detail.mockResolvedValue({ status: "success", data: detail });
  state.movements.mockResolvedValue({ status: "success", data: [{ id: lot, occurredAt: "2026-11-17T10:00:00+07:00", kind: "LotClose", quantityKg: -3, productName: "Hàu sữa", productCode: "SP1" }] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<ToastProvider><LotsScreen /></ToastProvider>);

it("shows nothing and calls nothing to an account that may not read harvest records", async () => {
  mount();
  expect((await screen.findByRole("alert")).textContent).toContain("không có quyền");
  expect(state.list).not.toHaveBeenCalled();
});

it("lists lots newest code first with every column, the totals of the filtered lots and no action button on a closed row", async () => {
  owner(); mount();
  await screen.findByText("LTH000007");
  expect(state.list.mock.calls[0][0]).toMatchObject({ sort: "code", desc: "true", page: "1", pageSize: "15" });
  for (const heading of ["Mã lô", "Thời gian thu", "Vùng / bè", "Sản phẩm", "Lồng", "Kg ước tính", "Kg cân", "Đã bán", "Còn lại", "Hao hụt", "KHT", "Trạng thái"]) expect(screen.getByRole("columnheader", { name: new RegExp(heading) })).toBeTruthy();
  const totalsRow = screen.getByRole("row", { name: "Tổng hợp theo bộ lọc" });
  expect(within(totalsRow).getByText("Tổng (1 lô)")).toBeTruthy();
  expect(within(totalsRow).getByText("195,5")).toBeTruthy();
  expect(within(totalsRow).getByText("100,5")).toBeTruthy();
  const lotRow = screen.getByText("LTH000007").closest("tr")!;
  expect(within(lotRow).getByText("17/11/2026 08:00")).toBeTruthy();
  expect(within(lotRow).getByText("DEMO-01 / B1")).toBeTruthy();
  expect(within(lotRow).getByRole("link", { name: "KHT000003" }).getAttribute("href")).toBe("/farming/harvest-plans?code=KHT000003");
  expect(within(lotRow).getByText("Đang mở")).toBeTruthy();
  expect(within(lotRow).queryByRole("button", { name: /^(Cân|Đóng lô|Mở lại|Xóa|Chỉnh sửa)/ })).toBeNull();
});

it("sends every filter to the server and returns to page 1", async () => {
  owner(); mount();
  await screen.findByText("LTH000007");
  const last = () => state.list.mock.calls.at(-1)![0];
  fireEvent.click(screen.getByLabelText("Chờ cân"));
  await waitFor(() => expect(last()).toMatchObject({ statusId: "2904", page: "1" }));
  fireEvent.click(screen.getByLabelText("Chưa cân"));
  await waitFor(() => expect(last()).toMatchObject({ statusId: "2904", weighed: "false" }));
  fireEvent.click(screen.getByLabelText("Hư hỏng"));
  await waitFor(() => expect(last()).toMatchObject({ closeReason: "Spoiled" }));
  fireEvent.click(screen.getByLabelText("Không có KHT"));
  await waitFor(() => expect(last()).toMatchObject({ hasPlan: "false" }));
  fireEvent.change(screen.getByLabelText("Vùng", { selector: "select" }), { target: { value: zone } });
  await waitFor(() => expect(last()).toMatchObject({ zoneId: zone }));
  await waitFor(() => expect(screen.getByLabelText("Bè", { selector: "select" }).querySelector('option[value="5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a22"]')).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Bè", { selector: "select" }), { target: { value: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a22" } });
  await waitFor(() => expect(last()).toMatchObject({ raftId: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a22" }));
  await waitFor(() => expect(screen.getByLabelText("Sản phẩm", { selector: "select" }).querySelector('option[value="0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01"]')).toBeTruthy());
  fireEvent.change(screen.getByLabelText("Sản phẩm", { selector: "select" }), { target: { value: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01" } });
  await waitFor(() => expect(last()).toMatchObject({ productId: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01" }));
  fireEvent.change(screen.getByLabelText("Tìm lô thu hoạch"), { target: { value: "KHT000003" } });
  await waitFor(() => expect(last()).toMatchObject({ search: "KHT000003" }));
  // Changing the zone clears the raft.
  fireEvent.change(screen.getByLabelText("Vùng", { selector: "select" }), { target: { value: "" } });
  await waitFor(() => expect(last().raftId).toBeUndefined());
});

it("sorts on the server by the header that was clicked", async () => {
  owner(); mount();
  await screen.findByText("LTH000007");
  fireEvent.click(screen.getByRole("button", { name: /Còn lại/ }));
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0]).toMatchObject({ sort: "remainingKg", desc: "false" }));
});

it("opens a linked lot by its code among every status and date", async () => {
  owner(); state.linked = "LTH000007"; mount();
  await waitFor(() => expect(state.list).toHaveBeenCalled());
  const query = state.list.mock.calls[0][0];
  expect(query).toMatchObject({ search: "LTH000007" });
  expect(query.statusId).toBeUndefined(); expect(query.from).toBeUndefined();
  expect(await screen.findByRole("region", { name: "Chi tiết LTH000007" })).toBeTruthy();
  expect(state.detail).toHaveBeenCalledWith(lot, zone, expect.anything());
});

it("opens the row into four subtabs, with the sales history and only the buttons the API allows", async () => {
  owner(); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Mở LTH000007" }));
  const panel = await screen.findByRole("region", { name: "Chi tiết LTH000007" });
  expect(within(panel).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Thông tin", "Thu hoạch", "Bán hàng", "Lịch sử"]);
  expect(within(panel).getByRole("button", { name: /^Cân lại/ })).toBeTruthy();
  expect(within(panel).getByRole("button", { name: /Đóng lô/ })).toBeTruthy();
  expect(within(panel).queryByRole("button", { name: /Mở lại/ })).toBeNull();
  expect(within(panel).queryByRole("button", { name: /Xóa/ })).toBeNull();
  expect(within(panel).queryByRole("button", { name: /Chỉnh sửa/ })).toBeNull();
  fireEvent.click(within(panel).getByRole("tab", { name: "Bán hàng" }));
  expect(await within(panel).findByText("Đóng lô", { selector: "td" })).toBeTruthy();
  expect(state.movements).toHaveBeenCalledWith(lot, zone, expect.anything());
  fireEvent.click(within(panel).getByRole("tab", { name: "Lịch sử" }));
  expect(await within(panel).findByText("Chưa có thay đổi nào được ghi lại.")).toBeTruthy();
});

it("exports the file with the same filters and no paging", async () => {
  owner(); state.exportList.mockResolvedValue({ status: "success", data: true }); mount();
  await screen.findByText("LTH000007");
  fireEvent.click(screen.getByLabelText("Hư hỏng"));
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0]).toMatchObject({ closeReason: "Spoiled" }));
  fireEvent.click(screen.getByRole("button", { name: /Xuất file/ }));
  await waitFor(() => expect(state.exportList).toHaveBeenCalled());
  const query = state.exportList.mock.calls[0][0];
  expect(query).toMatchObject({ closeReason: "Spoiled", sort: "code", desc: "true" });
  expect(query.page).toBeUndefined(); expect(query.pageSize).toBeUndefined();
});

it("says so when no lot matches, and offers a retry when the read fails instead of calling it empty", async () => {
  owner(); state.list.mockResolvedValue(page({ items: [], total: 0 }));
  const { unmount } = mount();
  expect(await screen.findByText(/Chưa có lô thu hoạch/)).toBeTruthy();
  unmount();
  state.list.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: false });
  mount();
  await screen.findByRole("alert");
  expect(screen.queryByText(/Chưa có lô thu hoạch/)).toBeNull();
  expect(screen.getByRole("button", { name: "Tải lại" })).toBeTruthy();
});
