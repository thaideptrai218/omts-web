import { describe, expect, it } from "vitest";
import { nurseryHistoryAction, nurseryHistoryChangeLabel, nurseryHistorySummary, nurseryHistoryValue, type NurseryHistoryEntry } from "./nursery-history-presentation";

const entry = (overrides: Partial<NurseryHistoryEntry> = {}): NurseryHistoryEntry => ({ at: "2026-11-13", action: "Completed", changes: [], ...overrides });
describe("nursery history presentation", () => {
  it("uses the agreed actions over legacy backend labels", () => {
    expect(nurseryHistoryAction(entry({ action: "NurseryBatch.Completed", actionLabel: "Tạo chu kỳ" }))).toBe("Hoàn tất ươm");
    expect(nurseryHistoryAction(entry({ action: "Closed" }))).toBe("Đóng đợt ươm");
    expect(nurseryHistoryAction(entry({ action: "AllocationsChanged", actionLabel: "Chuyển phân bổ" }))).toBe("Cập nhật đợt ươm");
    expect(nurseryHistoryAction(entry({ action: "NewAction" }))).toBe("Cập nhật đợt ươm");
    expect(nurseryHistoryAction(entry({ action: "Other", actionLabel: "Sửa phân bổ cho bè" }))).toBe("Thông tin đợt ươm đã thay đổi. Hãy tải lại để đối chiếu.");
  });
  it("summarizes survivor correction with old and new values", () => {
    expect(nurseryHistorySummary(entry({ action: "NurseryBatch.SurvivorsCorrected", changes: [{ field: "Survivors", from: 900, to: 950, unit: "mảnh" }] }))).toBe("Sửa số sống sót (ước tính) 900 → 950");
    expect(nurseryHistorySummary(entry({ action: "SurvivorsCorrected" }))).toBe("Sửa số sống sót (ước tính)");
    expect(nurseryHistorySummary(entry({ changes: [{ field: "Survivors", from: null, to: 950 }] }))).toBe("Hoàn tất ươm");
  });
  it("localizes known fields and preserves a unit once", () => {
    expect(nurseryHistoryChangeLabel({ field: "allocations", label: "Phân bổ cho bè" })).toBe("Thông tin trước đây");
    expect(nurseryHistoryChangeLabel({ field: "closeLossPieces" })).toBe("Hao hụt khi đóng (ước tính)");
    expect(nurseryHistoryChangeLabel({ field: "quantity_in", unit: "mảnh" })).toBe("Số mảnh vào ươm (mảnh)");
    expect(nurseryHistoryChangeLabel({ field: "other", label: "Số mảnh (mảnh)", unit: "mảnh" })).toBe("Số mảnh (mảnh)");
    expect(nurseryHistoryChangeLabel({ field: "unknown" })).toBe("Thông tin đợt ươm");
  });
  it("shows Vietnamese statuses, localized numbers and missing values", () => {
    expect(nurseryHistoryValue({ field: "Status" }, "Nursing")).toBe("Đang ươm");
    expect(nurseryHistoryValue({ field: "Status" }, "Completed")).toBe("Đã ươm xong");
    expect(nurseryHistoryValue({ field: "Status" }, "Closed")).toBe("Đã đóng");
    expect(nurseryHistoryValue({ field: "quantity" }, 95000.5)).toBe("95.000,5");
    expect(nurseryHistoryValue({ field: "quantity" }, null)).toBe("—");
  });
});
