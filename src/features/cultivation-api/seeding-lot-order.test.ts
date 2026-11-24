import { describe, expect, it } from "vitest";
import { lotIsEmpty, lotsWithStockFirst } from "./seeding-lot-order";

describe("seeding lot order", () => {
  it("puts lots with stock first, keeps each group's order, and treats unknown stock as usable", () => {
    const lots = [{ id: "a", onHand: 0 }, { id: "b", onHand: 5 }, { id: "c", onHand: null }, { id: "d", onHand: -1 }, { id: "e", onHand: 2 }];
    expect(lotsWithStockFirst(lots).map(lot => lot.id)).toEqual(["b", "c", "e", "a", "d"]);
  });
  it("calls only a known zero or negative stock empty", () => {
    expect(lotIsEmpty({ onHand: 0 })).toBe(true);
    expect(lotIsEmpty({ onHand: 0.5 })).toBe(false);
    expect(lotIsEmpty({ onHand: null })).toBe(false);
    expect(lotIsEmpty({})).toBe(false);
  });
});
