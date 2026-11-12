// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const ids = { product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", line: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07", zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", lot: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a14" };
const state = vi.hoisted(() => ({ upload: vi.fn(), all: vi.fn() }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("./records-shared", async (original) => ({ ...(await original<typeof import("./records-shared")>()), harvestRepo: { upload: state.upload } }));
vi.mock("@/features/products/repository", async (original) => ({ ...(await original<typeof import("@/features/products/repository")>()), productRepository: { all: state.all } }));
import { HarvestForm } from "./records-harvest-form";

const product = { id: ids.product, code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x", units: [] };
const data = { raftId: ids.raft, raftCode: "B1", cycle: null, averageKgPerCage: 50, canRecordHarvest: true, lanes: [1, 2, 3, 4].map((laneNumber) => ({ laneNumber, canHarvest: true })), lots: [] };

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.all.mockResolvedValue({ status: "success", data: [product] });
  state.upload.mockResolvedValue({ status: "success", data: { lot: { id: ids.lot, lotCode: "B1-LOT1" } } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("records a lot from a plan line: lanes come from the plan and cannot be changed, the product line starts from the line and the line id is sent", async () => {
  const user = userEvent.setup(), onSaved = vi.fn();
  render(<HarvestForm zoneId={ids.zone} raftId={ids.raft} plan={{ lineId: ids.line, planCode: "KHT000001", laneNumbers: [1, 3], expectedProductId: ids.product, expectedCageCount: 6 }} onClose={() => {}} onSaved={onSaved} />);
  expect(screen.getByRole("dialog", { name: /Thu hoạch theo kế hoạch KHT000001/ })).toBeTruthy();
  const fixed = screen.getByRole("group", { name: /theo kế hoạch KHT000001 \(cố định\)/ });
  const boxes = within(fixed).getAllByRole("checkbox") as HTMLInputElement[];
  expect(boxes.map((box) => [box.checked, box.disabled])).toEqual([[true, true], [true, true]]);
  expect((await screen.findByLabelText("Sản phẩm dòng 1") as HTMLSelectElement).value).toBe(ids.product);
  expect((screen.getByLabelText("số lồng dòng 1") as HTMLInputElement).value).toBe("6");
  // Of the planned lanes the trip may finish some, like a normal harvest.
  await user.click(within(screen.getByRole("group", { name: "Làn đã thu hết hàu trong chuyến này" })).getByLabelText("Làn 3"));
  await user.click(screen.getByRole("button", { name: "Lưu chuyến thu hoạch" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
  const [action, files, body, , raftId, zoneId] = state.upload.mock.calls[0];
  expect([action, files, raftId, zoneId]).toEqual(["harvest-record", [], ids.raft, ids.zone]);
  expect(body).toEqual({ laneNumbers: [1, 3], finishedLaneNumbers: [3], cageCount: 6, estimatedKg: null, productLines: [{ productId: ids.product, cageCount: 6, kg: null }], harvestPlanLineId: ids.line });
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
});

it("leaves a normal harvest as it was: lanes are chosen from the raft and no plan field is sent", async () => {
  const user = userEvent.setup();
  render(<HarvestForm zoneId={ids.zone} raftId={ids.raft} data={data} onClose={() => {}} onSaved={() => {}} />);
  expect(screen.getByRole("dialog", { name: "Ghi nhận chuyến thu hoạch" })).toBeTruthy();
  const lanes = within(screen.getByRole("group", { name: "Làn thu hoạch *" })).getAllByRole("checkbox") as HTMLInputElement[];
  expect(lanes).toHaveLength(4);
  expect(lanes.every((box) => !box.disabled && !box.checked)).toBe(true);
  await user.click(lanes[1]);
  await user.selectOptions(await screen.findByLabelText("Sản phẩm dòng 1"), ids.product);
  await user.type(screen.getByLabelText("số lồng dòng 1"), "4");
  await user.click(screen.getByRole("button", { name: "Lưu chuyến thu hoạch" }));
  await user.click(await screen.findByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.upload).toHaveBeenCalledTimes(1));
  expect(state.upload.mock.calls[0][2]).toEqual({ laneNumbers: [2], finishedLaneNumbers: [], cageCount: 4, estimatedKg: null, productLines: [{ productId: ids.product, cageCount: 4, kg: null }] });
});
