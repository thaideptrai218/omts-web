// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write, upload } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./records-shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("./records-shared")>();
  return { ...original, seedRepo: { read, write }, harvestRepo: { read, write, upload }, useAllowed: () => () => true };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
import { SeedingForm } from "./records-seeding-form";
import { HarvestForm } from "./records-harvest-form";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const seedData = { cycleId: "c", raftId: "r", raftCode: "B1", seedingCompletedOn: null, laneCount: 2, seededCount: 0, notSeededLanes: [1, 2], canRecord: true, canMarkComplete: false, lanes: [{ laneNumber: 1, canSeed: true }], records: [], lots: [], cycleRowVersion: "v" };
const lotId = "00000000-0000-4000-8000-000000000011";

describe("seeding form units and date window", () => {
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
    fireEvent.click(screen.getByRole("checkbox", { name: "Làn 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findAllByText(/không được sau hôm nay|không được trước ngày bắt đầu chu kỳ/)).not.toHaveLength(0);
    expect(write).not.toHaveBeenCalled();
  });
});

describe("harvest form lanes and cages", () => {
  const data = { raftId: "r", raftCode: "B1", cycle: null, averageKgPerCage: 50, canRecordHarvest: true, lots: [], lanes: [
    { laneNumber: 1, canHarvest: true, state: "BeingHarvested" as const },
    { laneNumber: 2, canHarvest: false, state: "Harvested" as const, reasonCode: "AlreadyHarvested" },
    { laneNumber: 3, canHarvest: false, state: "NotSeeded" as const, reasonCode: "NotSeeded" },
  ] };
  it("lists every lane with its state, keeps blocked lanes disabled with the reason and leaves BeingHarvested selectable", () => {
    render(<ToastProvider><HarvestForm zoneId="z" raftId="r" data={data} onClose={vi.fn()} onSaved={vi.fn()} /></ToastProvider>);
    expect((screen.getByRole("checkbox", { name: /Làn 1/ }) as HTMLInputElement).disabled).toBe(false);
    expect((screen.getByRole("checkbox", { name: /Làn 2/ }) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("checkbox", { name: /Làn 3/ }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Đang thu hoạch")).toBeTruthy();
    expect(screen.getByText("Làn đã thu xong.")).toBeTruthy();
    expect(screen.getByText("Làn chưa thả giống nên chưa thể thu hoạch.")).toBeTruthy();
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
