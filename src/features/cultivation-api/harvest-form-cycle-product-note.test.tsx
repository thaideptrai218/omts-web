// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/toast-provider";

const ids = { product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", other: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02", zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12" };
const state = vi.hoisted(() => ({ all: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./records-shared", async (original) => ({ ...(await original<typeof import("./records-shared")>()), harvestRepo: { upload: vi.fn(), read: vi.fn(), write: vi.fn() } }));
vi.mock("@/features/products/repository", async (original) => ({ ...(await original<typeof import("@/features/products/repository")>()), productRepository: { all: state.all } }));
vi.mock("./harvest-crew-picker", () => ({ HarvestCrewPicker: () => null }));
import { HarvestForm } from "./records-harvest-form";

const product = (id: string, code: string, name: string) => ({ id, code, name, unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x", units: [] });
const data = { raftId: ids.raft, raftCode: "B1", cycle: null, averageKgPerCage: 50, canRecordHarvest: true, orders: [], lots: [], lanes: [1, 2].map((laneNumber) => ({ laneNumber, canHarvest: true, state: "BeingHarvested" as const, canFinish: true })) };
const note = /phải có sản phẩm của giống đang nuôi/;

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => state.all.mockResolvedValue({ status: "success", data: [product(ids.product, "SP1", "Hàu sữa"), product(ids.other, "SP2", "Hàu cồn")] }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = (patch: object = {}) => render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} data={{ ...data, ...patch } as never} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);

it("shows the note about the cycle product only while the lines do not hold it", async () => {
  mount({ cycleProductId: ids.product, cycleProductName: "Hàu sữa" });
  const select = await screen.findByLabelText("Sản phẩm dòng 1") as HTMLSelectElement;
  await waitFor(() => expect(select.value).toBe(ids.product));
  expect(screen.queryByText(note)).toBeNull();
  await userEvent.setup().selectOptions(select, ids.other);
  expect((await screen.findByText(note)).textContent).toContain("(Hàu sữa)");
  await userEvent.setup().selectOptions(select, ids.product);
  await waitFor(() => expect(screen.queryByText(note)).toBeNull());
});

it("shows no note when the cycle has no product to hold the lines to", async () => {
  mount();
  const select = await screen.findByLabelText("Sản phẩm dòng 1") as HTMLSelectElement;
  await waitFor(() => expect(select.querySelector(`option[value="${ids.other}"]`)).toBeTruthy());
  await userEvent.setup().selectOptions(select, ids.other);
  expect(screen.queryByText(note)).toBeNull();
});
