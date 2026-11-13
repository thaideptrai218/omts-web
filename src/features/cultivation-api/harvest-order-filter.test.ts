import { describe, expect, it } from "vitest";
import { harvestOrderError, mismatchReason, splitHarvestOrders, splitHarvestRead } from "./harvest-order-filter";

const order = (code: string, productName: string, patch: object = {}) => ({ id: `00000000-0000-4000-8000-0000000000${code.slice(-2)}`, code, customerName: "Khách A", productName, acceptedCages: 10, harvestedCages: 0, pickupDate: "2026-11-20", plannedOnRaft: false, ...patch });
const muop = order("PR000001", "Hàu múp", { matchesCycleProduct: true }), gay = order("PR000002", "Hàu gầy 3cm", { matchesCycleProduct: false });

describe("harvest purchase requests by the farmed product", () => {
  it("lists only the orders that match and keeps the others as blocked with the reason", () => {
    const view = splitHarvestOrders({ productId: "p1", productName: "Hàu múp" }, [gay, muop]);
    expect(view.filtering).toBe(true); expect(view.productName).toBe("Hàu múp");
    expect(view.selectable.map(item => item.code)).toEqual(["PR000001"]);
    expect(view.mismatched).toEqual([{ order: gay, reason: "Đơn đặt Hàu gầy 3cm nhưng bè đang nuôi Hàu múp" }]);
  });
  it("has no selectable order when every request is for another product", () => {
    const view = splitHarvestOrders({ productName: "Hàu múp" }, [gay]);
    expect(view.selectable).toEqual([]); expect(view.mismatched).toHaveLength(1);
  });
  it("takes the farmed product name from a matching order when the cycle has no name", () => {
    expect(splitHarvestOrders(null, [muop, gay]).productName).toBe("Hàu múp");
  });
  it("compares ids when the backend sends no flag", () => {
    const view = splitHarvestOrders({ productId: "p1", productName: "Hàu múp" }, [order("PR000003", "Hàu múp", { productId: "p1" }), order("PR000004", "Hàu gầy 3cm", { productId: "p2" })]);
    expect(view.selectable.map(item => item.code)).toEqual(["PR000003"]);
  });
  it("does not filter a legacy cycle without a product", () => {
    const view = splitHarvestOrders({ productId: null, productName: null }, [order("PR000005", "Hàu múp"), order("PR000006", "Hàu gầy 3cm")]);
    expect(view.filtering).toBe(false); expect(view.selectable).toHaveLength(2); expect(view.mismatched).toEqual([]);
  });
  it("reads the farmed product at screen level of the harvest read", () => {
    const view = splitHarvestRead({ cycle: null, cycleProductId: "p1", cycleProductName: "Hàu múp", orders: [muop, gay] });
    expect(view.productName).toBe("Hàu múp"); expect(view.selectable.map(item => item.code)).toEqual(["PR000001"]);
    expect(splitHarvestRead({ cycle: null, orders: undefined }).filtering).toBe(false);
  });
  it("shows the backend detail of HARVEST_PRODUCT_MISMATCH at the order field", () => {
    expect(harvestOrderError({ reasonCode: "HARVEST_PRODUCT_MISMATCH", message: "Đơn mua YC-1 đặt Hàu gầy 3cm nhưng bè đang nuôi Hàu múp." })).toBe("Đơn mua YC-1 đặt Hàu gầy 3cm nhưng bè đang nuôi Hàu múp.");
    expect(harvestOrderError({ reasonCode: "HARVEST_PRODUCT_MISMATCH" })).toContain("không khớp loại hàu");
    expect(harvestOrderError({ field: "Photos", hint: "Ảnh sai" })).toBeUndefined();
  });
  it("words the reason even when the farmed product is unknown", () => expect(mismatchReason(gay, null)).toBe("Đơn đặt Hàu gầy 3cm nhưng bè đang nuôi loại hàu khác"));
});
