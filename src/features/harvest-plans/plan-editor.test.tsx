// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

const ids = {
  zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", zone2: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a14", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", raft2: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a13", raft3: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a15", raft4: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a16", zone3: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a17", fish: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0b", product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01",
  order: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", order2: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b0a", plan: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06", line: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07", line2: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08", person: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b09",
};
const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "owner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  kgPerCage: 12.5 as number | undefined, push: vi.fn(), create: vi.fn(), update: vi.fn(), assign: vi.fn(), orderDraft: vi.fn(), detail: vi.fn(), eligible: vi.fn(), orders: vi.fn(), orderDetail: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("@/features/harvest-settings-lookup/use-kg-per-cage", () => ({ useKgPerCage: () => ({ kgPerCage: state.kgPerCage, loading: false }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./repository", async (original) => ({
  ...(await original<typeof import("./repository")>()),
  planRepository: { create: state.create, update: state.update, assign: state.assign, orderDraft: state.orderDraft, detail: state.detail, eligibleRafts: state.eligible },
}));
vi.mock("@/features/sales-orders/repository", async (original) => ({ ...(await original<typeof import("@/features/sales-orders/repository")>()), orderRepository: { list: state.orders, detail: state.orderDetail } }));
import { PlanEditorPage } from "./plan-editor";
import { ToastProvider } from "@/components/ui/toast-provider";

const zone = { id: ids.zone, code: "DEMO-01", name: "Vùng 1" }, zone2 = { id: ids.zone2, code: "DEMO-02", name: "Vùng 2" }, zone3 = { id: ids.zone3, code: "DEMO-03", name: "Vùng 3" };
const draft = {
  salesOrder: { id: ids.order, code: "DH000001", statusId: 4101, status: "Draft", customer: null }, plannedAt: "2026-11-14T06:00:00+07:00",
  products: [{ productId: ids.product, productCode: "SP000001", productName: "Hàu sữa", unitId: ids.person, unitCode: "K", unitName: "kg", quantity: 120, expectedCageCount: 8 }],
};
const eligLane = (laneNumber: number, stateName: string, planCode: string | null = null) => ({ laneId: `0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0c0${laneNumber}`, laneNumber, state: stateName, planCode });
const eligible = [
  { raftId: ids.raft, raftCode: "B1", zone, product: { id: ids.product, code: "SP000001", name: "Hàu sữa" }, lanes: [eligLane(1, "Free"), eligLane(2, "Free"), eligLane(3, "Harvested"), eligLane(4, "InAnotherPlan", "KHT000002")] },
  { raftId: ids.raft2, raftCode: "B2", zone: zone2, product: null, lanes: [eligLane(1, "Free")] },
];
// Rafts that the orders linked to a plan must not offer: another product, a product asked by no order, and no free lane left.
const others = [
  { raftId: ids.raft3, raftCode: "B3", zone, product: { id: ids.fish, code: "SP000002", name: "Cá bớp" }, lanes: [eligLane(1, "Free")] },
  { raftId: ids.raft4, raftCode: "B4", zone: zone3, product: { id: ids.product, code: "SP000001", name: "Hàu sữa" }, lanes: [eligLane(1, "Harvested"), eligLane(2, "InAnotherPlan", "KHT000002")] },
];
const saved = (patch: object = {}) => ({
  id: ids.plan, code: "KHT000001", statusId: 4201, status: "Draft", zones: [zone], plannedAt: "2026-11-14T06:00:00+07:00", note: null, createdBy: null, orders: [{ id: ids.order, code: "DH000001", statusId: 4101, status: "Draft", customer: { id: ids.person, code: "KH1", name: "An" } }],
  lines: [], progress: { lines: 0, linesDone: 0, lanes: 0, lanesHarvested: 0, lanesSkipped: 0 }, allowedActions: ["Edit", "Assign"], createdAt: "2026-11-12T08:00:00+07:00", rowVersion: "v1", ...patch,
});
const orderRow = (id: string, code: string, customerName: string) => ({ id, code, statusId: 4101, status: "Draft", orderedAt: "2026-11-12T08:00:00+07:00", pickupAt: null, customerName, walkInCustomer: false, source: "Phone", total: 1, invoicedTotal: 0, customerPaid: 0, invoiceCodes: [], progress: [], rowVersion: "v" });

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });

