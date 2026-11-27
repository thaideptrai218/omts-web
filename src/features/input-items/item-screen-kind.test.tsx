// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  list: vi.fn(), detail: vi.fn(), movements: vi.fn(), seedLots: vi.fn(), groups: vi.fn(), push: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: state.push }) }));
vi.mock("@/features/purchase-documents/repository", () => ({ usePurchaseLookups: () => ({ vatCatalogue: { rates: [], legacy: false }, suppliers: [], items: [], rafts: [], receivers: [], loading: false, refresh: vi.fn() }) }));
vi.mock("./item-form-dialog", () => ({ ItemFormDialog: (props: { group?: string; kind?: string }) => <div role="dialog" aria-label="form">{`${props.kind}:${props.group}`}</div> }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  inputRepository: { list: state.list, detail: state.detail, movements: state.movements, seedLots: state.seedLots, groups: state.groups, units: vi.fn(), nextCode: vi.fn(), save: vi.fn(), exportList: vi.fn(), exportMovements: vi.fn(), template: vi.fn(), import: vi.fn() },
}));
import { ItemScreen } from "./item-screen";
import { ToastProvider } from "@/components/ui/toast-provider";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const units = [{ id: id(2), unitId: id(3), name: "mảnh", factor: 1, code: "GG000001-M", isBase: true, isUsed: true }];
const base = { itemGroupId: null, itemGroupName: null, unit: "mảnh", units, description: null, notes: null, photoUrl: null, minQuantity: null, maxQuantity: null, costPrice: 1000, lastPurchasePrice: null, onHand: 24, stockValue: 24000, isUsed: true,
  statusId: 101, status: "In Use", createdAt: "2026-11-10T00:00:00+07:00", createdBy: "Chủ", rowVersion: "v1" };
const seed = { ...base, id: id(1), code: "GG000001", name: "Hàu giống 3 cm", group: "Seed", productId: id(7), productName: "Hàu sữa", product: { id: id(7), code: "SP000001", name: "Hàu sữa" } };
const supply = { ...base, id: id(4), code: "VT000001", name: "Phao nhựa", group: "Material" };
const page = (items: unknown[]) => ({ status: "success", data: { items, page: 1, pageSize: 15, total: items.length, summary: { stockValue: 1 } } });

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.context.identity.subjectType = "CooperativeOwner";
  state.list.mockResolvedValue(page([seed]));
  state.detail.mockResolvedValue({ status: "success", data: { ...seed, photos: [], hasMovements: true, openingQuantity: null } });
  state.groups.mockResolvedValue({ status: "success", data: [] });
  state.movements.mockResolvedValue({ status: "success", data: { items: [], page: 1, pageSize: 15, total: 0, unit: "mảnh" } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = (kind: "Seed" | "Supply") => render(<ToastProvider><ItemScreen kind={kind} /></ToastProvider>);

it("fixes the Giống screen to the seed group: the list asks for kind and group Seed, there are no type pills and the product is a link", async () => {
  mount("Seed");
  await screen.findByText("Hàu giống 3 cm");
  expect(state.list.mock.calls[0][0]).toMatchObject({ kind: "Seed", group: "Seed", status: "InUse" });
  expect(screen.queryByRole("radio", { name: "Vật tư" })).toBeNull();
  expect(screen.queryByText("Loại hàng", { selector: "legend" })).toBeNull();
  const line = screen.getByText("Hàu giống 3 cm").closest("tr")!;
  expect(within(line).getByRole("link", { name: "Hàu sữa" }).getAttribute("href")).toBe("/sales/products?code=SP000001");
  expect(screen.getByRole("columnheader", { name: /Loại hàu bán ra/ })).toBeTruthy();
  expect(screen.getByLabelText("Tìm giống")).toBeTruthy();
});

it("creates a Giống item straight away with the Seed type, without a menu", async () => {
  mount("Seed");
  await screen.findByText("Hàu giống 3 cm");
  await userEvent.click(screen.getByRole("button", { name: /Tạo mới/ }));
  expect(screen.getByRole("dialog", { name: "form" }).textContent).toBe("Seed:Seed");
  expect(screen.queryByRole("menu")).toBeNull();
});

it("fixes the Vật tư screen to its kind: it asks for kind Supply, offers only Vật tư and Khác and has no product column", async () => {
  state.list.mockResolvedValue(page([supply]));
  mount("Supply");
  await screen.findByText("Phao nhựa");
  expect(state.list.mock.calls[0][0]).toMatchObject({ kind: "Supply" });
  expect(state.list.mock.calls[0][0].group).toBeUndefined();
  const pills = screen.getByRole("radio", { name: "Vật tư" }).closest("fieldset")!;
  expect(within(pills).getAllByRole("radio").map((radio) => (radio as HTMLInputElement).labels?.[0]?.textContent)).toEqual(["Tất cả", "Vật tư", "Khác"]);
  expect(screen.queryByRole("radio", { name: "Giống" })).toBeNull();
  expect(screen.queryByRole("columnheader", { name: /Loại hàu bán ra/ })).toBeNull();
  await userEvent.click(screen.getByRole("radio", { name: "Khác" }));
  await waitFor(() => expect(state.list.mock.calls.at(-1)![0]).toMatchObject({ kind: "Supply", group: "Other" }));
});

it("drops a Vật tư create menu with the two types of its kind", async () => {
  state.list.mockResolvedValue(page([supply]));
  mount("Supply");
  await screen.findByText("Phao nhựa");
  await userEvent.click(screen.getByRole("button", { name: /Tạo mới/ }));
  expect(within(screen.getByRole("menu")).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Vật tư", "Khác"]);
  await userEvent.click(screen.getByRole("menuitem", { name: "Khác" }));
  expect(screen.getByRole("dialog", { name: "form" }).textContent).toBe("Supply:Other");
});

it("opens the receipt of a seed from its row on the Nhập giống screen", async () => {
  mount("Seed");
  const line = (await screen.findByText("Hàu giống 3 cm")).closest("tr")!;
  await userEvent.click(within(line).getByRole("button", { name: /^Mở/ }));
  await userEvent.click(await screen.findByRole("button", { name: "Nhập giống" }));
  expect(state.push).toHaveBeenCalledWith(`/operations/seed-receipts/new?item=${id(1)}`);
});
