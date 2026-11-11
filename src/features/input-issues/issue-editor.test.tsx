// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const ids = { zoneA: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", zoneB: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", item: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", base: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02",
  bag: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b03", lot: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b04", type: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b05", issue: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06", raft: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07" };
const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "CooperativeOwner", username: "owner" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  push: vi.fn(), save: vi.fn(), seedLots: vi.fn(), all: vi.fn(), types: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: state.push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/input-items/repository", async (original) => ({
  ...(await original<typeof import("@/features/input-items/repository")>()),
  issueRepository: { save: state.save, detail: vi.fn(), complete: vi.fn(), remove: vi.fn(), receivers: vi.fn(async () => ({ status: "success", data: [] })) },
  inputRepository: { all: state.all, seedLots: state.seedLots, issueTypes: state.types },
}));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: vi.fn(async () => ({ status: "success", data: [
  { id: ids.zoneA, code: "DEMO-01", name: "Vùng 1", statusId: 101 }, { id: ids.zoneB, code: "DEMO-02", name: "Vùng 2", statusId: 101 }] })) }));
vi.mock("@/features/purchase-documents/repository", () => ({ usePurchaseLookups: () => ({ suppliers: [], items: [], rafts: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07", code: "B-01", zoneId: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", zoneName: "Vùng 1" }], receivers: [], loading: false, refresh: vi.fn() }) }));
import { IssueEditorPage } from "./issue-editor";
import { ToastProvider } from "@/components/ui/toast-provider";

const seedItem = { id: ids.item, code: "GI000001", name: "Cá giống", group: "Seed", itemGroupId: null, itemGroupName: null, unit: "con", description: null, notes: null, photoUrl: null,
  units: [{ id: ids.base, unitId: ids.base, name: "con", factor: 1, code: "GI000001-C", isBase: true }, { id: ids.bag, unitId: ids.bag, name: "bao", factor: 1000, code: "GI000001-B", isBase: false }],
  minQuantity: null, maxQuantity: null, costPrice: 900, lastPurchasePrice: null, onHand: 5000, stockValue: 4500000, statusId: 101, status: "In Use", createdAt: "2026-11-01T00:00:00+07:00", createdBy: null, rowVersion: "v" };
const issueView = { id: ids.issue, kind: "Use", code: "XD000001", statusId: 3801, status: "Draft", issuedAt: "2026-11-11T08:00:00+07:00", zoneId: ids.zoneA, zoneCode: "DEMO-01", raftId: null, raftCode: null, issueTypeId: ids.type, issueTypeName: "Thả giống",
  receiverEmployeeId: null, receiverName: null, reason: null, notes: null, totalValue: 0, createdAt: "2026-11-11T08:00:00+07:00", createdBy: "Chủ", completedAt: null, cancelledAt: null, cancelReason: null, rowVersion: "v1", lines: [] };

beforeEach(() => {
  state.context.identity.subjectType = "CooperativeOwner";
  state.all.mockResolvedValue({ status: "success", data: [seedItem] });
  state.types.mockResolvedValue({ status: "success", data: [{ id: ids.type, name: "Thả giống", isSystem: true, rowVersion: "t" }] });
  state.seedLots.mockResolvedValue({ status: "success", data: { lots: [{ seedLotLineId: ids.lot, code: "PN000001-1", receivedQuantity: 100, onHand: 90 }], unlottedQuantity: 0, suggestedLotId: ids.lot, unit: "con" } });
  state.save.mockResolvedValue({ status: "success", data: issueView });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

async function addSeedLine(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Tìm hàng hóa theo mã hoặc tên"), "Cá");
  await user.click(await screen.findByRole("button", { name: /Cá giống/ }));
  await waitFor(() => expect((screen.getByLabelText("Lô giống dòng 1") as HTMLSelectElement).value).toBe(ids.lot));
}

it("needs a zone for a use issue, forgets that complaint once the zone is chosen, then saves the zone and raft on the header and the line with its unit and lot", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><IssueEditorPage kind="Use" /></ToastProvider>);
  await addSeedLine(user);
  await user.selectOptions(screen.getByLabelText("Đơn vị tính dòng 1"), ids.bag);
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Chọn vùng");
  expect(state.save).not.toHaveBeenCalled();
  await user.selectOptions(screen.getByLabelText("Vùng"), ids.zoneA);
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  // The only raft of the zone is taken, and a line has no raft of its own.
  expect((screen.getByLabelText("Bè") as HTMLSelectElement).value).toBe(ids.raft);
  expect(screen.queryByLabelText("Bè dòng 1")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1));
  const body = state.save.mock.calls[0][0];
  expect(body).toMatchObject({ kind: "Use", zoneId: ids.zoneA, raftId: ids.raft, complete: false, lines: [{ itemId: ids.item, itemUnitId: ids.bag, quantity: 1, seedLotLineId: ids.lot }] });
  expect(body.lines[0]).not.toHaveProperty("raftId");
  await waitFor(() => expect(state.push).toHaveBeenCalledWith("/inputs/uses?code=XD000001"));
});

