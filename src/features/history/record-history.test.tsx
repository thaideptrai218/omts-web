// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const repo = vi.hoisted(() => ({ readRecordHistory: vi.fn() }));
vi.mock("./history-repository", () => repo);
import { RecordHistory } from "./record-history";
import { historyActionLabel, historyChangeText, historyList, historyValue } from "./history-contracts";

afterEach(() => { cleanup(); vi.clearAllMocks(); });
const id = "00000000-0000-4000-8000-000000000001";
const entries = [{ at: "2026-11-12T08:30:00+07:00", byName: "Nguyễn An", byRole: "Chủ HTX", action: "HarvestLot.Corrected", reason: "Nhập nhầm số lồng", note: "Đã cân lại",
  changes: [{ field: "cageCount", label: "Số lồng", from: 4, to: 5 }, { field: "estimatedKg", label: "Kg ước tính (kg)", from: 200, to: 250.5 }] }];

describe("record history", () => {
  it("loads only when opened and shows who, when, action, reason, note and the changed fields with labels", async () => {
    repo.readRecordHistory.mockResolvedValue({ status: "success", data: historyList.parse(entries) });
    render(<RecordHistory kind="harvest" id={id} zoneId={id} />);
    expect(repo.readRecordHistory).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Lịch sử" }));
    expect(await screen.findByText("Số lồng: 4 → 5")).toBeTruthy();
    expect(screen.getByText("Kg ước tính (kg): 200 → 250,5")).toBeTruthy();
    expect(screen.getByText(/Nguyễn An \(Chủ HTX\)/)).toBeTruthy();
    expect(screen.getByText("Lý do: Nhập nhầm số lồng")).toBeTruthy();
    expect(screen.getByText("Ghi chú: Đã cân lại")).toBeTruthy();
    expect(screen.getByText("Điều chỉnh")).toBeTruthy();
    expect(repo.readRecordHistory).toHaveBeenCalledWith("harvest", id, id, expect.anything());
  });
  it("shows an empty state for a record with no change and a quiet retry when the backend has no history route (404)", async () => {
    repo.readRecordHistory.mockResolvedValueOnce({ status: "success", data: [] });
    render(<RecordHistory kind="seeding" id={id} zoneId={id} />);
    fireEvent.click(screen.getByRole("button", { name: "Lịch sử" }));
    expect(await screen.findByText("Chưa có thay đổi nào được ghi lại.")).toBeTruthy();
    cleanup();
    repo.readRecordHistory.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
    render(<RecordHistory kind="material-usages" id={id} zoneId={id} />);
    fireEvent.click(screen.getByRole("button", { name: "Lịch sử" }));
    expect(await screen.findByText(/Chưa xem được lịch sử/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Tải lại" })).toBeTruthy();
  });
});

describe("history wording and tolerance", () => {
  it("formats values and action codes", () => {
    expect(historyChangeText({ field: "x", label: "Số lồng", from: 4, to: 5 })).toBe("Số lồng: 4 → 5");
    expect(historyChangeText({ field: "reason", from: null, to: "a" })).toBe("reason: — → a");
    expect(historyValue(true)).toBe("Có"); expect(historyValue(1234.5)).toBe("1.234,5"); expect(historyValue("")).toBe("—");
    expect(historyActionLabel("SeedingRecord.Removed")).toBe("Xóa"); expect(historyActionLabel("Something.Else")).toBe("Something.Else");
  });
  it("accepts a minimal entry from an older backend", () => {
    expect(historyList.safeParse([{ at: "2026-11-12", action: "Created" }]).success).toBe(true);
    expect(historyList.safeParse([{ action: "Created" }]).success).toBe(false);
  });
});
