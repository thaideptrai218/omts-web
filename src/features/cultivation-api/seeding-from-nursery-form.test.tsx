// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write, upload } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./records-shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("./records-shared")>();
  return { ...original, seedRepo: { read, write, upload }, useAllowed: () => () => true };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
// jsdom cannot decode images; the picker only needs the file back.
vi.mock("@/components/form/photo-compression", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/components/form/photo-compression")>()), compressPhoto: async (file: File) => file }));
import { attachPhoto, selectLane } from "./record-form-test-helpers";
import { SeedingForm } from "./records-seeding-form";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const cycleId = "00000000-0000-4000-8000-000000000022";
const base = { cycleId, raftId: "r", raftCode: "B1", seedingCompletedOn: null, laneCount: 2, seededCount: 0, notSeededLanes: [1, 2], canRecord: true, canMarkComplete: true, lanes: [{ laneNumber: 1, canSeed: true }], records: [], lots: [], cycleRowVersion: "v" };
const nursery = { ...base, nurseryBatchId: "b", nurseryCode: "NU000001", nurseryAllocated: 4800, nurserySeeded: 0, nurseryRemaining: 4800 };

function open(data: typeof nursery) {
  render(<ToastProvider><SeedingForm zoneId="z" raftId="r" cycleId={cycleId} data={data} record={null} allowed={() => true} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
}

// Owner decision of 13/11/2026: a seeding from a nursery hangs the whole share transferred to the raft, so its quantity is not chosen.
describe("seeding from a nursery cycle uses the full transferred quantity", () => {
  it("shows the quantity read-only, has no quantity input or seed lot, and sends the whole remaining share", async () => {
    upload.mockResolvedValue({ status: "success", data: { record: { id: cycleId } } });
    open(nursery);

    expect(screen.getByText("Số lượng thả: 4.800 mảnh · toàn bộ phần đã chuyển sang bè (không chọn số lượng)")).toBeTruthy();
    expect(screen.getByText("Đợt ươm NU000001 · Còn 4.800 trên 4.800 mảnh đã chuyển")).toBeTruthy();
    expect(screen.queryByLabelText(/Số lượng giống/)).toBeNull();
    expect(screen.queryByLabelText(/Lô giống/)).toBeNull();
    await selectLane(1);
    await attachPhoto();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));

    await vi.waitFor(() => expect(upload).toHaveBeenCalled());
    const sent = upload.mock.calls[0][2];
    expect(sent.quantity).toBe(4800);
    expect(sent.seedLotId).toBeUndefined();
    expect(sent.laneNumbers).toEqual([1]);
  });

  it("says everything was hung and disables saving when nothing is left of the transferred share", () => {
    open({ ...nursery, nurserySeeded: 4800, nurseryRemaining: 0 });

    expect(screen.getByText("Đã thả hết phần đã chuyển sang bè")).toBeTruthy();
    expect(screen.queryByText(/Số lượng thả:/)).toBeNull();
    expect((screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the refusal of the backend when it says the whole share must be used", async () => {
    upload.mockResolvedValue({ status: "error", httpStatus: 400, code: "MSG-GEN-09", uncertain: false, problem: { code: "MSG-GEN-09", reasonCode: "NURSERY_SEEDING_MUST_USE_FULL_ALLOCATION", field: "Quantity", remaining: 4750 } });
    open(nursery);
    await selectLane(1);
    await attachPhoto();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Thả giống phải dùng đủ phần đã chuyển sang bè: còn 4.750 mảnh");
    expect(alert.textContent).toContain("sửa số sống sót hoặc chuyển lại số mảnh giữa các bè");
  });

  it("keeps the free quantity and the seed lot for a cycle that has no nursery", async () => {
    read.mockResolvedValue({ status: "success", data: { raftId: "r", lots: [] } });
    render(<ToastProvider><SeedingForm zoneId="z" raftId="r" cycleId={cycleId} data={base} record={null} allowed={() => true} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);

    expect(await screen.findByLabelText("Số lượng giống *")).toBeTruthy();
    expect(screen.getByLabelText("Lô giống *")).toBeTruthy();
    expect(screen.queryByText(/toàn bộ phần đã chuyển sang bè/)).toBeNull();
  });
});