beforeEach(() => {
  state.context.identity.subjectType = "CooperativeOwner";
  state.context.permissions.functionPermissions = [];
  state.kgPerCage = 12.5;
  state.orderDraft.mockResolvedValue({ status: "success", data: draft });
  state.eligible.mockResolvedValue({ status: "success", data: [...eligible, ...others] });
  state.orders.mockResolvedValue({ status: "success", data: { items: [orderRow(ids.order, "DH000001", "An"), orderRow(ids.order2, "DH000002", "Bình")], page: 1, pageSize: 20, total: 2 } });
  state.orderDetail.mockResolvedValue({ status: "success", data: { id: ids.order, statusId: 4101, lines: [{ productId: ids.product, productName: "Hàu sữa", unitId: ids.person, unitName: "kg", factor: 1, quantity: 120, deliveredQuantity: 20 }] } });
  state.create.mockResolvedValue({ status: "success", data: saved() });
  state.assign.mockResolvedValue({ status: "success", data: { done: true } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("starts from an order with the order linked, lets the Owner choose zone, raft and lanes, then saves and gives the plan out", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage orderIds={[ids.order]} /></ToastProvider>);
  expect(await screen.findByText(/Còn lại: Hàu sữa 100 kg/)).toBeTruthy();
  expect(screen.getByRole("button", { name: "Bỏ đơn DH000001" })).toBeTruthy();
  // The plan has no zone and no product to type: both come with the raft of each line.
  expect(screen.queryByLabelText("Vùng")).toBeNull();
  await user.click(screen.getByRole("button", { name: /Thêm dòng bè/ }));
  expect(screen.queryByLabelText("Sản phẩm dự kiến dòng 1")).toBeNull();
  // The orders need only Hàu sữa: zones with no raft of it and a free lane (DEMO-02 has no product, DEMO-03 has no free lane) are not offered, so DEMO-01 is the only one.
  expect([...(screen.getByLabelText("Vùng dòng 1") as HTMLSelectElement).options].map((option) => option.text)).toEqual(["Chọn vùng", "DEMO-01"]);
  expect((screen.getByLabelText("Vùng dòng 1") as HTMLSelectElement).value).toBe(ids.zone);
  // Only the rafts of the zone farming a product of the orders are offered, each with the product it farms (B3 farms Cá bớp).
  expect([...(screen.getByLabelText("Bè dòng 1") as HTMLSelectElement).options].map((option) => option.text)).toEqual(["Chọn bè", "B1 · Hàu sữa"]);
  await user.selectOptions(screen.getByLabelText("Bè dòng 1"), ids.raft);
  expect(screen.getByText("Hàu sữa (SP000001)")).toBeTruthy();
  // The orders still need 100 kg of the product, 8 cages at 12,5 kg a cage; lanes of another open plan or already harvested stay disabled.
  expect((screen.getByLabelText("lồng dự kiến dòng 1") as HTMLInputElement).value).toBe("8");
  const group = await screen.findByRole("group", { name: "Luống dòng 1" });
  const box = (n: number) => group.querySelectorAll("input")[n - 1] as HTMLInputElement;
  expect([1, 2, 3, 4].map((n) => box(n).disabled)).toEqual([false, false, true, true]);
  expect(within(group).getByText("trong KHT000002")).toBeTruthy();
  await user.click(box(2)); await user.click(box(1));
  await user.click(screen.getByRole("button", { name: "Lưu & Giao QLV" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  expect(state.create.mock.calls[0][0]).toEqual({
    code: null, plannedAt: "2026-11-14T06:00:00+07:00", note: null, salesOrderIds: [ids.order],
    lines: [{ raftId: ids.raft, laneNumbers: [1, 2], expectedCageCount: 8, note: null }],
  });
  await waitFor(() => expect(state.assign).toHaveBeenCalledWith(ids.plan, "v1"));
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/farming/harvest-plans?code=KHT000001"));
});

it("takes rafts of several zones in one plan and several orders from the search box", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: /Thêm dòng bè/ }));
  await user.selectOptions(screen.getByLabelText("Vùng dòng 1"), ids.zone);
  await user.selectOptions(screen.getByLabelText("Bè dòng 1"), ids.raft);
  await user.click(await screen.findByLabelText(/^Luống 1/));
  await user.click(screen.getByRole("button", { name: /Thêm dòng bè/ }));
  await user.selectOptions(screen.getByLabelText("Vùng dòng 2"), ids.zone2);
  expect([...(screen.getByLabelText("Bè dòng 2") as HTMLSelectElement).options].map((option) => option.text)).toEqual(["Chọn bè", "B2"]);
  // With no order linked every eligible raft is offered, whatever it farms and whatever lanes are free.
  expect([...(screen.getByLabelText("Vùng dòng 2") as HTMLSelectElement).options].map((option) => option.text)).toEqual(["Chọn vùng", "DEMO-01", "DEMO-02", "DEMO-03"]);
  expect([...(screen.getByLabelText("Bè dòng 1") as HTMLSelectElement).options].map((option) => option.text)).toEqual(["Chọn bè", "B1 · Hàu sữa", "B3 · Cá bớp"]);
  await user.selectOptions(screen.getByLabelText("Bè dòng 2"), ids.raft2);
  expect(screen.getByText("Chưa có sản phẩm")).toBeTruthy();
  await user.click(within(screen.getByRole("group", { name: "Luống dòng 2" })).getByLabelText(/^Luống 1/));
  for (const code of ["DH000001", "DH000002"]) {
    await user.click(screen.getByLabelText("Tìm đơn đặt hàng"));
    await user.click(await screen.findByRole("button", { name: new RegExp(code) }));
    expect(screen.getByRole("button", { name: `Bỏ đơn ${code}` })).toBeTruthy();
  }
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  // The rafts expect no cages yet, so the plan is short of what the two orders still need: it asks first.
  expect(await screen.findByText(/^KHT còn thiếu 200 kg Hàu sữa so với đơn đặt hàng/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  expect(state.create.mock.calls[0][0]).toMatchObject({ salesOrderIds: [ids.order, ids.order2], lines: [{ raftId: ids.raft, laneNumbers: [1] }, { raftId: ids.raft2, laneNumbers: [1] }] });
  expect(state.create.mock.calls[0][0]).not.toHaveProperty("zoneId");
  expect(state.assign).not.toHaveBeenCalled();
});

it("shows the first problem of an incomplete form, in the order of the line: zone, raft, lanes", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: "Lưu tạm" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Thêm ít nhất một dòng bè.");
  await user.click(screen.getByRole("button", { name: /Thêm dòng bè/ }));
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Dòng 1: chọn vùng.");
  await user.selectOptions(screen.getByLabelText("Vùng dòng 1"), ids.zone);
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Dòng 1: chọn bè.");
  await user.selectOptions(screen.getByLabelText("Bè dòng 1"), ids.raft);
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Dòng 1: chọn ít nhất một luống.");
  expect(state.create).not.toHaveBeenCalled();
});

it("shows the sentence of the API when a lane is already in another plan and keeps the form", async () => {
  state.create.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-PLAN-02", problem: { message: "Luống 1 của bè B1 đã có trong KHT000002." } });
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage orderIds={[ids.order]} /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: /Thêm dòng bè/ }));
  await user.selectOptions(screen.getByLabelText("Vùng dòng 1"), ids.zone);
  await user.selectOptions(screen.getByLabelText("Bè dòng 1"), ids.raft);
  await user.click(await screen.findByLabelText(/^Luống 1/));
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Luống 1 của bè B1 đã có trong KHT000002.");
  expect(state.push).not.toHaveBeenCalled();
  expect((screen.getByLabelText("lồng dự kiến dòng 1") as HTMLInputElement).value).toBe("8");
});

