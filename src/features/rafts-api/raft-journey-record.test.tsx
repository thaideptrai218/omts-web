// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({ harvestRead: vi.fn(), seedRead: vi.fn() }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("@/features/cultivation-api/records-shared", () => ({ harvestRepo: { read: mocks.harvestRead }, seedRepo: { read: mocks.seedRead }, useAllowed: () => () => true }));
vi.mock("@/features/cultivation-api/records-harvest-lane-form", () => ({ HarvestLaneForm: ({ raftId, zoneId, data, onSaved, onClose }: { raftId: string; zoneId: string; data: { lanes: unknown[] }; onSaved(): void; onClose(): void }) =>
  <div role="dialog" aria-label="Ghi nhận chuyến thu hoạch"><p>Chọn làn · {data.lanes.length} làn · {zoneId} · {raftId}</p><button type="button" onClick={onSaved}>Lưu</button><button type="button" onClick={onClose}>Bỏ qua</button></div> }));
vi.mock("@/features/cultivation-api/records-seeding-form", () => ({ SeedingForm: ({ cycleId, onSaved }: { cycleId: string; onSaved(): void }) => <div role="dialog" aria-label="Ghi nhận thả giống"><p>cycle {cycleId}</p><button type="button" onClick={onSaved}>Lưu</button></div> }));
vi.mock("@/features/cultivation-api/records-complete-seeding-dialog", () => ({ CompleteSeeding: ({ onSaved }: { onSaved(): void }) => <div role="dialog" aria-label="Hoàn tất thả giống"><button type="button" onClick={onSaved}>Hoàn tất</button></div> }));
import { JourneyRecordDialog } from "./raft-journey-record";

const zoneId = "00000000-0000-4000-8000-000000000001", raftId = "00000000-0000-4000-8000-0000000000a1", cycleId = "00000000-0000-4000-8000-0000000000c1";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = (key: string, screenName: "seeding" | "harvest", over: { onDone?(): void; onClose?(): void } = {}) =>
  render(<JourneyRecordDialog action={{ key, label: "x", screen: screenName }} zoneId={zoneId} raftId={raftId} cycleId={cycleId} onClose={over.onClose ?? vi.fn()} onDone={over.onDone ?? vi.fn()} />);

describe("recording from the journey, in place", () => {
  it("opens the harvest form with lane selection for this raft and tells the tab once it is saved", async () => {
    mocks.harvestRead.mockResolvedValue({ status: "success", data: { lanes: [{ laneNumber: 1 }, { laneNumber: 2 }], lots: [] } });
    const onDone = vi.fn();
    mount("journey-harvest", "harvest", { onDone });
    expect(await screen.findByText(`Chọn làn · 2 làn · ${zoneId} · ${raftId}`)).toBeTruthy();
    expect(mocks.harvestRead).toHaveBeenCalledWith("list", { id: raftId, zoneId }, expect.anything(), expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });
  it("closes without reloading when the harvest form is dismissed, and offers a retry when its list cannot be read", async () => {
    mocks.harvestRead.mockResolvedValueOnce({ status: "error", httpStatus: 500, uncertain: false }).mockResolvedValueOnce({ status: "success", data: { lanes: [], lots: [] } });
    const onDone = vi.fn(), onClose = vi.fn();
    mount("journey-harvest", "harvest", { onDone, onClose });
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
    fireEvent.click(await screen.findByRole("button", { name: "Bỏ qua" }));
    expect(onClose).toHaveBeenCalledTimes(1); expect(onDone).not.toHaveBeenCalled();
  });
  it("opens the seeding form for the open cycle, or the completion dialog for Hoàn tất thả giống", async () => {
    mocks.seedRead.mockResolvedValue({ status: "success", data: { records: [], nurseryBatchId: null } });
    mount("journey-seeding-record", "seeding");
    expect(await screen.findByText(`cycle ${cycleId}`)).toBeTruthy();
    cleanup();
    mount("journey-seeding-complete", "seeding");
    expect(await screen.findByRole("dialog", { name: "Hoàn tất thả giống" })).toBeTruthy();
  });
});