it("needs a raft of the zone before a use issue is saved", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><IssueEditorPage kind="Use" /></ToastProvider>);
  await addSeedLine(user);
  await user.selectOptions(screen.getByLabelText("Vùng"), ids.zoneB);
  await user.click(screen.getByRole("button", { name: "Lưu tạm" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Chọn bè");
  expect(state.save).not.toHaveBeenCalled();
});

it("shows the shortage the API names and keeps the document on the page", async () => {
  state.save.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-INPUT-01", uncertain: false, problem: { message: "Lô PN000001-1 còn lại sẽ là -5 con." } });
  const user = userEvent.setup();
  render(<ToastProvider><IssueEditorPage kind="Use" /></ToastProvider>);
  await addSeedLine(user);
  await user.selectOptions(screen.getByLabelText("Vùng"), ids.zoneA);
  await user.selectOptions(screen.getByLabelText("Loại xuất"), ids.type);
  expect((screen.getByLabelText("Bè") as HTMLSelectElement).value).toBe(ids.raft);
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  expect((await screen.findByRole("alert")).textContent).toContain("Lô PN000001-1 còn lại sẽ là -5 con.");
  expect(state.save.mock.calls[0][0]).toMatchObject({ complete: true });
  expect(screen.getByText("Cá giống", { selector: "td" })).toBeTruthy();
  expect(state.push).not.toHaveBeenCalled();
});

it("asks for the reason of a disposal and sends no zone, raft or type with it", async () => {
  state.save.mockResolvedValue({ status: "success", data: { ...issueView, kind: "Disposal", code: "XH000001" } });
  const user = userEvent.setup();
  render(<ToastProvider><IssueEditorPage kind="Disposal" /></ToastProvider>);
  await addSeedLine(user);
  expect(screen.queryByLabelText("Vùng")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  expect((await screen.findByRole("alert")).textContent).toContain("lý do");
  await user.type(screen.getByLabelText("Lý do"), "Cá chết");
  await user.click(screen.getByRole("button", { name: "Hoàn thành" }));
  await waitFor(() => expect(state.save).toHaveBeenCalledTimes(1));
  const body = state.save.mock.calls[0][0];
  expect(body).toMatchObject({ kind: "Disposal", reason: "Cá chết", complete: true });
  expect(body).not.toHaveProperty("zoneId");
  expect(body).not.toHaveProperty("issueTypeId");
});

it("does not let an account without the disposal right open the disposal editor", async () => {
  state.context.identity.subjectType = "Staff";
  state.context.permissions.functionPermissions = [{ functionCode: "INPUT_ISSUES", action: "Create" }];
  render(<ToastProvider><IssueEditorPage kind="Disposal" /></ToastProvider>);
  expect(await screen.findByText(/Chỉ Chủ hợp tác xã/)).toBeTruthy();
  expect(state.save).not.toHaveBeenCalled();
});
