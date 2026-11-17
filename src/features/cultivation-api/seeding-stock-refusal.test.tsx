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
const lotId = "00000000-0000-4000-8000-000000000011", cycleId = "00000000-0000-4000-8000-000000000022";
const seedData = { cycleId, raftId: "r", raftCode: "B1", seedingCompletedOn: null, laneCount: 2, seededCount: 0, notSeededLanes: [1, 2], canRecord: true, canMarkComplete: true, lanes: [{ laneNumber: 1, canSeed: true }], records: [], lots: [], cycleRowVersion: "v" };
const lot = { id: lotId, code: "PN1-1", receiptCode: "PN1", supplierName: "NCC", unit: "mảnh", itemName: "Giống hàu", quantityReceived: 200, quantitySeeded: 20, boughtForThisRaft: true, onHand: 100 };

describe("seeding form shows the stock and explains the on-hand refusal", () => {
  async function fill() {
    read.mockResolvedValue({ status: "success", data: { raftId: "r", lots: [lot] } });
    render(<ToastProvider><SeedingForm zoneId="z" raftId="r" cycleId={cycleId} data={seedData} record={null} allowed={() => true} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
    await screen.findByRole("option", { name: /PN1-1/ });
    fireEvent.change(screen.getByLabelText("Lô giống *"), { target: { value: lotId } });
    fireEvent.change(screen.getByLabelText("Số lượng giống *"), { target: { value: "101" } });
    await selectLane(1);
    await attachPhoto();
  }
  it("puts the on-hand quantity in the lot option and warns while typing more than the stock", async () => {
    await fill();
    expect(screen.getByRole("option", { name: /PN1-1 · Giống hàu · NCC · còn 100 mảnh/ })).toBeTruthy();
    expect(screen.getByText(/Còn 100 mảnh trong lô. Số nhập đang lớn hơn tồn kho/)).toBeTruthy();
  });
  it("turns the MSG-INPUT-01 refusal into on hand and balance after, in the lot's unit", async () => {
    upload.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-INPUT-01", uncertain: false, problem: { code: "MSG-INPUT-01", field: "Quantity", onHand: 100, balanceAfter: -1 } });
    await fill();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Không đủ hàng trong kho");
    expect(alert.textContent).toContain("Còn trong kho 100 mảnh");
    expect(alert.textContent).toContain("còn -1 mảnh");
  });
});
