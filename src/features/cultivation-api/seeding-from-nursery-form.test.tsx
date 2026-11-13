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
import { seedingList } from "./records-contracts";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const cycleId = "00000000-0000-4000-8000-000000000022";
const lanes = [{ laneNumber: 1, seededPercent: 100, remainingPercent: 0 }, { laneNumber: 2, seededPercent: 40, remainingPercent: 60 }, { laneNumber: 3 }];
const base = { cycleId, raftId: "00000000-0000-4000-8000-000000000033", raftCode: "B1", laneCount: 3, seededCount: 2, notSeededLanes: [3], canRecord: true, canMarkComplete: true, lanes, cycleRowVersion: "v" };
const nursery = seedingList.parse({ ...base, nurseryBatchId: "b", nurseryCode: "NU000008", nurseryRemaining: 6000, nurserySeeded: 500, seedLot: { itemName: "Hàu giống" }, seedableLaneNumbers: [2, 3] });

function open(data = nursery) {
  render(<ToastProvider><SeedingForm zoneId="z" raftId="r" cycleId={cycleId} data={data} record={null} allowed={() => true} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
}
const type = (value: string) => fireEvent.change(screen.getByLabelText("Số mảnh lấy hôm nay *"), { target: { value } });
const save = async () => { fireEvent.click(screen.getByRole("button", { name: "Lưu" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" })); };

// Model V2 (13/11/2026): the daily quantity is free, capped only by the nursery pool; lanes at 100% are not offered again.
describe("seeding from a nursery cycle takes a free daily quantity from the batch pool", () => {
  it("shows the read-only source line, asks for the pieces taken today and sends them without a seed lot", async () => {
    upload.mockResolvedValue({ status: "success", data: { record: { id: cycleId } } });
    open();

    expect(screen.getByText("Giống: NU000008 · Hàu giống · kho ươm còn 6.000 mảnh (ước tính)")).toBeTruthy();
    expect(screen.queryByLabelText(/Lô giống/)).toBeNull();
    type("500");
    await selectLane(2);
    await attachPhoto();
    await save();

    await vi.waitFor(() => expect(upload).toHaveBeenCalled());
    const sent = upload.mock.calls[0][2];
    expect(sent).toMatchObject({ quantity: 500, laneNumbers: [2] });
    expect(sent.seedLotId).toBeUndefined();
  });

  it("refuses more pieces than the pool holds, in the quantity field, and sends nothing", async () => {
    open();
    type("6500");
    await selectLane(2);
    await attachPhoto();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));

    expect((await screen.findAllByText(/Chỉ còn 6\.000 mảnh trong kho ươm/)).length).toBeGreaterThan(0);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(upload).not.toHaveBeenCalled();
  });

  it("does not offer a lane already at 100% but keeps the partly seeded and untouched ones", async () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Chọn" }));
    expect(await screen.findByRole("checkbox", { name: /^Làn 2:/ })).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: /^Làn 3:/ })).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /^Làn 1:/ })).toBeNull();
  });

  it("defaults the lane percent to what is left of the lane and refuses more than that", async () => {
    open();
    await selectLane(2);
    await selectLane(3);

    expect((screen.getByLabelText("Làn 2") as HTMLInputElement).value).toBe("60");
    expect((screen.getByLabelText("Làn 3") as HTMLInputElement).value).toBe("100");
    fireEvent.change(screen.getByLabelText("Làn 2"), { target: { value: "70" } });
    expect((await screen.findAllByText("Làn 2 chỉ còn 60% có thể thả.")).length).toBeGreaterThan(0);
  });

  it("shows the pool refusal of the backend at the quantity field with what is left", async () => {
    upload.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false, problem: { code: "MSG-GEN-09", reasonCode: "NURSERY_POOL_EXCEEDED", field: "Quantity", remaining: 400 } });
    open();
    type("500");
    await selectLane(2);
    await attachPhoto();
    await save();

    expect((await screen.findAllByText(/Chỉ còn 400 mảnh trong kho ươm/)).length).toBeGreaterThan(0);
  });

  it("keeps the free quantity and the seed lot for a cycle that has no nursery", async () => {
    read.mockResolvedValue({ status: "success", data: { raftId: "r", lots: [] } });
    open(seedingList.parse(base));

    expect(await screen.findByLabelText("Số lượng giống *")).toBeTruthy();
    expect(screen.getByLabelText("Lô giống *")).toBeTruthy();
    expect(screen.getByText("Không qua ươm")).toBeTruthy();
    expect(screen.queryByLabelText("Số mảnh lấy hôm nay *")).toBeNull();
  });
});
