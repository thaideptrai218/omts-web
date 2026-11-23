// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/toast-provider";

const ids = { product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", line: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07", zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", lot: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a14" };
const state = vi.hoisted(() => ({ upload: vi.fn(), all: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./records-shared", async (original) => ({ ...(await original<typeof import("./records-shared")>()), harvestRepo: { upload: state.upload, read: vi.fn(), write: vi.fn() } }));
vi.mock("@/features/products/repository", async (original) => ({ ...(await original<typeof import("@/features/products/repository")>()), productRepository: { all: state.all } }));
vi.mock("./record-crew-picker", () => ({ RecordCrewPicker: () => null }));
// jsdom cannot decode images; the picker only needs the file back.
vi.mock("@/components/form/photo-compression", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/components/form/photo-compression")>()), compressPhoto: async (file: File) => file }));
import { attachPhoto } from "./record-form-test-helpers";
import { HarvestForm } from "./records-harvest-form";

const product = { id: ids.product, code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x", units: [] };
const plan = { lineId: ids.line, planCode: "KHT000001", raftCode: "B1", expectedProductId: ids.product, expectedCageCount: 6 };

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.all.mockResolvedValue({ status: "success", data: [product] });
  state.upload.mockResolvedValue({ status: "success", data: { lot: { id: ids.lot, lotCode: "B1-LOT1" }, warnings: [] } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("records from a plan line: no lane to pick, cages start from the plan, kg and tấn follow read-only, and the body names the plan line and no kg", async () => {
  const user = userEvent.setup(), onSaved = vi.fn();
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={plan} onClose={() => {}} onSaved={onSaved} /></ToastProvider>);
  expect(screen.getByRole("dialog", { name: /Thu hoạch theo kế hoạch KHT000001/ })).toBeTruthy();
  expect(screen.queryByText(/Làn thu hoạch/)).toBeNull();
  expect((screen.getByLabelText("Số lồng thu được") as HTMLInputElement).value).toBe("6");
  // 6 cages x the default 50 kg = 300 kg = 0,3 tấn.
  const conversion = screen.getByLabelText("Quy đổi tạm tính").textContent;
  expect(conversion).toContain("300 kg");
  expect(conversion).toContain("0,3 tấn");
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
  const [action, files, body, , raftId, zoneId] = state.upload.mock.calls[0];
  expect([action, files.length, raftId, zoneId]).toEqual(["harvest-record", 1, ids.raft, ids.zone]);
  expect(body).toEqual({ laneNumbers: [], finishedLaneNumbers: [], cageCount: 6, estimatedKg: null, productLines: [{ productId: ids.product, cageCount: 6, kg: null }], harvestPlanLineId: ids.line });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it("harvesting before the oysters are mature only asks in the pop-up and still records on Đồng ý", async () => {
  const user = userEvent.setup();
  const future = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={{ ...plan, expectedHarvestDate: future }} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByText(/Hàu chưa đủ ngày trưởng thành/)).textContent).toContain("Bạn vẫn muốn thu hoạch?");
  expect(screen.getAllByRole("button", { name: "Đóng hộp thoại" }).length).toBeGreaterThan(1);
  await user.click(screen.getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
});

it("takes half a cage and refuses an empty count without sending anything", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={{ ...plan, expectedCageCount: 2.5 }} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  expect((screen.getByLabelText("Số lồng thu được") as HTMLInputElement).value).toBe("2,5");
  await user.clear(screen.getByLabelText("Số lồng thu được"));
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect(await screen.findByText(/Số lồng thu được phải lớn hơn 0/)).toBeTruthy();
  expect(state.upload).not.toHaveBeenCalled();
});
