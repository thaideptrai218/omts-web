// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read, write: vi.fn(), upload: vi.fn() }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/features/products/repository", () => ({ productRepository: { all: vi.fn(async () => ({ status: "success", data: [] })) } }));
vi.mock("./record-crew-picker", () => ({ RecordCrewPicker: () => null }));
import { ToastProvider } from "@/components/ui/toast-provider";
import { HarvestLotDetail } from "./harvest-detail";

const ids = { lot: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a14", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", cycle: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a15" };
const hint = "Lô đã cân: số kg bán dùng kg cân thực tế; sửa kg bằng Cân lại.";
const detail = (patch: object = {}) => ({
  id: ids.lot, lotCode: "B1-LOT1", cycleId: ids.cycle, raftId: ids.raft, raftCode: "B1", zoneId: ids.zone, zoneCode: "V01", harvestedAt: "2026-11-08T08:00:00+07:00", harvestDate: "2026-11-08",
  recordedByName: "Nhân viên", laneNumbers: [1], finishedLaneNumbers: [], cageCount: 2, kgPerCage: 50, estimatedKg: 100,
  figures: { invoicedKg: 0, soldKg: 0, returnedKg: 0, remainingKg: 100, lostKg: 0, differenceKg: 0, notFinal: true }, closeDate: null, leftoverKg: null, photos: [], rowVersion: "v",
  canCorrect: true, canRemove: false, productLines: [], ...patch,
});
const mount = () => render(<ToastProvider><HarvestLotDetail id={ids.lot} zoneId={ids.zone} onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
const answer = (lot: object) => read.mockImplementation((action: string) => Promise.resolve({
  status: "success",
  data: action === "detail" ? lot : { raftId: ids.raft, raftCode: "B1", cycle: null, averageKgPerCage: 50, canRecordHarvest: true, orders: [], lots: [], lanes: [] },
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("tells a weighed lot that the sold kg are the weighed kg and that Cân lại changes them", async () => {
  answer(detail({ weighedKg: 98.5, weighedAt: "2026-11-08T09:00:00+07:00", statusId: 2901, status: "Open" }));
  mount();
  expect((await screen.findByText(hint)).getAttribute("role")).toBe("status");
  expect(screen.getByLabelText(/^Số lồng/).matches(":disabled")).toBe(true);
});

it("shows no hint for a lot that is not weighed yet", async () => {
  answer(detail({ weighedKg: null, statusId: 2904, status: "AwaitingWeighing" }));
  mount();
  expect(await screen.findByLabelText(/^Số lồng/)).toBeTruthy();
  expect(screen.queryByText(hint)).toBeNull();
});
