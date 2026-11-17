import { describe, expect, it } from "vitest";
import { itemHref, kindGroups, kindOfGroup, kindText, receiptHref, returnHref, seedLotsHref } from "./stock-kind";
import { movementHref, validateForm, initialValues } from "./item-helpers";

describe("the two kinds", () => {
  it("puts Seed in Giống and Material and Other in Vật tư", () => {
    expect(kindOfGroup("Seed")).toBe("Seed");
    expect(["Material", "Other", "", null, undefined, "anything"].map(kindOfGroup)).toEqual(Array(6).fill("Supply"));
    expect(kindGroups).toEqual({ Seed: ["Seed"], Supply: ["Material", "Other"] });
  });
  it("gives each kind its own screens", () => {
    expect(kindText.Seed).toMatchObject({ catalogue: "Giống", receipt: "Nhập giống", receiptReturn: "Trả giống nhập", itemsPath: "/inputs/seeds", receiptsPath: "/operations/seed-receipts", returnsPath: "/operations/seed-returns" });
    expect(kindText.Supply).toMatchObject({ catalogue: "Vật tư", receipt: "Nhập vật tư", receiptReturn: "Trả vật tư nhập", itemsPath: "/inputs/supplies", receiptsPath: "/operations/supply-receipts", returnsPath: "/operations/supply-returns" });
  });
});

describe("links by code, never by id", () => {
  it("opens the screen of the kind when it is known", () => {
    expect(itemHref("GG000001", "Seed")).toBe("/inputs/seeds?code=GG000001");
    expect(itemHref("VT000001", "Material")).toBe("/inputs/supplies?code=VT000001");
    expect(itemHref("VT000002", "Other")).toBe("/inputs/supplies?code=VT000002");
    expect(receiptHref("PN000004", "Seed")).toBe("/operations/seed-receipts?code=PN000004");
    expect(receiptHref("PN000005", "Supply")).toBe("/operations/supply-receipts?code=PN000005");
    expect(returnHref("TH000001", "Seed")).toBe("/operations/seed-returns?code=TH000001");
    expect(returnHref("TH000002", "Supply")).toBe("/operations/supply-returns?code=TH000002");
    expect(seedLotsHref("PN000004-1")).toBe("/farming/seed-lots?code=PN000004-1");
  });
  it("keeps the old address, which looks the kind up, when the kind is not known", () => {
    expect(itemHref("VT000001")).toBe("/inputs/items?code=VT000001");
    expect(receiptHref("PN000004")).toBe("/operations/purchase-receipts?code=PN000004");
    expect(returnHref("TH000001", null)).toBe("/operations/purchase-returns?code=TH000001");
  });
  it("encodes a code", () => expect(seedLotsHref("A B&C")).toBe("/farming/seed-lots?code=A%20B%26C"));
  it("sends the receipts and returns of an item's movements to the kind of the item", () => {
    expect(movementHref("Receipt", "PN000004", "Seed")).toBe("/operations/seed-receipts?code=PN000004");
    expect(movementHref("PurchaseReturn", "TH000001", "Material")).toBe("/operations/supply-returns?code=TH000001");
    expect(movementHref("Issue", "XD000001", "Seed")).toBe("/inputs/uses?code=XD000001");
  });
});

describe("the seed form", () => {
  const seed = { ...initialValues(null, false), name: "Hàu giống", group: "Seed", units: [{ key: "u", id: null, unitId: "00000000-0000-4000-8000-000000000003", factor: "", code: "", isBase: true, isUsed: false }] };
  it("needs a loại hàu bán ra", () => {
    expect(validateForm(seed)).toBe("Chọn loại hàu bán ra của giống.");
    expect(validateForm({ ...seed, productId: "00000000-0000-4000-8000-000000000007" })).toBeUndefined();
  });
  it("does not ask a Vật tư for one", () => expect(validateForm({ ...seed, group: "Material" })).toBeUndefined());
});
