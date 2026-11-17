// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  list: vi.fn(), detail: vi.fn(), movements: vi.fn(), lots: vi.fn(), priceHistory: vi.fn(), groups: vi.fn(), linked: "",
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.linked ? { code: state.linked } : {}), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  productRepository: { list: state.list, detail: state.detail, movements: state.movements, lots: state.lots, priceHistory: state.priceHistory, groups: state.groups, nextCode: vi.fn(), save: vi.fn(), exportList: vi.fn(), template: vi.fn(), import: vi.fn() },
}));
import { ProductScreen } from "./product-screen";
import { ToastProvider } from "@/components/ui/toast-provider";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const units = [{ id: id(2), unitId: id(3), name: "kg", factor: 1, code: "SP000001-K", isBase: true, salePrice: 60000 }, { id: id(4), unitId: id(5), name: "Lồng", factor: 25, code: "SP000001-L", isBase: false, salePrice: 1400000 }];
const row = { id: id(1), code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v1", categoryId: null, categoryName: "Hàu sống", unit: "kg", units,
  description: null, note: null, photoUrl: null, minKg: null, maxKg: null, onHandKg: 500, isUsed: true, createdAt: "2026-11-10T00:00:00+07:00", createdBy: "Chủ" };
const view = { ...row, photos: [] };

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.linked = ""; state.context.identity.subjectType = "CooperativeOwner"; state.context.permissions.functionPermissions = [];
  state.list.mockResolvedValue({ status: "success", data: { items: [row], page: 1, pageSize: 15, total: 1, summary: { totalOnHandKg: 1234 } } });
  state.detail.mockResolvedValue({ status: "success", data: view });
  state.groups.mockResolvedValue({ status: "success", data: [] });
  state.movements.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 15, total: 0, unit: "kg" } });
  state.lots.mockResolvedValue({ status: "success", data: { productId: id(1), productCode: "SP000001", lots: [{ lotId: id(6), lotCode: "B1-20261110", zoneId: id(7), zoneCode: "Z1", raftCode: "B1-01", harvestDate: "2026-11-10", harvestedAt: "2026-11-10T08:30:00+07:00", lotStatusId: 1, harvestedKg: 500, soldKg: 0, disposedKg: 0, returnedKg: 0, remainingKg: 500 }], totalRemainingKg: 500 } });
  state.priceHistory.mockResolvedValue({ status: "success", data: [{ id: id(8), oldPrice: null, newPrice: 61000, changedAt: "2026-11-10T08:00:00+07:00", changedById: null, changedBy: "Chủ" }] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("shows the total on hand in kg and the create and import buttons to the Owner", async () => {
  render(<ToastProvider><ProductScreen /></ToastProvider>);
  await screen.findByText("Hàu sữa");
  expect(within(screen.getByRole("row", { name: "Tổng hợp theo bộ lọc" })).getByText("1.234 kg")).toBeTruthy();
  expect(screen.getByRole("button", { name: /Tạo mới/ })).toBeTruthy();
  expect(screen.getByRole("button", { name: /Import file/ })).toBeTruthy();
});

it("lets the unit under the name switch the code, the price and the quantity of the row", async () => {
  render(<ToastProvider><ProductScreen /></ToastProvider>);
  const line = (await screen.findByText("Hàu sữa")).closest("tr")!;
  expect(within(line).getByText("SP000001")).toBeTruthy();
  await userEvent.selectOptions(within(line).getByLabelText("Đơn vị SP000001"), id(4));
  expect(within(line).getByText("SP000001-L")).toBeTruthy();
  expect(within(line).getByText(/1\.400\.000/)).toBeTruthy();
  expect(within(line).getByText(/^20/)).toBeTruthy();
});

it("shows only the picked unit in the opened row: its code, its price, the quantity in that unit, no unit list, and its own price history", async () => {
  render(<ToastProvider><ProductScreen /></ToastProvider>);
  const line = (await screen.findByText("Hàu sữa")).closest("tr")!;
  await userEvent.selectOptions(within(line).getByLabelText("Đơn vị SP000001"), id(4));
  await userEvent.click(within(line).getByRole("button", { name: /Mở Hàu sữa/ }));
  const detail = await screen.findByRole("region", { name: "Chi tiết SP000001" });
  expect(within(detail).getAllByText("SP000001-L").length).toBeGreaterThan(0);
  expect(within(detail).getByText("1.400.000 đồng/Lồng")).toBeTruthy();
  expect(within(detail).getByText("20 Lồng")).toBeTruthy();
  expect(within(detail).queryByText(/= 25 kg/)).toBeNull();
  await userEvent.click(within(detail).getByRole("tab", { name: "Lịch sử giá" }));
  await waitFor(() => expect(state.priceHistory).toHaveBeenCalledWith(id(1), id(5), expect.anything()));
});

it("opens the row of a linked code with the five tabs and the price history", async () => {
  state.linked = "SP000001";
  render(<ToastProvider><ProductScreen /></ToastProvider>);
  const detail = await screen.findByRole("region", { name: "Chi tiết SP000001" });
  for (const name of ["Thông tin", "Mô tả, ghi chú", "Nhập – xuất", "Lô thu hoạch", "Lịch sử giá"]) expect(within(detail).getByRole("tab", { name })).toBeTruthy();
  await userEvent.click(within(detail).getByRole("tab", { name: "Lô thu hoạch" }));
  expect(await within(detail).findByRole("link", { name: "B1-20261110" })).toBeTruthy();
  expect(within(detail).getByText("B1-01")).toBeTruthy();
  expect(within(detail).getByText("10/11/2026 08:30")).toBeTruthy();
  await userEvent.click(within(detail).getByRole("tab", { name: "Nhập – xuất" }));
  expect(await within(detail).findByRole("button", { name: /Xuất file/ })).toBeTruthy();
  await userEvent.click(within(detail).getByRole("tab", { name: "Lô thu hoạch" }));
  await userEvent.click(within(detail).getByRole("tab", { name: "Lịch sử giá" }));
  await waitFor(() => expect(within(detail).getByText("61.000")).toBeTruthy());
  await userEvent.click(within(detail).getByRole("tab", { name: "Thông tin" }));
  expect(within(detail).getByRole("button", { name: /Ngừng bán/ })).toBeTruthy();
});

it("shows no screen to an account that may not see the catalogue", async () => {
  state.context.identity.subjectType = "Staff";
  render(<ToastProvider><ProductScreen /></ToastProvider>);
  expect((await screen.findByRole("alert")).textContent).toMatch(/không có quyền/);
  expect(state.list).not.toHaveBeenCalled();
});
