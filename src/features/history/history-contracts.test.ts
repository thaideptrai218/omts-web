import { describe, expect, it } from "vitest";
import { historyList } from "./history-contracts";

const entry = { eventId: "e1", at: "2026-11-27T08:00:00+07:00", byName: "Chủ HTX", byRole: "Chủ hợp tác xã", byRoleCode: "CooperativeOwner", action: "Edited",
  actionCode: "HarvestLot.Corrected", actionLabel: "Chỉnh sửa", reason: null, note: null,
  changes: [{ field: "Cages", label: "Số lồng", from: "4", to: "5", unit: null }] };

describe("historyList", () => {
  it("reads the backend record history object", () => {
    const parsed = historyList.safeParse({ recordType: "HarvestLot", recordId: "c9b0e4d5-8ba1-4124-ada0-386c2dbabf35", recordCode: "LT01", entries: [entry] });
    expect(parsed.success && parsed.data).toEqual([expect.objectContaining({ action: "Edited", byName: "Chủ HTX", changes: [expect.objectContaining({ label: "Số lồng", from: "4", to: "5" })] })]);
  });
  it("still reads a bare array", () => {
    expect(historyList.safeParse([entry]).success).toBe(true);
  });
});