it("lets a plan already given out change only the lines without a lot or a skipped lane", async () => {
  const line = (id: string, raftId: string, raftCode: string, lineZone: object, lanes: object[], extra: object = {}) => ({ id, lineNumber: 1, raftId, raftCode, zone: lineZone, expectedProduct: { id: ids.product, code: "SP000001", name: "Hàu sữa" }, expectedCageCount: 8, state: "Open", lot: null, canHarvest: true, locked: false, lanes, ...extra });
  state.detail.mockResolvedValue({ status: "success", data: saved({ statusId: 4202, status: "Assigned", allowedActions: ["Edit"], zones: [zone, zone2], lines: [
    line(ids.line, ids.raft, "B1", zone, [{ laneId: ids.person, laneNumber: 1, state: "Planned" }]),
    line(ids.line2, ids.raft2, "B2", zone2, [{ laneId: ids.person, laneNumber: 1, state: "Harvested", lotCode: "B2-LOT1" }], { state: "Harvested", locked: true, lot: { id: ids.person, lotCode: "B2-LOT1", cageCount: 8, estimatedKg: 400, harvestedAt: "2026-11-14T08:00:00+07:00" } }),
  ] }) });
  state.update.mockResolvedValue({ status: "success", data: saved({ statusId: 4202 }) });
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage id={ids.plan} /></ToastProvider>);
  await screen.findByLabelText("Bè dòng 2");
  expect((screen.getByLabelText("Vùng dòng 1") as HTMLSelectElement).value).toBe(ids.zone);
  expect((screen.getByLabelText("Bè dòng 1") as HTMLSelectElement).disabled).toBe(false);
  expect((screen.getByLabelText("Bè dòng 2") as HTMLSelectElement).disabled).toBe(true);
  expect((screen.getByLabelText("Vùng dòng 2") as HTMLSelectElement).disabled).toBe(true);
  expect((screen.getByLabelText("lồng dự kiến dòng 1") as HTMLInputElement).disabled).toBe(false);
  expect((screen.getByLabelText("Mã kế hoạch") as HTMLInputElement).disabled).toBe(true);
  expect(screen.queryByRole("button", { name: "Lưu & Giao QLV" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.update).toHaveBeenCalledTimes(1));
  expect(state.update.mock.calls[0][0]).toBe(ids.plan);
  expect(state.update.mock.calls[0][1]).toMatchObject({ rowVersion: "v1", lines: [{ id: ids.line, raftId: ids.raft, laneNumbers: [1] }, { id: ids.line2, raftId: ids.raft2, laneNumbers: [1] }] });
  expect(state.assign).not.toHaveBeenCalled();
});

