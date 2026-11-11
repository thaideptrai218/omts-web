import { describe, expect, it } from "vitest";
import { currentLicenses, daysUntil, expiryText, indicatorLabel, rangeText, summarizeCycles, summarizeRafts } from "./zone-summary-model";

describe("zone summary figures", () => {
  it("counts rafts in use, total and lanes", () => {
    const raft = (statusId: number, laneCount?: number) => ({ id: String(statusId) + String(laneCount), code: "B", statusId, status: "", laneCount });
    expect(summarizeRafts([raft(101, 3), raft(101, 5), raft(102, 2), raft(101)])).toEqual({ total: 4, inUse: 3, lanes: 10 });
    expect(summarizeRafts([])).toEqual({ total: 0, inUse: 0, lanes: 0 });
  });
  it("counts open cycles and finds the earliest start", () => {
    const rows = [{ cycle: { startDate: "2026-10-01", closeDate: null } }, { cycle: { startDate: "2026-09-21", closeDate: null } }, { cycle: { startDate: "2026-01-01", closeDate: "2026-03-01" } }, { cycle: null }];
    expect(summarizeCycles(rows)).toEqual({ rafts: 4, open: 2, earliestStart: "2026-09-21" });
    expect(summarizeCycles([{ cycle: null }])).toEqual({ rafts: 1, open: 0, earliestStart: null });
  });
  it("counts days to licence expiry across month ends", () => {
    expect(daysUntil("2026-11-30", "2026-11-11")).toBe(19);
    expect(expiryText("2026-11-30", "2026-11-11")).toBe("Còn 19 ngày");
    expect(expiryText("2026-11-11", "2026-11-11")).toBe("Hết hạn hôm nay");
    expect(expiryText("2026-11-01", "2026-11-11")).toBe("Quá hạn 10 ngày");
    expect(expiryText(null, "2026-11-11")).toBe("Không thời hạn");
  });
  it("keeps only current licence documents", () => {
    const rows = [{ isReplaced: false, documentId: "a" }, { isReplaced: true, documentId: "b" }, { isReplaced: false, documentId: null }];
    expect(currentLicenses(rows).map(row => row.documentId)).toEqual(["a"]);
  });
  it("labels indicators and threshold ranges", () => {
    expect(indicatorLabel("Salinity")).toBe("độ mặn");
    expect(indicatorLabel("oxygen")).toBe("oxygen");
    expect(rangeText(7.5, 8.5)).toBe("7.5 – 8.5");
    expect(rangeText(null, null)).toBe("Chưa đặt");
  });
});
