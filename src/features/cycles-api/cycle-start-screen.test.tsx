// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), available: vi.fn() }));
/** Every cycle read stays pending (the panels under test do not need it) except the nursery batches of the start form. */
const readCycles = (query: { action: string }, ...rest: unknown[]) => query.action === "nursery-available" ? mocks.available(query, ...rest) : mocks.read(query, ...rest);
const raftId = "00000000-0000-4000-8000-0000000000a1", zoneId = "00000000-0000-4000-8000-000000000001", cycleId = "00000000-0000-4000-8000-0000000000c1";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./repository", () => ({ readCycles: (...args: [{ action: string }]) => readCycles(...args), writeCycle: mocks.write, readCycleSummary: vi.fn(() => new Promise(() => undefined)), readClosePreview: vi.fn(), closeCycle: vi.fn() }));
vi.mock("@/features/history/record-history", () => ({ RecordHistory: () => null }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <section role="dialog" aria-label={title}>{children}</section> }));
import { CyclePlanTab } from "./cycle-plan-tab";
import type { CycleRow } from "./cycle-model";

const access = { view: true, create: true, edit: true, remove: true, logs: true, logsCreate: true, logsEdit: true };
const closed = { id: cycleId, startDate: "2026-09-01", closeDate: "2026-10-30", statusId: 602, status: "Closed", rowVersion: "A", nurseryBatchId: null };
const row = (patch: Partial<CycleRow> = {}): CycleRow => ({ raftId, raftCode: "B1-11", raftStatusId: 101, raftStatus: "In Use", laneCount: 12, cycle: null, lastCloseDate: null, canStart: true, canEdit: false, canCancel: false, ...patch });
beforeEach(() => {
  mocks.read.mockImplementation(() => new Promise(() => undefined));
  mocks.available.mockResolvedValue({ status: "success", data: [{ id: "00000000-0000-4000-8000-0000000000b1", code: "NU000007", name: "Hàu giống", remaining: 9500 }] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState(null, "", "/"); });

describe("Kế hoạch tab: the nursed batch", () => {
  const progress = (cycle: object) => ({ status: "success", data: { raftId, raftCode: "B1-11", date: "2026-11-13", notSeededLanes: [], lanes: [{ id: cycleId, laneNumber: 1, statusId: 1, status: "x", state: "NotSeeded" }],
    cycle: { id: cycleId, raftId, raftCode: "B1-11", startDate: "2026-11-12", closeDate: null, statusId: 601, status: "Open", rowVersion: "AAAA", expectedSeedQuantity: null, targetYieldKg: 2000, seedingCompletedOn: null, assessment: null,
      closedEarly: false, daysOfFarming: 1, canEdit: true, canCancel: true, note: null, nurseryBatchId: "00000000-0000-4000-8000-0000000000b1", nurseryCode: "NU000007", seedLot: { itemName: "Hàu giống" }, nurserySeeded: 0, nurseryRemaining: 9500, ...cycle } } });
  const mountPlan = async (cycle: object) => {
    mocks.read.mockResolvedValue(progress(cycle));
    render(<ToastProvider><CyclePlanTab row={row({ canStart: false, canEdit: true, cycle: { ...closed, closeDate: null, nurseryBatchId: "00000000-0000-4000-8000-0000000000b1" } })} zoneId={zoneId} access={access} dirtyRef={{ current: false }} onChanged={vi.fn()} /></ToastProvider>);
    await screen.findByText("NU000007 · Hàu giống · kho ươm còn 9.500 mảnh");
  };
  it("shows the batch read-only and lets the owner change it while nothing was seeded", async () => {
    await mountPlan({});
    expect(screen.getByText("Sản lượng dự kiến")).toBeTruthy();
    expect(screen.queryByText("Đã thả giống, không đổi được đợt ươm")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    expect(await screen.findByRole("combobox", { name: "Đợt ươm (loại giống đã ươm) *" })).toBeTruthy();
    expect(screen.getByLabelText("Sản lượng dự kiến (kg) *")).toBeTruthy();
    expect(mocks.available).toHaveBeenCalled();
  });
  it("locks the batch with the reason once the cycle took seed, but still edits the yield", async () => {
    await mountPlan({ nurserySeeded: 3000 });
    expect(screen.getByText("Đã thả giống, không đổi được đợt ươm")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    await waitFor(() => expect(screen.getByLabelText("Sản lượng dự kiến (kg) *")).toBeTruthy());
    expect(screen.queryByRole("combobox", { name: "Đợt ươm (loại giống đã ươm) *" })).toBeNull();
    expect((screen.getByLabelText("Đợt ươm") as HTMLInputElement).readOnly).toBe(true);
    expect(mocks.available).not.toHaveBeenCalled();
  });
});
