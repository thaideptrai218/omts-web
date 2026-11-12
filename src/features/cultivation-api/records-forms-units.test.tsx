// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write, upload } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./records-shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("./records-shared")>();
  return { ...original, seedRepo: { read, write, upload }, harvestRepo: { read, write, upload }, useAllowed: () => () => true };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("./harvest-crew-picker", () => ({ HarvestCrewPicker: ({ onChange }: { onChange(ids: string[]): void }) => <button type="button" onClick={() => onChange(["00000000-0000-4000-8000-000000000001"])}>Chọn An cùng thu</button> }));
// jsdom cannot decode images; the picker only needs the file back.
vi.mock("@/components/form/photo-compression", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/components/form/photo-compression")>()), compressPhoto: async (file: File) => file }));
import { attachPhoto, selectLane } from "./record-form-test-helpers";
import { SeedingForm } from "./records-seeding-form";
import { HarvestForm } from "./records-harvest-form";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const seedData = { cycleId: "c", raftId: "r", raftCode: "B1", seedingCompletedOn: null, laneCount: 2, seededCount: 0, notSeededLanes: [1, 2], canRecord: true, canMarkComplete: false, lanes: [{ laneNumber: 1, canSeed: true }], records: [], lots: [], cycleRowVersion: "v" };
const lotId = "00000000-0000-4000-8000-000000000011";

describe("seeding form units and date window", () => {
  it("excludes incident lanes even when the legacy canSeed flag is true", async () => {
    read.mockResolvedValue({ status: "success", data: { raftId: "r", lots: [] } });
    const data = { ...seedData, lanes: [{ laneNumber: 1, canSeed: true, isDamaged: true }, { laneNumber: 2, canSeed: true, statusId: 2002 }, { laneNumber: 3, canSeed: true, state: "OutOfService" }] };
    render(<ToastProvider><SeedingForm zoneId="z" raftId="r" cycleId="c" data={data} record={null} allowed={() => true} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
    expect(await screen.findByText("Không có làn đủ điều kiện.")).toBeTruthy();
    expect(screen.queryByRole("checkbox", { name: /^Làn/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Làn \d+:/ })).toBeNull();
  });
  it("shows the catalogue unit of the chosen seed lot next to the quantity and never a hard-coded word", async () => {
    read.mockResolvedValue({ status: "success", data: { raftId: "r", lots: [{ id: lotId, code: "PN1-1", receiptCode: "PN1", supplierName: "NCC", unit: "mảnh", itemName: "Giống hàu", quantityReceived: 100, quantitySeeded: 0, boughtForThisRaft: true, onHand: 80 }] } });
    render(<ToastProvider><SeedingForm zoneId="z" raftId="r" cycleId="c" data={seedData} record={null} allowed={() => true} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
    await screen.findByRole("option", { name: /PN1-1/ });
    fireEvent.change(screen.getByLabelText("Lô giống *"), { target: { value: lotId } });
    expect((await screen.findAllByText("mảnh")).length).toBeGreaterThan(0);
    expect(screen.getByText("Còn 80 mảnh trong lô")).toBeTruthy();
    expect(screen.queryByText("con")).toBeNull();
  });
  it("refuses a seeding date before the cycle start without calling the API", async () => {
    read.mockResolvedValue({ status: "success", data: { raftId: "r", lots: [{ id: lotId, code: "PN1-1", receiptCode: "PN1", supplierName: "NCC", unit: "mảnh", itemName: "Giống hàu", quantityReceived: 100, quantitySeeded: 0, boughtForThisRaft: true }] } });
    render(<ToastProvider><SeedingForm zoneId="z" raftId="r" cycleId="c" cycleStartDate="2999-01-01" data={seedData} record={null} allowed={() => true} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
    await screen.findByRole("option", { name: /PN1-1/ });
    fireEvent.change(screen.getByLabelText("Lô giống *"), { target: { value: lotId } });
    fireEvent.change(screen.getByLabelText("Số lượng giống *"), { target: { value: "5" } });
    await selectLane(1);
    await attachPhoto();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    // The date field itself refuses a date outside the window (native validation blocks the submit), before any backdate message of the form.
    expect(await screen.findByText("Ngày phải từ 01/01/2999.")).toBeTruthy();
    expect(screen.getByLabelText("Ngày thả giống *").getAttribute("aria-invalid")).toBe("true");
    expect(upload).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
  });
});

describe("harvest form lanes and cages", () => {
  const orderId = "00000000-0000-4000-8000-0000000000aa";
  const orders = [{ id: orderId, code: "YC-1", customerName: "Khách A", productName: "Hàu", acceptedCages: 10, harvestedCages: 0, pickupDate: "2026-11-15", workDate: null, plannedOnRaft: true }];
  const data = { raftId: "r", raftCode: "B1", cycle: null, averageKgPerCage: 50, canRecordHarvest: true, lots: [], orders, lanes: [
    { laneNumber: 1, canHarvest: true, state: "BeingHarvested" as const },
    { laneNumber: 2, canHarvest: false, state: "Harvested" as const, reasonCode: "AlreadyHarvested" },
    { laneNumber: 3, canHarvest: false, state: "NotSeeded" as const, reasonCode: "NotSeeded" },
  ] };
  it("sends the selected crew ids and leaves the field out when nobody is picked", async () => {
    upload.mockResolvedValue({ status: "success", data: { lot: { id: lotId, lotCode: "L01" }, warnings: [] } });
    render(<ToastProvider><HarvestForm zoneId="z" raftId="r" data={data} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Chọn An cùng thu" }));
    await selectLane(1);
    await attachPhoto();
    fireEvent.change(screen.getByLabelText("Số lồng thu hoạch *"), { target: { value: "0,5" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(upload).toHaveBeenCalledWith("harvest-record", [expect.any(File)], expect.objectContaining({ purchaseRequestId: orderId, cageCount: 0.5, crew: ["00000000-0000-4000-8000-000000000001"] }), expect.anything(), "r", "z"));
  });
  it("shows the harvestable lanes first and keeps blocked lanes disabled with the reason once revealed", () => {
    render(<ToastProvider><HarvestForm zoneId="z" raftId="r" data={data} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
    expect((screen.getByRole("button", { name: /^Làn 1: Đang thu/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByRole("button", { name: /^Làn 2:/ })).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: /Hiện cả làn không thu được/ }));
    expect((screen.getByRole("button", { name: /^Làn 2:/ }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /^Làn 3:/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /^Làn 2: Đã thu · .*Làn đã thu xong\./ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Làn 3: Chưa thả · .*Làn chưa thả giống nên chưa thể thu hoạch\./ })).toBeTruthy();
  });
  it("accepts half a cage, states the kg is an estimate and keeps Bỏ qua from submitting", () => {
    render(<ToastProvider><HarvestForm zoneId="z" raftId="r" data={data} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
    fireEvent.change(screen.getByLabelText("Số lồng thu hoạch *"), { target: { value: "0,5" } });
    expect(screen.getByText(/0,5 lồng ≈ 25 kg ước tính/)).toBeTruthy();
    expect(screen.getAllByText("lồng").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Bỏ qua" }).getAttribute("type")).toBe("button");
    expect(screen.getByRole("button", { name: "Lưu" }).getAttribute("type")).toBe("submit");
    expect(upload).not.toHaveBeenCalled();
  });
});
