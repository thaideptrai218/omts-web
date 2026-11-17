// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read, write: vi.fn() }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/features/history/history-repository", () => ({ readRecordHistory: vi.fn(async () => ({ status: "success", data: [] })) }));
import { ToastProvider } from "@/components/ui/toast-provider";
import { HarvestLotPreview } from "./harvest-lot-preview";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const lot = (patch: object = {}) => ({ status: "success", data: { id: "lot", lotCode: "B1-LOT", raftId: "r", raftCode: "B1", zoneId: "z", zoneCode: "V01", cycleId: "c", harvestedAt: "2026-11-08T08:00:00+07:00", recordedByName: "Nhân viên", laneNumbers: [1], finishedLaneNumbers: [], cageCount: 2, kgPerCage: 50, estimatedKg: 100,
  figures: { invoicedKg: 0, soldKg: 0, returnedKg: 0, remainingKg: 100, lostKg: 0, differenceKg: 0, notFinal: true }, photos: [], rowVersion: "v", statusId: 2904, status: "AwaitingWeighing", weighedKg: null, canWeigh: true, canCorrect: false, productLines: [], ...patch } });

it("offers Cân on a lot awaiting weighing and opens the weighing in place", async () => {
  read.mockResolvedValue(lot());
  render(<ToastProvider><HarvestLotPreview id="lot" zoneId="z" onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  expect(await screen.findByText("Chờ cân")).toBeTruthy();
  expect(screen.getByText("Chưa cân")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Cân" }));
  expect(await screen.findByLabelText("Kg cân thực tế")).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
});

it("shows the weighed kg and offers Cân lại once weighed, and nothing when the API does not allow weighing", async () => {
  read.mockResolvedValue(lot({ statusId: 2901, status: "Open", weighedKg: 98.5, weighedAt: "2026-11-08T09:00:00+07:00", weighedByName: "Chủ" }));
  const { unmount } = render(<ToastProvider><HarvestLotPreview id="lot" zoneId="z" onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  expect(await screen.findByText("98,5 kg")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Cân lại" })).toBeTruthy();
  unmount();
  read.mockResolvedValue(lot({ statusId: 2903, status: "Closed", weighedKg: 98.5, canWeigh: false }));
  render(<ToastProvider><HarvestLotPreview id="lot" zoneId="z" onClose={() => {}} onSaved={() => {}} /></ToastProvider>);
  await screen.findByText("Đã đóng");
  expect(screen.queryByRole("button", { name: /^Cân/ })).toBeNull();
});
