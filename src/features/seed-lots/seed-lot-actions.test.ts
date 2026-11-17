import { describe, expect, it } from "vitest";
import { cycleFromBatchHref, lotActions, lotIsOpen, nurseHref, returnLotHref } from "./seed-lot-actions";
import { seedLotStates } from "./contracts";
import { combinedSeedLotState, isFinalSeedLotState, seedLotStateLabel } from "./seed-lot-state";
import { seedLotTimeline } from "./seed-lot-timeline";
import { ids, seedLotDetailFixture } from "./seed-lot-test-fixtures";

const all = { nurse: true, return: true };

describe("which seed lots the actions apply to", () => {
  it.each(seedLotStates.map((state) => [state, state === "Unused" || state === "PartlySeeded"] as const))("%s with something left: open = %s", (state, open) => {
    expect(lotIsOpen({ state, availableQty: 10 })).toBe(open);
    expect(lotActions({ state, availableQty: 10 }, all)).toEqual(open ? ["nurse", "return"] : []);
  });
  it("offers nothing when no stock is on hand, whatever the state says: remaining that sits in the nursery does not count", () => {
    expect(lotActions({ state: "Unused", availableQty: 0 }, all)).toEqual([]);
    expect(lotActions({ state: "PartlySeeded", availableQty: 0 }, all)).toEqual([]);
  });
  it("keeps only the actions the account may take, in the order Ươm, Trả hàng; a seed lot is never hung straight on a raft", () => {
    expect(lotActions({ state: "Unused", availableQty: 5 }, { nurse: false, return: true })).toEqual(["return"]);
    expect(lotActions({ state: "Unused", availableQty: 5 }, { nurse: false, return: false })).toEqual([]);
  });
});

describe("the prefill addresses of the actions", () => {
  it("opens a new nursery batch and a return with the lot chosen, and a cycle start with a finished batch chosen, by id only in the query", () => {
    expect(nurseHref(ids.line)).toBe(`/farming/nursery?lot=${ids.line}`);
    expect(cycleFromBatchHref("b1")).toBe("/farming/cycles?nurseryBatch=b1");
    expect(returnLotHref({ id: ids.line, receiptId: ids.receipt })).toBe(`/operations/seed-returns/new?receipt=${ids.receipt}&line=${ids.line}`);
  });
});

describe("the state of a lot and of a receipt of lots", () => {
  it("names the seven states in Vietnamese and marks four of them final", () => {
    expect(Object.values(seedLotStateLabel)).toEqual(["Chưa dùng", "Đang ươm", "Đang treo dở", "Đã treo hết", "Đã trả hết", "Hao hụt hết", "Đã dùng hết"]);
    expect(seedLotStates.filter(isFinalSeedLotState)).toEqual(["FullySeeded", "FullyReturned", "FullyLost", "UsedUp"]);
  });
  it("combines the states of the lots of a receipt", () => {
    expect(combinedSeedLotState([])).toBeUndefined();
    expect(combinedSeedLotState(["Unused", "Unused"])).toBe("Unused");
    expect(combinedSeedLotState(["FullySeeded", "FullySeeded"])).toBe("FullySeeded");
    expect(combinedSeedLotState(["FullySeeded", "FullyReturned"])).toBe("UsedUp");
    expect(combinedSeedLotState(["Unused", "Nursing", "FullySeeded"])).toBe("Nursing");
    expect(combinedSeedLotState(["Unused", "PartlySeeded"])).toBe("PartlySeeded");
    expect(combinedSeedLotState(["Unused", "FullySeeded"])).toBe("PartlySeeded");
  });
});

describe("the history of a lot", () => {
  it("lists what happened oldest first, with the receipt first, and links the documents by code", () => {
    const entries = seedLotTimeline(seedLotDetailFixture());
    expect(entries.map((entry) => entry.title)).toEqual(["Nhập lô", "Bắt đầu ươm", "Trả hàng nhà cung cấp", "Xuất hủy", "Thả giống"]);
    expect(entries[0]).toMatchObject({ detail: "Phiếu PN000004: 1.000 mảnh", href: "/operations/seed-receipts?code=PN000004" });
    expect(entries[1].href).toBe("/farming/nursery?code=NU000002");
    expect(entries[2].href).toBe("/operations/seed-returns?code=TH000001");
  });
  it("puts an event with no time last instead of inventing one", () => {
    const entries = seedLotTimeline(seedLotDetailFixture({ seedings: [{ id: ids.seeding, quantity: 5, seededAt: null }], returns: [{ id: ids.ret, code: "TH000009", quantity: 1, returnedAt: null, statusId: 1901 }] }));
    expect(entries.slice(-2).map((entry) => entry.at)).toEqual([null, null]);
    expect(entries.slice(-2).map((entry) => entry.title)).toEqual(["Thả giống", "Trả hàng nhà cung cấp"]);
  });
});
