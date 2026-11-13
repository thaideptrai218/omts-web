// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write, upload } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), upload: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./records-shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("./records-shared")>();
  return { ...original, harvestRepo: { read, write, upload }, useAllowed: () => () => true };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
// jsdom cannot decode images; the picker only needs the file back.
vi.mock("@/components/form/photo-compression", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/components/form/photo-compression")>()), compressPhoto: async (file: File) => file }));
import { attachPhoto, selectLane } from "./record-form-test-helpers";
import { HarvestForm } from "./records-harvest-form";
import { HarvestLanesBoard } from "./harvest-lanes-board";
import { HarvestPlanSummary, harvestProgressOf } from "./harvest-plan-summary";
import { harvestEstimate } from "./harvest-estimate-hint";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const cycle = { id: "00000000-0000-4000-8000-000000000009", startDate: "2026-10-02", closeDate: null, statusId: 1, status: "Open", rowVersion: "v" };
const lane = (laneNumber: number, patch: object = {}) => ({ laneNumber, canHarvest: true, state: "BeingHarvested" as const, canFinish: true, lotCount: 2, harvestedCages: 4, ...patch });
const orderId = "00000000-0000-4000-8000-0000000000aa";
const order = { id: orderId, code: "YC-20261112-AAAA", customerName: "Khách A", productName: "Hàu thương phẩm", acceptedCages: 20, harvestedCages: 4, pickupDate: "2026-11-15", workDate: null, plannedOnRaft: true };
const screenData = (patch: object = {}) => ({ raftId: "r", raftCode: "B1", cycle, averageKgPerCage: 50, canRecordHarvest: true, lots: [], orders: [order], lanes: [lane(1), lane(2, { canFinish: false, canHarvest: false, state: "Harvested", reasonCode: "AlreadyHarvested" })],
  harvestedCages: 6, harvestedKg: 300, targetYieldKg: 1000, remainingKg: 700, ...patch });
const wrap = (node: React.ReactNode) => render(<ToastProvider>{node}</ToastProvider>);

describe("planned vs actual vs remaining (kg first, estimate)", () => {
  it("shows the progress bar, the estimate label and the remaining kg", () => {
    wrap(<HarvestPlanSummary data={screenData()} />);
    expect(screen.getByRole("progressbar", { name: /Sản lượng so với dự kiến/ }).getAttribute("aria-valuenow")).toBe("30");
    expect(screen.getByText("(ước tính)")).toBeTruthy();
    expect(screen.getByText(/300 \/ 1\.000 kg ước tính/)).toBeTruthy();
    expect(screen.getByText(/Đã thu 6 lồng. Còn 700 kg so với mục tiêu/)).toBeTruthy();
    expect(screen.queryByText("Vượt dự kiến")).toBeNull();
  });
  it("falls back to the lots for an older backend and says so when there is no target", () => {
    const old = screenData({ harvestedCages: undefined, harvestedKg: undefined, targetYieldKg: undefined, remainingKg: undefined, lots: [{ cageCount: 2.5, estimatedKg: 125 }] });
    expect(harvestProgressOf(old as never)).toMatchObject({ harvestedKg: 125, harvestedCages: 2.5, target: null, remainingKg: null });
    wrap(<HarvestPlanSummary data={old as never} />);
    expect(screen.getByText(/Chu kỳ chưa đặt sản lượng mục tiêu/)).toBeTruthy();
  });
  it("shows going over the target as neutral information: 700 of 500 kg is 140%, no warning wording", () => {
    wrap(<HarvestPlanSummary data={screenData({ harvestedKg: 700, targetYieldKg: 500, remainingKg: -200, targetPercent: 140, overTarget: true })} />);
    expect(screen.getByText(/700 \/ 500 kg ước tính/)).toBeTruthy();
    expect(screen.getByText("(140%)")).toBeTruthy();
    expect(screen.getByText("Vượt dự kiến")).toBeTruthy();
    expect(screen.getByText(/Cao hơn mục tiêu 200 kg/)).toBeTruthy();
    expect(screen.getByTestId("harvest-plan-summary").textContent).not.toMatch(/kiểm tra lại|cảnh báo/i);
    expect(screen.getByTestId("harvest-plan-summary").innerHTML).not.toContain("text-warning");
  });
  it("derives the percent for a backend that does not send it and adds the trip being typed without blocking", () => {
    expect(harvestProgressOf(screenData({ harvestedKg: 600, targetYieldKg: 500, remainingKg: undefined }) as never)).toMatchObject({ percent: 120, overTarget: true, remainingKg: -100 });
    wrap(<HarvestPlanSummary data={screenData({ harvestedKg: 900 })} extraKg={200} />);
    expect(screen.getByRole("status").textContent).toContain("1.100 kg ước tính (110% dự kiến)");
  });
});

describe("estimate = cages x kg per cage with the source", () => {
  it("computes, prefers a typed estimate and flags one far from cages", () => {
    expect(harvestEstimate(4, "", 50)).toMatchObject({ computed: 200, effective: 200, far: false, typed: false });
    expect(harvestEstimate(0.5, "", 50)).toMatchObject({ computed: 25, effective: 25 });
    expect(harvestEstimate(4, "190", 50)).toMatchObject({ effective: 190, far: false, typed: true });
    expect(harvestEstimate(4, "30", 50).far).toBe(true);
    expect(harvestEstimate(4, "401", 50).far).toBe(true);
    expect(harvestEstimate(Number.NaN, "", 50).computed).toBe(0);
  });
  it("names the source of kg per cage in the form", () => {
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData()} onClose={vi.fn()} onSaved={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Số lồng thu hoạch *"), { target: { value: "4" } });
    expect(screen.getByText(/Nguồn: 4 lồng × 50 kg\/lồng \(thiết lập thu hoạch/)).toBeTruthy();
    expect(screen.getByText(/4 lồng ≈ 200 kg ước tính/)).toBeTruthy();
  });
});

describe("one finish action per lane", () => {
  it("offers Hoàn tất thu hoạch only on a lane that can be finished and asks to confirm", async () => {
    write.mockResolvedValue({ status: "success", data: { laneNumber: 1, state: "Harvested", changed: true, everySeededLaneHarvested: false } });
    const onChanged = vi.fn();
    wrap(<HarvestLanesBoard data={screenData()} zoneId="z" raftId="r" canFinish onChanged={onChanged} />);
    expect(screen.getAllByRole("button", { name: "Hoàn tất thu hoạch" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất thu hoạch" }));
    expect(write).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(write.mock.calls[0].slice(0, 2)).toEqual(["finish-lane", { laneNumber: 1 }]);
    expect(write.mock.calls[0].slice(3)).toEqual(["r", "z"]);
    expect(await screen.findByText("Đã hoàn tất thu hoạch làn 1.")).toBeTruthy();
  });
  it("does not offer it without permission or against an older backend that does not report canFinish", () => {
    wrap(<HarvestLanesBoard data={screenData()} zoneId="z" raftId="r" canFinish={false} onChanged={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Hoàn tất thu hoạch" })).toBeNull();
    cleanup();
    wrap(<HarvestLanesBoard data={screenData({ lanes: [lane(1, { canFinish: undefined })] })} zoneId="z" raftId="r" canFinish onChanged={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Hoàn tất thu hoạch" })).toBeNull();
  });
  it("shows the failure of a finish inside the board", async () => {
    write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false });
    wrap(<HarvestLanesBoard data={screenData()} zoneId="z" raftId="r" canFinish onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất thu hoạch" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    expect((await screen.findByRole("alert")).textContent).toContain("Trạng thái hiện tại không cho phép");
  });
});

describe("the form follows the backend that answers", () => {
  it("drops the second lane chooser once lanes report canFinish and keeps it for an older backend", () => {
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData()} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByText("Xác nhận làn đã thu xong")).toBeNull();
    cleanup();
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData({ lanes: [lane(1, { canFinish: undefined })] })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText("Xác nhận làn đã thu xong")).toBeTruthy();
  });
});

const fillTrip = async () => {
  await selectLane(1);
  await attachPhoto();
  fireEvent.change(screen.getByLabelText("Số lồng thu hoạch *"), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
};
describe("recording a trip above the plan (the plan is not a cap)", () => {
  it("sends the purchase request with the trip and saves a 700 kg trip against a 500 kg target with no confirmation, keeping warnings as notices", async () => {
    upload.mockResolvedValueOnce({ status: "success", data: { lot: { id: "x", lotCode: "KV01-B01-20261112" }, warnings: [{ code: "ESTIMATED_KG_FAR_FROM_CAGES", details: { workedKg: 400, minKg: 80, maxKg: 800 } }] } });
    const onSaved = vi.fn();
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData({ harvestedKg: 500, targetYieldKg: 500, remainingKg: 0 })} onClose={vi.fn()} onSaved={onSaved} />);
    await fillTrip();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledTimes(1);
    // One mandatory photo goes with the trip; the harvest % of a picked lane is filled with what is left on it (100 for an untouched lane).
    expect(upload.mock.calls[0][1]).toHaveLength(1);
    expect(upload.mock.calls[0][2]).toEqual({ purchaseRequestId: orderId, lanePercents: { "1": 100 }, laneNumbers: [1], finishedLaneNumbers: [], cageCount: 8, estimatedKg: null });
    expect(screen.queryByRole("alert", { name: "Xác nhận vượt kế hoạch" })).toBeNull();
    expect(await screen.findByText(/Kg ước tính \(400 kg\) lệch nhiều so với số lồng/)).toBeTruthy();
  });
  it("lists the purchase requests, picks the one planned on the raft and cannot save without any", () => {
    const second = { ...order, id: "00000000-0000-4000-8000-0000000000bb", code: "YC-20261112-BBBB", plannedOnRaft: false };
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData({ orders: [second, order] })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect((screen.getByLabelText("Đơn mua cần thu *") as HTMLSelectElement).value).toBe(orderId);
    cleanup();
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData({ orders: [] })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText(/Chưa có đơn mua nào cần thu/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("names the field the backend refused instead of the generic message", async () => {
    upload.mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false, problem: { code: "MSG-GEN-01", field: "Purchase request", fields: ["Purchase request"] } });
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData()} onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillTrip();
    await waitFor(() => expect(screen.getAllByRole("alert").map(a => a.textContent).join(" | ")).toContain("đơn mua"));
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
