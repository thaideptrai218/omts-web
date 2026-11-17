// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/toast-provider";

const ids = { product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", other: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02", zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", lot: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a14" };
const state = vi.hoisted(() => ({ all: vi.fn(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./records-shared", async (original) => ({ ...(await original<typeof import("./records-shared")>()), harvestRepo: { upload: state.upload, read: vi.fn(), write: vi.fn() } }));
vi.mock("@/features/products/repository", async (original) => ({ ...(await original<typeof import("@/features/products/repository")>()), productRepository: { all: state.all } }));
vi.mock("./harvest-crew-picker", () => ({ HarvestCrewPicker: () => null }));
vi.mock("@/components/form/photo-compression", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/components/form/photo-compression")>()), compressPhoto: async (file: File) => file }));
import { attachPhoto, selectLane } from "./record-form-test-helpers";
import { HarvestForm } from "./records-harvest-form";

const product = (id: string, code: string, name: string) => ({ id, code, name, unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x", units: [] });
const data = { raftId: ids.raft, raftCode: "B1", cycle: null, averageKgPerCage: 50, canRecordHarvest: true, orders: [], lots: [], lanes: [1, 2].map((laneNumber) => ({ laneNumber, canHarvest: true, state: "BeingHarvested" as const, canFinish: true })) };

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.all.mockResolvedValue({ status: "success", data: [product(ids.product, "SP1", "Hàu sữa"), product(ids.other, "SP2", "Hàu cồn")] });
  state.upload.mockResolvedValue({ status: "success", data: { lot: { id: ids.lot, lotCode: "B1-LOT1" }, warnings: [] } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = (patch: object = {}) => render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} data={{ ...data, ...patch } as never} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);

it("holds the lot to the product of the cycle: one line, the product as text, no picker and no way to add a line", async () => {
  mount({ cycleProductId: ids.product, cycleProductName: "Hàu sữa" });
  await waitFor(() => expect(screen.getByLabelText("Sản phẩm dòng 1").textContent).toBe("Hàu sữa (SP1)"));
  expect(screen.getByLabelText("Sản phẩm dòng 1").tagName).not.toBe("SELECT");
  expect(screen.queryByLabelText("Sản phẩm dòng 2")).toBeNull();
  expect(screen.queryByRole("button", { name: "+ Thêm sản phẩm" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Bỏ dòng/ })).toBeNull();
  expect(screen.getByText(/Mỗi lô thu hoạch chỉ có một sản phẩm: loại hàu của giống đang nuôi trong chu kỳ \(Hàu sữa\)/)).toBeTruthy();
});

it("still names the cycle product while the product list loads, and when the product is no longer sold", async () => {
  state.all.mockResolvedValue({ status: "success", data: [product(ids.other, "SP2", "Hàu cồn")] });
  mount({ cycleProductId: ids.product, cycleProductName: "Hàu sữa" });
  await waitFor(() => expect(screen.getByLabelText("Sản phẩm dòng 1").textContent).toBe("Hàu sữa"));
});

it("sends the one product line of the cycle with the cages typed", async () => {
  const user = userEvent.setup();
  mount({ cycleProductId: ids.product, cycleProductName: "Hàu sữa" });
  await selectLane(2);
  await waitFor(() => expect(screen.getByLabelText("Sản phẩm dòng 1").textContent).toBe("Hàu sữa (SP1)"));
  await user.type(screen.getByLabelText("Số lồng dòng 1"), "4");
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
  expect(state.upload.mock.calls[0][2]).toMatchObject({ cageCount: 4, estimatedKg: null, productLines: [{ productId: ids.product, cageCount: 4, kg: null }] });
});

it("lets a cycle that has no product yet pick one, still for one line only", async () => {
  mount();
  const select = await screen.findByLabelText("Sản phẩm dòng 1") as HTMLSelectElement;
  await waitFor(() => expect(select.querySelector(`option[value="${ids.other}"]`)).toBeTruthy());
  await userEvent.setup().selectOptions(select, ids.other);
  expect(select.value).toBe(ids.other);
  expect(screen.queryByRole("button", { name: "+ Thêm sản phẩm" })).toBeNull();
});

it("refuses to send a line without a product or cages and says what is missing", async () => {
  const user = userEvent.setup();
  mount();
  await selectLane(1);
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findAllByRole("alert")).map((alert) => alert.textContent).join(" ")).toMatch(/Dòng 1: chọn sản phẩm/);
  expect(state.upload).not.toHaveBeenCalled();
});
