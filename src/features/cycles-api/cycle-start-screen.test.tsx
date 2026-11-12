// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const mocks = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), available: vi.fn() }));
/** Every cycle read stays pending (the panels under test do not need it) except the nursery batches of the start form. */
const readCycles = (query: { action: string }, ...rest: unknown[]) => query.action === "nursery-available" ? mocks.available(query, ...rest) : mocks.read(query, ...rest);
const raftId = "00000000-0000-4000-8000-0000000000a1", zoneId = "00000000-0000-4000-8000-000000000001", cycleId = "00000000-0000-4000-8000-0000000000c1";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./repository", () => ({ readCycles: (...args: [{ action: string }]) => readCycles(...args), writeCycle: mocks.write, readCycleSummary: vi.fn(() => new Promise(() => undefined)), readClosePreview: vi.fn(), closeCycle: vi.fn() }));
vi.mock("@/features/history/record-history", () => ({ RecordHistory: () => null }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children, title }: { children: ReactNode; title: string }) => <section role="dialog" aria-label={title}>{children}</section> }));
vi.mock("@/components/form/photo-picker", () => ({ PhotoPicker: ({ onChange }: { onChange(files: File[]): void }) => <button type="button" onClick={() => onChange([new File(["photo"], "plan.jpg", { type: "image/jpeg" })])}>Chọn ảnh kế hoạch</button> }));
import { CycleDetailPanel } from "./cycle-detail-panel";
import { CyclePlanTab } from "./cycle-plan-tab";
import type { CycleRow } from "./cycle-model";

const access = { view: true, create: true, edit: true, remove: true, logs: true, logsCreate: true, logsEdit: true };
const guard = { dirty: { current: false }, pending: { current: false }, leave: async (apply: () => void) => apply(), dialog: null } as never;
const closed = { id: cycleId, startDate: "2026-09-01", closeDate: "2026-10-30", statusId: 602, status: "Closed", rowVersion: "A", nurseryBatchId: null };
const row = (patch: Partial<CycleRow> = {}): CycleRow => ({ raftId, raftCode: "B1-11", raftStatusId: 101, raftStatus: "In Use", laneCount: 12, cycle: null, lastCloseDate: null, canStart: true, canEdit: false, canCancel: false, ...patch });
const panel = (props: { row?: CycleRow; create?: boolean; onChanged?: (notice: string) => void } = {}) =>
  render(<ToastProvider><CycleDetailPanel row={props.row ?? row()} zoneId={zoneId} zoneLabel="DEMO-01 · Vùng ươm" access={{ ...access, create: props.create ?? true }} guard={guard} onChanged={props.onChanged ?? vi.fn()} /></ToastProvider>);
const startButton = () => screen.queryByRole("button", { name: "Bắt đầu chu kỳ nuôi" });

beforeEach(() => {
  mocks.read.mockImplementation(() => new Promise(() => undefined));
  mocks.available.mockResolvedValue({ status: "success", data: [{ id: "00000000-0000-4000-8000-0000000000b1", code: "NU000007", name: "Hàu giống", remaining: 9500 }] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); window.history.replaceState(null, "", "/"); });

describe("Bắt đầu chu kỳ nuôi on the Hành trình screen", () => {
  it("offers the button as the empty state of a raft in use without a cycle, and the old 'created by nursery' pointer is gone", () => {
    panel();
    expect(screen.getByText("Bè này chưa có chu kỳ nuôi")).toBeTruthy();
    expect(startButton()).toBeTruthy();
    expect(screen.queryByText(/được tạo khi hoàn tất ươm/)).toBeNull();
  });
  it("offers the button in the header once the last cycle is closed", () => {
    mocks.read.mockImplementation(() => new Promise(() => undefined));
    panel({ row: row({ cycle: closed }) });
    expect(startButton()).toBeTruthy();
  });
  it("hides the button for a raft not in use, one with an open cycle, one the backend says cannot start, and without the Create permission", () => {
    panel({ row: row({ raftStatusId: 102 }) }); expect(startButton()).toBeNull(); cleanup();
    panel({ row: row({ cycle: { ...closed, closeDate: null, statusId: 601 }, canStart: false }) }); expect(startButton()).toBeNull(); cleanup();
    panel({ row: row({ canStart: false }) }); expect(startButton()).toBeNull(); cleanup();
    panel({ create: false }); expect(startButton()).toBeNull();
    expect(screen.getByText("Bè này chưa có chu kỳ nuôi")).toBeTruthy();
  });
  it("opens the form for this raft and zone, then selects the new cycle in the URL on Tổng hợp with a toast notice", async () => {
    mocks.write.mockResolvedValue({ status: "success", data: { cycle: { id: cycleId } } });
    const onChanged = vi.fn();
    panel({ onChanged }); fireEvent.click(startButton()!);
    const dialog = await screen.findByRole("dialog", { name: "Bắt đầu chu kỳ nuôi · B1-11" });
    expect((within(dialog).getByLabelText("Vùng nuôi") as HTMLInputElement).value).toBe("DEMO-01 · Vùng ươm");
    fireEvent.change(await within(dialog).findByRole("combobox", { name: "Đợt ươm (loại giống đã ươm) *" }), { target: { value: "00000000-0000-4000-8000-0000000000b1" } });
    fireEvent.change(within(dialog).getByLabelText("Sản lượng dự kiến (kg) *"), { target: { value: "2000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Chọn ảnh kế hoạch" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Tiếp tục" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận bắt đầu chu kỳ" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith("Đã bắt đầu chu kỳ nuôi"));
    expect(mocks.write.mock.calls[0].slice(0, 2)).toEqual(["start", raftId]);
    expect(new URLSearchParams(window.location.search).get("cycleId")).toBe(cycleId);
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("journey");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

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
