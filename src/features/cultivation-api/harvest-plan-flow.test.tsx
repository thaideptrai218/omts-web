// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("./record-crew-attendance", async importOriginal => ({ ...(await importOriginal<typeof import("./record-crew-attendance")>()), useIsCooperativeOwner: () => false }));
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const { read, write, upload } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn(), upload: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ write }) }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("./records-shared", async (importOriginal) => {
  const original = await importOriginal<typeof import("./records-shared")>();
  return { ...original, harvestRepo: { read, write, upload }, useAllowed: () => () => true };
});
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: import("react").ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("@/features/products/repository", async (original) => ({ ...(await original<typeof import("@/features/products/repository")>()), productRepository: { all: vi.fn().mockResolvedValue({ status: "success", data: [{ id: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v", unit: "kg", createdAt: "x", units: [] }] }) } }));
// jsdom cannot decode images; the picker only needs the file back.
vi.mock("@/components/form/photo-compression", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/components/form/photo-compression")>()), compressPhoto: async (file: File) => file }));
import { HarvestLanesBoard } from "./harvest-lanes-board";
import { FinishRaftHarvestButton } from "./finish-raft-harvest-button";
import { HarvestPlanSummary, harvestProgressOf } from "./harvest-plan-summary";

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

const finishAll = (patch: object = {}, canFinish = true, onChanged = vi.fn()) => wrap(<FinishRaftHarvestButton data={screenData({ lots: [{}], ...patch }) as never} zoneId="z" raftId="r" canFinish={canFinish} onChanged={onChanged} />);
describe("one button finishes the harvest of the raft", () => {
  it("shows only read-only lane facts on the lane board", () => {
    wrap(<HarvestLanesBoard data={screenData()} zoneId="z" raftId="r" />);
    expect(screen.getByText("Làn 1")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });
  it("asks the confirmation sentence and sends all finishable lanes in one call", async () => {
    write.mockResolvedValue({ status: "success", data: { finished: [1, 3], alreadyFinished: [] } });
    const onChanged = vi.fn();
    finishAll({ lanes: [lane(1), lane(2, { canFinish: false, state: "Harvested" }), lane(3)] }, true, onChanged);
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất thu hoạch bè" }));
    expect(write).not.toHaveBeenCalled();
    expect(screen.getByText("Hoàn tất thu hoạch bè B1? Tất cả làn của bè sẽ được đánh dấu đã thu xong.")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Hoàn tất thu hoạch bè" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0].slice(0, 2)).toEqual(["finish-harvest", { laneNumbers: [1, 3] }]);
    expect(write.mock.calls[0].slice(3)).toEqual(["r", "z"]);
    expect(await screen.findByText("Đã hoàn tất thu hoạch bè B1.")).toBeTruthy();
  });
  it("lists the refused lanes with the reason and changes nothing", async () => {
    write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false, problem: { lanes: [{ laneNumber: 1, reasonCode: "NotBeingHarvested", message: "x" }, { laneNumber: 4, reasonCode: "LaneNotFound", message: "y" }] } });
    const onChanged = vi.fn();
    finishAll({}, true, onChanged);
    fireEvent.click(screen.getByRole("button", { name: "Hoàn tất thu hoạch bè" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Hoàn tất thu hoạch bè" }));
    const list = await screen.findByRole("list", { name: "Các làn chưa thể hoàn tất" });
    expect(list.textContent).toContain("Làn 1: chưa có lô thu hoạch nào ghi nhận làn này.");
    expect(list.textContent).toContain("Làn 4: không còn trên bè này.");
    expect(screen.getByText(/Không có làn nào bị thay đổi/)).toBeTruthy();
    expect(onChanged).not.toHaveBeenCalled();
  });
  it("is hidden without permission or when no lane is left to finish, and disabled with the reason when there is no lot", () => {
    finishAll({}, false);
    expect(screen.queryByRole("button", { name: "Hoàn tất thu hoạch bè" })).toBeNull();
    cleanup();
    finishAll({ lanes: [lane(1, { canFinish: false, state: "Harvested" })] });
    expect(screen.queryByRole("button", { name: "Hoàn tất thu hoạch bè" })).toBeNull();
    cleanup();
    finishAll({ lots: [] });
    expect((screen.getByRole("button", { name: "Hoàn tất thu hoạch bè" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Ghi nhận ít nhất một lô thu hoạch/)).toBeTruthy();
  });
});
