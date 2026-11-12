import { describe, expect, it } from "vitest";
import { completionRafts, completionRecipient } from "./nursery-completion-test-fixtures";
import { nurseryRaftOptions } from "./nursery-raft-options";
import { nurseryCompletionMessage } from "./nursery-completion-messages";

describe("bè có thể nhận từ đợt ươm", () => {
  const cycle = { id: "open", startDate: "2026-11-12", closeDate: null, statusId: 1, status: "Open", rowVersion: "v" };
  it("chỉ thêm bè đang sử dụng và không đang nuôi", () => {
    const rafts = [completionRafts[0], { ...completionRafts[1], raftStatusId: 102 }, { ...completionRafts[2], cycle }];
    expect(nurseryRaftOptions(rafts, { allocations: [] }).map(row => row.raftCode)).toEqual(["B1-01"]);
    expect(nurseryRaftOptions([{ ...completionRafts[0], cycle: { ...cycle, closeDate: "2026-11-13" } }], { allocations: [] })).toHaveLength(1);
  });
  it("giữ bè cũ để sửa số mảnh dù đang nuôi hoặc vắng trong danh sách vùng", () => {
    expect(nurseryRaftOptions([{ ...completionRafts[0], cycle }], { allocations: [completionRecipient] })).toHaveLength(1);
    expect(nurseryRaftOptions([], { allocations: [completionRecipient] })).toEqual([{ raftId: completionRecipient.raftId, raftCode: "B1-01", laneCount: null }]);
  });
  it("chuyển từ ngữ cũ trong lỗi backend sang từ ngữ hiển thị", () => {
    const text = nurseryCompletionMessage("Phân bổ vượt số mảnh của chu kỳ.");
    expect(text).not.toMatch(/phân bổ|chu kỳ/i);
    expect(text).toContain("Số mảnh chuyển sang bè");
  });
});
