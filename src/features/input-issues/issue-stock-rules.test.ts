import { describe, expect, it } from "vitest";
import { failedOnLines, outOfStockReason, stockProblems, type StockLine } from "./issue-stock-rules";

const line = (patch: Partial<StockLine>): StockLine => ({ name: "Vật tư A", seed: false, quantity: 1, unitFactor: 1, unitName: "cái", onHand: 10, ...patch });

describe("issue stock rules", () => {
  it("marks an empty item unusable unless the cooperative lets stock go negative", () => {
    expect(outOfStockReason(0, false)).toBe("Hết hàng trong kho");
    expect(outOfStockReason(0, undefined)).toBe("Hết hàng trong kho");
    expect(outOfStockReason(0, true)).toBeUndefined();
    expect(outOfStockReason(3, false)).toBeUndefined();
    expect(outOfStockReason(null, false)).toBeUndefined();
  });

  it("names the line, the item and how much is left when a quantity is too large", () => {
    expect(stockProblems([line({ quantity: 11 })], false)).toEqual(["Dòng 1 (Vật tư A): số lượng vượt tồn kho (còn 10 cái)."]);
    expect(stockProblems([line({ quantity: 2, unitFactor: 6, unitName: "thùng", onHand: 10 })], false)).toEqual(["Dòng 1 (Vật tư A): số lượng vượt tồn kho (còn 1,667 thùng)."]);
  });

  it("tells an empty item from a short one, and skips unknown stock", () => {
    expect(stockProblems([line({ onHand: 0 })], undefined)[0]).toContain("hết hàng trong kho");
    expect(stockProblems([line({ onHand: null, quantity: 999 })], false)).toEqual([]);
  });

  it("checks a seed line against its chosen lot, or the stock without a lot when none is chosen", () => {
    expect(stockProblems([line({ seed: true, lotOnHand: 0, onHand: 10000 })], false)[0]).toContain("chọn lô khác");
    expect(stockProblems([line({ seed: true, lotOnHand: 50, quantity: 60, onHand: 10000 })], false)[0]).toContain("còn 50");
    expect(stockProblems([line({ seed: true, unlotted: 0, onHand: 10000 })], false)[0]).toContain("chọn lô khác");
    expect(stockProblems([line({ seed: true, lotOnHand: 50, quantity: 60 })], true)).toEqual([]);
  });

  it("recognises the backend's field names for the lines", () => {
    expect(failedOnLines(["Lines"])).toBe(true);
    expect(failedOnLines(["Line 2 Quantity"])).toBe(true);
    expect(failedOnLines(["Reason"])).toBe(false);
    expect(failedOnLines(undefined)).toBe(false);
  });
});