it("sets the cages of the rafts against what the orders still need and asks before saving a shortage", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage orderIds={[ids.order]} /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: /Thêm dòng bè/ }));
  const block = within(screen.getByRole("group", { name: "Đáp ứng đơn đặt hàng" }));
  expect(block.getByText("Hàu sữa")).toBeTruthy();
  expect(block.getByText("Thiếu 100 kg")).toBeTruthy();
  await user.selectOptions(screen.getByLabelText("Vùng dòng 1"), ids.zone);
  await user.selectOptions(screen.getByLabelText("Bè dòng 1"), ids.raft);
  // The cages start from what is still short (never below zero) and can be overwritten.
  const cages = screen.getByLabelText("lồng dự kiến dòng 1") as HTMLInputElement;
  expect(cages.value).toBe("8");
  expect(block.getByText("Đủ")).toBeTruthy();
  expect(block.getAllByText("100 kg")).toHaveLength(2);
  await user.clear(cages); await user.type(cages, "4");
  expect(block.getByText("Thiếu 50 kg")).toBeTruthy();
  await user.click(await screen.findByLabelText(/^Luống 1/));
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  expect(await screen.findByText("KHT còn thiếu 50 kg Hàu sữa so với đơn đặt hàng. Vẫn lưu?")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Quay lại" }));
  expect(state.create).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Lưu & Giao QLV" }));
  expect(await screen.findByText("KHT còn thiếu 50 kg Hàu sữa so với đơn đặt hàng. Vẫn lưu và giao QLV?")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  expect(state.create.mock.calls[0][0].lines).toEqual([{ raftId: ids.raft, laneNumbers: [1], expectedCageCount: 4, note: null }]);
  await waitFor(() => expect(state.assign).toHaveBeenCalledTimes(1));
});

