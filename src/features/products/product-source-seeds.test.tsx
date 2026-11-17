// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  list: vi.fn(), detail: vi.fn(), groups: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  productRepository: { list: state.list, detail: state.detail, groups: state.groups, movements: vi.fn(), lots: vi.fn(), priceHistory: vi.fn(), nextCode: vi.fn(), save: vi.fn(), exportList: vi.fn(), template: vi.fn(), import: vi.fn() },
}));
import { ProductScreen } from "./product-screen";
import { productView } from "./contracts";
import { ToastProvider } from "@/components/ui/toast-provider";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const units = [{ id: id(2), unitId: id(3), name: "kg", factor: 1, code: "SP000001-K", isBase: true, salePrice: 60000 }];
const row = { id: id(1), code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v1", categoryId: null, categoryName: null, unit: "kg", units,
  description: null, note: null, photoUrl: null, minKg: null, maxKg: null, onHandKg: 500, isUsed: true, createdAt: "2026-11-10T00:00:00+07:00", createdBy: "Chủ" };

beforeEach(() => {
  try { window.localStorage.clear(); } catch { /* storage may be unavailable */ }
  state.list.mockResolvedValue({ status: "success", data: { items: [row], page: 1, pageSize: 15, total: 1, summary: { totalOnHandKg: 1 } } });
  state.groups.mockResolvedValue({ status: "success", data: [] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function open(view: object) {
  state.detail.mockResolvedValue({ status: "success", data: productView.parse(view) });
  render(<ToastProvider><ProductScreen /></ToastProvider>);
  await userEvent.click(await screen.findByRole("button", { name: /^Mở Hàu sữa/ }));
  return screen.findByRole("region", { name: "Chi tiết SP000001" });
}

it("shows the seeds a product comes from as links to the Giống screen, by code", async () => {
  const panel = await open({ ...row, photos: [], sourceSeeds: [{ id: id(8), code: "GG000001", name: "Hàu giống 3 cm" }, { id: id(9), code: "GG000002", name: "Hàu giống 5 cm" }] });
  const fact = within(panel).getByText("Giống nguồn").closest("div")!;
  expect(within(fact).getByRole("link", { name: /Hàu giống 3 cm/ }).getAttribute("href")).toBe("/inputs/seeds?code=GG000001");
  expect(within(fact).getByRole("link", { name: /Hàu giống 5 cm/ }).getAttribute("href")).toBe("/inputs/seeds?code=GG000002");
});

it("shows a dash when no seed grows into the product, and when the API sends none", async () => {
  const empty = await open({ ...row, photos: [], sourceSeeds: [] });
  expect(within(within(empty).getByText("Giống nguồn").closest("div")!).getByText("—")).toBeTruthy();
  cleanup();
  const missing = await open({ ...row, photos: [] });
  expect(within(within(missing).getByText("Giống nguồn").closest("div")!).queryByRole("link")).toBeNull();
});
