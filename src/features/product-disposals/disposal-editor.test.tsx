// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const ids = { zoneA: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", zoneB: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01",
  base: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02", lotA: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b04", lotB: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", doc: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06" };
const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "owner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  push: vi.fn(), save: vi.fn(), all: vi.fn(), lots: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/products/repository", async (original) => ({
  ...(await original<typeof import("@/features/products/repository")>()),
  disposalRepository: { save: state.save, detail: vi.fn(), complete: vi.fn(), remove: vi.fn() },
  productRepository: { all: state.all, lots: state.lots },
}));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: vi.fn(async () => ({ status: "success", data: [
  { id: ids.zoneA, code: "DEMO-01", name: "Vùng 1", statusId: 101 }, { id: ids.zoneB, code: "DEMO-02", name: "Vùng 2", statusId: 101 }] })) }));
import { DisposalEditorPage } from "./disposal-editor";
import { ToastProvider } from "@/components/ui/toast-provider";

const product = { id: ids.product, code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x",
  units: [{ id: ids.base, unitId: ids.base, name: "kg", factor: 1, code: "SP000001-K", isBase: true }] };
const lots = { productId: ids.product, productCode: "SP000001", totalRemainingKg: 150, lots: [
  { lotId: ids.lotA, lotCode: "B1-LOT", zoneId: ids.zoneA, zoneCode: "DEMO-01", harvestDate: "2026-11-10", lotStatusId: 1, harvestedKg: 100, soldKg: 0, disposedKg: 0, returnedKg: 0, remainingKg: 100 },
  { lotId: ids.lotB, lotCode: "B2-LOT", zoneId: ids.zoneB, zoneCode: "DEMO-02", harvestDate: "2026-11-10", lotStatusId: 1, harvestedKg: 50, soldKg: 0, disposedKg: 0, returnedKg: 0, remainingKg: 50 }] };
const saved = { id: ids.doc, code: "XHS000001", statusId: 4002, status: "Completed", disposedAt: "2026-11-12T08:00:00+07:00", zoneId: ids.zoneA, zoneCode: "DEMO-01", reason: "Hàu chết", notes: null, totalKg: 30,
  createdAt: "2026-11-12T08:00:00+07:00", createdBy: "Chủ", completedAt: null, cancelledAt: null, cancelReason: null, rowVersion: "v1", lines: [] };

beforeEach(() => {
  state.context.identity.subjectType = "CooperativeOwner";
  state.all.mockResolvedValue({ status: "success", data: [product] });
  state.lots.mockResolvedValue({ status: "success", data: lots });
  state.save.mockResolvedValue({ status: "success", data: saved });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("offers only the lots of the chosen zone and completes with the product, the lot, the kg and the reason", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><DisposalEditorPage /></ToastProvider>);
  await user.type(await screen.findByLabelText("Tìm sản phẩm theo mã hoặc tên"), "Hàu");
  await user.click(await screen.findByRole("button", { name: /Hàu sữa/ }));
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Chọn vùng");
  await user.selectOptions(screen.getByLabelText("Vùng"), ids.zoneA);
  const lotBox = await screen.findByLabelText("Lô thu hoạch dòng 1");
  await waitFor(() => expect(Array.from((lotBox as HTMLSelectElement).options).map((option) => option.value)).toEqual(["", ids.lotA]));
  await user.selectOptions(lotBox, ids.lotA);
  await user.type(screen.getByLabelText("số kg dòng 1"), "30");
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  expect((await screen.findByRole("alert")).textContent).toContain("lý do");
  await user.type(screen.getByLabelText("Lý do"), "Hàu chết");
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1));
  expect(state.save.mock.calls[0][0]).toMatchObject({ zoneId: ids.zoneA, reason: "Hàu chết", complete: true, lines: [{ productId: ids.product, harvestLotId: ids.lotA, kg: 30 }] });
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/sales/disposals?code=XHS000001"));
});

it("drops the lot of a line when the zone changes", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><DisposalEditorPage /></ToastProvider>);
  await user.type(await screen.findByLabelText("Tìm sản phẩm theo mã hoặc tên"), "Hàu");
  await user.click(await screen.findByRole("button", { name: /Hàu sữa/ }));
  await user.selectOptions(screen.getByLabelText("Vùng"), ids.zoneA);
  await user.selectOptions(await screen.findByLabelText("Lô thu hoạch dòng 1"), ids.lotA);
  await user.selectOptions(screen.getByLabelText("Vùng"), ids.zoneB);
  await waitFor(() => expect((screen.getByLabelText("Lô thu hoạch dòng 1") as HTMLSelectElement).value).toBe(""));
});