it("saves without asking when the cages cover the orders, or show Dư when they exceed them", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage orderIds={[ids.order]} /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: /Thêm dòng bè/ }));
  await user.selectOptions(screen.getByLabelText("Vùng dòng 1"), ids.zone);
  await user.selectOptions(screen.getByLabelText("Bè dòng 1"), ids.raft);
  await user.click(await screen.findByLabelText(/^Luống 1/));
  const cages = screen.getByLabelText("lồng dự kiến dòng 1");
  await user.clear(cages); await user.type(cages, "10");
  expect(within(screen.getByRole("group", { name: "Đáp ứng đơn đặt hàng" })).getByText("Dư 25 kg")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
  expect(screen.queryByText(/còn thiếu/)).toBeNull();
});

it("does not turn cages into kg without a kg per cage, so it neither prefills nor warns", async () => {
  state.kgPerCage = undefined;
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage orderIds={[ids.order]} /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: /Thêm dòng bè/ }));
  await user.selectOptions(screen.getByLabelText("Vùng dòng 1"), ids.zone);
  await user.selectOptions(screen.getByLabelText("Bè dòng 1"), ids.raft);
  expect((screen.getByLabelText("lồng dự kiến dòng 1") as HTMLInputElement).value).toBe("");
  expect(within(screen.getByRole("group", { name: "Đáp ứng đơn đặt hàng" })).getByText("Chưa quy đổi được")).toBeTruthy();
  await user.click(await screen.findByLabelText(/^Luống 1/));
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  await waitFor(() => expect(state.create).toHaveBeenCalledTimes(1));
});

it("starts the next raft from what the first raft leaves short", async () => {
  state.orderDetail.mockResolvedValue({ status: "success", data: { id: ids.order, statusId: 4101, lines: [{ productId: ids.product, productName: "Hàu sữa", unitId: ids.person, unitName: "Lồng", factor: 25, quantity: 80, deliveredQuantity: 0 }] } });
  state.eligible.mockResolvedValue({ status: "success", data: [eligible[0], { ...eligible[0], raftId: ids.raft3, raftCode: "B3" }] });
  const user = userEvent.setup();
  render(<ToastProvider><PlanEditorPage orderIds={[ids.order]} /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: /Thêm dòng bè/ }));
  await user.selectOptions(screen.getByLabelText("Vùng dòng 1"), ids.zone);
  await user.selectOptions(screen.getByLabelText("Bè dòng 1"), ids.raft);
  expect((screen.getByLabelText("lồng dự kiến dòng 1") as HTMLInputElement).value).toBe("80");
  const first = screen.getByLabelText("lồng dự kiến dòng 1");
  await user.clear(first); await user.type(first, "40");
  await user.click(screen.getByRole("button", { name: /Thêm dòng bè/ }));
  await user.selectOptions(screen.getByLabelText("Bè dòng 2"), ids.raft3);
  expect((screen.getByLabelText("lồng dự kiến dòng 2") as HTMLInputElement).value).toBe("40");
  expect(within(screen.getByRole("group", { name: "Đáp ứng đơn đặt hàng" })).getByText("Đủ")).toBeTruthy();
});

it("refuses an account without the right to create plans", async () => {
  state.context.identity.subjectType = "Staff";
  render(<ToastProvider><PlanEditorPage /></ToastProvider>);
  expect(await screen.findByText(/không có quyền lập hoặc sửa/)).toBeTruthy();
});
