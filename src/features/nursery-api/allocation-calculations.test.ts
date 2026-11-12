import { describe, expect, it } from "vitest";
import { allocationDifference, divideByLaneCount, estimatedLoss, putAllOnRaft } from "./allocation-calculations";

describe("phân bổ ươm giống", () => {
  it("chia theo số làn, giữ đúng tổng và phần dư 0,01 mảnh", () => {
    const result = divideByLaneCount(100.01, [{ raftId: "a", laneCount: 1 }, { raftId: "b", laneCount: 2 }]);
    expect(result).toEqual([{ raftId: "a", quantity: 33.34 }, { raftId: "b", quantity: 66.67 }]);
    expect(allocationDifference(100.01, result)).toBe(0);
  });
  it("chia đều phần dư theo thứ tự bè khi số làn bằng nhau", () => {
    expect(divideByLaneCount(0.02, ["a", "b", "c"].map(raftId => ({ raftId, laneCount: 1 }))).map(item => item.quantity)).toEqual([0.01, 0.01, 0]);
  });
  it("không chia khi không có làn hoặc dữ liệu không hợp lệ", () => {
    expect(divideByLaneCount(100, [])).toEqual([]);
    expect(divideByLaneCount(100, [{ raftId: "a", laneCount: 0 }])).toEqual([]);
    expect(divideByLaneCount(-1, [{ raftId: "a", laneCount: 1 }])).toEqual([]);
  });
  it("dồn hết vào một bè và xử lý số sống sót bằng 0", () => {
    expect(putAllOnRaft(9.99, "b")).toEqual([{ raftId: "b", quantity: 9.99 }]);
    expect(putAllOnRaft(0, "b")).toEqual([]);
    expect(putAllOnRaft(NaN, "b")).toEqual([]);
    expect(putAllOnRaft(95, "")).toEqual([]);
  });
  it("chia số lượng lớn theo làn mà không đổi giá trị hàng nghìn", () => {
    const result = divideByLaneCount(95000, [{ raftId: "a", laneCount: 2 }, { raftId: "b", laneCount: 3 }]);
    expect(result).toEqual([{ raftId: "a", quantity: 38000 }, { raftId: "b", quantity: 57000 }]);
    expect(allocationDifference(95000, result)).toBe(0);
  });
  it("báo thiếu, thừa và không lỗi dấu phẩy động", () => {
    expect(allocationDifference(10, [{ quantity: 9.5 }])).toBe(0.5);
    expect(allocationDifference(10, [{ quantity: 10.5 }])).toBe(-0.5);
    expect(allocationDifference(0.3, [{ quantity: 0.1 }, { quantity: 0.2 }])).toBe(0);
  });
  it("hao hụt luôn mang nhãn ước tính, kể cả không sống sót", () => {
    expect(estimatedLoss(100, 95)).toEqual({ lossPieces: 5, lossPercent: 5, estimated: true });
    expect(estimatedLoss(100, 0).lossPercent).toBe(100);
    expect(estimatedLoss(0, 0).lossPercent).toBe(0);
  });
});
