import { describe, expect, it } from "vitest";
import { cagesOverOrderProblem, defaultCagesText, harvestCagesError, orderCompleteText, orderGatherHint, orderProgressText, orderRemainingCages, orderTripsText } from "./harvest-order-cages";

const order = (acceptedCages: number, harvestedCages: number, trips?: { raftCode: string; zoneCode?: string; cages: number }[]) => ({ acceptedCages, harvestedCages, trips });

describe("harvest cages follow the purchase request", () => {
  it("defaults to what the order has left and nothing when it is unknown or filled", () => {
    expect(defaultCagesText(order(15, 10))).toBe("5");
    expect(defaultCagesText(order(15, 4.5))).toBe("10.5");
    expect(defaultCagesText(order(15, 15))).toBe("");
    expect(defaultCagesText(order(0, 0))).toBe("");
    expect(defaultCagesText(undefined)).toBe("");
    expect(orderRemainingCages(order(10, 12))).toBe(0);
  });
  it("refuses cages over the remaining ones at the cages field but lets any lower amount through", () => {
    expect(cagesOverOrderProblem(order(15, 10), "5.5")).toBe("Đơn này chỉ còn 5 lồng (đã thu 10/15). Số lồng phải khớp với đơn mua.");
    expect(cagesOverOrderProblem(order(15, 10), "5")).toBeUndefined();
    expect(cagesOverOrderProblem(order(15, 10), "2,5")).toBeUndefined();
    expect(cagesOverOrderProblem(order(15, 10), "")).toBeUndefined();
    expect(cagesOverOrderProblem(order(0, 0), "99")).toBeUndefined();
  });
  it("words the progress, the trips from other rafts and the gathering hint", () => {
    expect(orderProgressText(order(10, 5))).toBe("Đã thu 5/10 lồng · còn 5 lồng");
    expect(orderTripsText(order(10, 5, [{ raftCode: "B1-06", zoneCode: "DEMO-01", cages: 5 }]))).toBe("B1-06 (DEMO-01) 5 lồng");
    expect(orderTripsText(order(10, 0))).toBeUndefined();
    expect(orderGatherHint(order(10, 5))).toBe("Đơn còn 5 lồng. Nhập số lồng thu được từ bè này; phần còn lại thu ở bè khác cùng loại hàu.");
  });
  it("shows the backend detail of HARVEST_ORDER_CAGES_EXCEEDED at the cages field", () => {
    expect(harvestCagesError({ reasonCode: "HARVEST_ORDER_CAGES_EXCEEDED", detail: "Đơn mua YC-1 chỉ còn 5 lồng (đã thu 10/15 lồng). Số lồng thu hoạch phải khớp với đơn mua." })).toContain("chỉ còn 5 lồng");
    expect(harvestCagesError({ reasonCode: "HARVEST_ORDER_CAGES_EXCEEDED" })).toContain("phải khớp với đơn mua");
    expect(harvestCagesError({ field: "Photos", hint: "Ảnh sai" })).toBeUndefined();
  });
  it("says when the trip filled the order and when cages are still left for another raft", () => {
    const lot = { purchaseRequestCode: "YC-1" };
    expect(orderCompleteText({ lot, orderComplete: true, orderCagesTotal: 15, orderCagesHarvested: 15 }, undefined, undefined)).toEqual({ complete: true, text: "Đơn YC-1 đã thu đủ 15/15 lồng." });
    expect(orderCompleteText({ lot, orderComplete: false, orderCagesTotal: 10, orderCagesHarvested: 5 }, undefined, undefined)).toEqual({ complete: false, text: "Còn 5 lồng của đơn YC-1 cần thu ở bè khác cùng loại hàu." });
    expect(orderCompleteText({ lot: {} }, "YC-2", 10)).toBeUndefined();
  });
});
