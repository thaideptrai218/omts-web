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
import { HarvestForm } from "./records-harvest-form";
import { HarvestLanesBoard } from "./harvest-lanes-board";
import { HarvestPlanSummary, harvestProgressOf } from "./harvest-plan-summary";
import { harvestEstimate } from "./harvest-estimate-hint";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const cycle = { id: "00000000-0000-4000-8000-000000000009", startDate: "2026-10-02", closeDate: null, statusId: 1, status: "Open", rowVersion: "v" };
const lane = (laneNumber: number, patch: object = {}) => ({ laneNumber, canHarvest: true, state: "BeingHarvested" as const, canFinish: true, lotCount: 2, harvestedCages: 4, ...patch });
const screenData = (patch: object = {}) => ({ raftId: "r", raftCode: "B1", cycle, averageKgPerCage: 50, canRecordHarvest: true, lots: [], lanes: [lane(1), lane(2, { canFinish: false, canHarvest: false, state: "Harvested", reasonCode: "AlreadyHarvested" })],
  harvestedCages: 6, harvestedKg: 300, targetYieldKg: 1000, remainingKg: 700, ...patch });
const wrap = (node: React.ReactNode) => render(<ToastProvider>{node}</ToastProvider>);

describe("planned vs actual vs remaining (kg first, estimate)", () => {
  it("shows the progress bar, the estimate label and the remaining kg", () => {
    wrap(<HarvestPlanSummary data={screenData()} />);
    expect(screen.getByRole("progressbar", { name: /Sản lượng thu hoạch/ }).getAttribute("aria-valuenow")).toBe("30");
    expect(screen.getByText("(ước tính)")).toBeTruthy();
    expect(screen.getByText(/Đã thu 6 lồng. Còn 700 kg để đạt mục tiêu/)).toBeTruthy();
  });
  it("falls back to the lots for an older backend and says so when there is no target", () => {
    const old = screenData({ harvestedCages: undefined, harvestedKg: undefined, targetYieldKg: undefined, remainingKg: undefined, lots: [{ cageCount: 2.5, estimatedKg: 125 }] });
    expect(harvestProgressOf(old as never)).toMatchObject({ harvestedKg: 125, harvestedCages: 2.5, target: null, remainingKg: null });
    wrap(<HarvestPlanSummary data={old as never} />);
    expect(screen.getByText(/Chu kỳ chưa đặt sản lượng mục tiêu/)).toBeTruthy();
  });
  it("warns, without blocking, that the trip being typed goes over the target", () => {
    wrap(<HarvestPlanSummary data={screenData({ harvestedKg: 900 })} extraKg={200} />);
    expect(screen.getByRole("status").textContent).toContain("vượt mục tiêu 1.000 kg");
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
  fireEvent.click(screen.getByRole("checkbox", { name: /Làn 1/ }));
  fireEvent.change(screen.getByLabelText("Số lồng thu hoạch *"), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
  fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
};
describe("over-plan confirmation inside the form", () => {
  const question = { status: "error", httpStatus: 409, code: "MSG-GEN-04", uncertain: false, problem: { code: "MSG-GEN-04", confirmFlag: "confirmOverPlan", targetYieldKg: 1000, harvestedKg: 800, newKg: 400, totalKg: 1200, overPlanPercent: 20 } };
  it("asks for a reason in the form (no extra pop-up), sends the same trip again with the confirmation and keeps warnings as notices", async () => {
    upload.mockResolvedValueOnce(question).mockResolvedValueOnce({ status: "success", data: { lot: { id: "x", lotCode: "KV01-B01-20261112" }, warnings: [{ code: "ESTIMATED_KG_FAR_FROM_CAGES", details: { workedKg: 400, minKg: 80, maxKg: 800 } }] } });
    const onSaved = vi.fn();
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData()} onClose={vi.fn()} onSaved={onSaved} />);
    await fillTrip();
    expect(await screen.findByRole("alert", { name: "Xác nhận vượt kế hoạch" })).toBeTruthy();
    expect(screen.getByText(/1\.200 kg ước tính, vượt mục tiêu 1\.000 kg \(\+20%\)/)).toBeTruthy();
    expect(screen.queryByText(/Hãy xác nhận trước khi tiếp tục/)).toBeNull();
    expect((screen.getByRole("button", { name: "Xác nhận" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("Lý do vượt kế hoạch *"), { target: { value: "Hàu lớn nhanh" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[0][2]).not.toHaveProperty("confirmOverPlan");
    expect(upload.mock.calls[1][2]).toMatchObject({ cageCount: 8, confirmOverPlan: true, overPlanReason: "Hàu lớn nhanh", laneNumbers: [1] });
    expect(await screen.findByText(/Kg ước tính \(400 kg\) lệch nhiều so với số lồng/)).toBeTruthy();
  });
  it("Bỏ qua drops the question and returns to editing without sending anything more", async () => {
    upload.mockResolvedValueOnce(question);
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData()} onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillTrip();
    await screen.findByRole("alert", { name: "Xác nhận vượt kế hoạch" });
    const blocks = screen.getAllByRole("button", { name: "Bỏ qua" });
    fireEvent.click(blocks[0]);
    await waitFor(() => expect(screen.queryByRole("alert", { name: "Xác nhận vượt kế hoạch" })).toBeNull());
    expect(upload).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("shows a hard refusal (over 150%) as an error, not as a question", async () => {
    upload.mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG01", uncertain: false, problem: { code: "MSG-GEN-01", field: "Estimated kg" } });
    wrap(<HarvestForm zoneId="z" raftId="r" data={screenData()} onClose={vi.fn()} onSaved={vi.fn()} />);
    await fillTrip();
    expect((await screen.findByRole("alert")).textContent).toContain("không thể xác nhận");
    expect(screen.queryByRole("button", { name: "Xác nhận" })).toBeNull();
  });
});
