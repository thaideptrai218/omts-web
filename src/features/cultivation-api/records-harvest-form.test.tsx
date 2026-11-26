// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/ui/toast-provider";

const ids = { product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", line: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07", zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", lot: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a14" };
const state = vi.hoisted(() => ({ roster: vi.fn(), upload: vi.fn(), all: vi.fn(), push: vi.fn(), subjectType: "CooperativeOwner", permissions: [] as unknown[] }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ push: state.push }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: state.subjectType }, permissions: { functionPermissions: state.permissions } }) }));
vi.mock("./records-shared", async (original) => ({ ...(await original<typeof import("./records-shared")>()), harvestRepo: { upload: state.upload, read: vi.fn(async () => ({ status: "error", httpStatus: 404, uncertain: false })), write: vi.fn() } }));
vi.mock("@/features/harvest-plans/repository", async (original) => ({ ...(await original<typeof import("@/features/harvest-plans/repository")>()), planRepository: { roster: state.roster } }));
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
afterEach(() => { cleanup(); vi.clearAllMocks(); state.subjectType = "CooperativeOwner"; state.permissions = []; });

it("is a same-day action: named by the raft, shows the plan, the order and the customer, starts the cages from the plan and has no kg or tấn", async () => {
  const user = userEvent.setup(), onSaved = vi.fn();
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={{ ...plan, orders: [{ id: ids.line, code: "DH000006", statusId: 4401, status: "Draft", customer: { id: ids.line, code: "KH01", name: "Khách An" } }] }} onClose={() => {}} onSaved={onSaved} /></ToastProvider>);
  expect(screen.getByRole("dialog", { name: "Thu hoạch bè B1" })).toBeTruthy();
  expect(screen.getByLabelText("Kế hoạch thu hoạch").textContent).toContain("KHT000001");
  expect(screen.getByText("DH000006 · Khách An")).toBeTruthy();
  expect(screen.queryByText(/Làn thu hoạch/)).toBeNull();
  expect(screen.queryByLabelText("Quy đổi tạm tính")).toBeNull();
  expect(screen.queryByText(/tấn/)).toBeNull();
  expect((screen.getByLabelText("Số lồng thu được") as HTMLInputElement).value).toBe("6");
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
  const [action, files, body, , raftId, zoneId] = state.upload.mock.calls[0];
  expect([action, files.length, raftId, zoneId]).toEqual(["harvest-record", 1, ids.raft, ids.zone]);
  expect(body).toEqual({ laneNumbers: [], finishedLaneNumbers: [], cageCount: 6, estimatedKg: null, productLines: [{ productId: ids.product, cageCount: 6, kg: null }], harvestPlanLineId: ids.line });
  // The save does not close the window: the next step is weighing the lot cage by cage.
  expect(onSaved).not.toHaveBeenCalled();
  await user.click(await screen.findByRole("button", { name: "Cân từng lồng ngay" }));
  expect(state.push).toHaveBeenCalledWith("/farming/harvest-lots?code=B1-LOT1&weigh=1");
});

it("after the save, Để sau closes the window and tells the screen behind it to reload", async () => {
  const user = userEvent.setup(), onSaved = vi.fn(), onClose = vi.fn();
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={plan} onClose={onClose} onSaved={onSaved} /></ToastProvider>);
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  expect(await screen.findByText(/đang chờ cân/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Để sau" }));
  await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
  expect(onClose).not.toHaveBeenCalled();
});

it("tells a user who may invoice that the invoice comes after the weighing, and says nothing to one who may not", async () => {
  const user = userEvent.setup();
  const withOrder = { ...plan, orders: [{ id: ids.line, code: "DH000006", statusId: 4401, status: "Draft", customer: null }] };
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={withOrder} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  expect(await screen.findByText(/Lập hóa đơn giao khách/)).toBeTruthy();
  cleanup();
  state.subjectType = "Staff"; state.permissions = [{ functionCode: "HARVESTS", action: "Create" }];
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={withOrder} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  await attachPhoto();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  expect(await screen.findByText(/đang chờ cân/)).toBeTruthy();
  expect(screen.queryByText(/Lập hóa đơn giao khách/)).toBeNull();
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

it("photos are optional: the section is collapsed, titled optional with the 3 maximum, and the form saves with none", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={plan} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  const summary = screen.getByText("Ảnh thu hoạch (không bắt buộc, tối đa 3)");
  expect(summary.closest("details")?.hasAttribute("open")).toBe(false);
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
  expect(state.upload.mock.calls[0][1]).toHaveLength(0);
  expect(screen.queryByText(/cần từ 1 đến 3/)).toBeNull();
});

it("refuses more cages than the plan line expects", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={plan} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  const cages = screen.getByLabelText("Số lồng thu được");
  await user.clear(cages);
  await user.type(cages, "7");
  expect(screen.getByText("Không thu quá 6 lồng của kế hoạch.")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect(state.upload).not.toHaveBeenCalled();
});

it("takes the crew from the people who confirmed for the plan instead of asking again", async () => {
  const user = userEvent.setup();
  state.roster.mockResolvedValue({ status: "success", data: { requiredPeople: 3, people: [
    { id: "r1", employeeId: ids.line, name: "Lê Văn Một", state: "Confirmed" },
    { id: "r2", employeeId: ids.zone, name: "Trần Thị Hai", state: "External" },
    { id: "r3", employeeId: ids.raft, name: "Người Chưa Trả Lời", state: "Invited" },
  ] } });
  render(<ToastProvider><HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={{ ...plan, planId: ids.lot }} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  expect(await screen.findByText("2 người / cần 3")).toBeTruthy();
  expect(screen.getByText("Lê Văn Một")).toBeTruthy();
  expect(screen.queryByText("Người Chưa Trả Lời")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
  expect(state.upload.mock.calls[0][2].crew).toEqual([ids.line, ids.zone]);
});
