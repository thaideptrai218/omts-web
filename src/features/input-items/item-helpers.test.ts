import { describe, expect, it } from "vitest";
import type { ItemView } from "./contracts";
import { buildSaveBody, chosenUnit, groupLabel, groupTree, inUnitPrice, inUnitQuantity, initialValues, movementHref, parseNumber, signed, suggestUnitCode, validateForm } from "./item-helpers";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const record: ItemView = {
  id: id(1), code: "VT000001", name: "Phao nhựa", group: "Material", itemGroupId: null, itemGroupName: null, unit: "cái",
  units: [{ id: id(2), unitId: id(3), name: "cái", factor: 1, code: "VT000001-C", isBase: true, isUsed: true }, { id: id(4), unitId: id(5), name: "thùng", factor: 12, code: "VT000001-T", isBase: false, isUsed: false }],
  description: null, notes: null, photoUrl: null, minQuantity: null, maxQuantity: null, costPrice: 1000, lastPurchasePrice: null, onHand: 24, stockValue: 24000, isUsed: true,
  statusId: 101, status: "In Use", createdAt: "2026-11-10T00:00:00+07:00", createdBy: null, rowVersion: "v1", photos: [], hasMovements: true, openingQuantity: 5,
};

describe("unit conversion", () => {
  it("divides quantities and multiplies prices by the factor of the picked unit", () => {
    expect(inUnitQuantity(24, 12)).toBe(2);
    expect(inUnitPrice(1000, 12)).toBe(12000);
    expect(inUnitQuantity(null, 12)).toBeNull();
    expect(chosenUnit(record, id(4)).name).toBe("thùng");
    expect(chosenUnit(record, "unknown").name).toBe("cái");
  });
  it("suggests the code of a unit from the item code and the first letter of its name", () => {
    expect(suggestUnitCode("VT01", "Thùng")).toBe("VT01-T");
    expect(suggestUnitCode("VT01", "đóng")).toBe("VT01-D");
    expect(suggestUnitCode("", "kg")).toBe("");
  });
  it("shows a signed quantity with a real minus sign", () => {
    expect(signed(3, String)).toBe("+3");
    expect(signed(-3, String)).toBe("−3");
  });
});

describe("movement links", () => {
  it("opens the document list by code for documents, and nowhere for the opening row or a correction", () => {
    expect(movementHref("Receipt", "PN000001")).toBe("/operations/purchase-receipts?code=PN000001");
    expect(movementHref("Issue", "XD000001")).toBe("/inputs/uses?code=XD000001");
    expect(movementHref("Disposal", "XH000001")).toBe("/inputs/disposals?code=XH000001");
    expect(movementHref("Opening", "VT000001")).toBeUndefined();
    expect(movementHref("Reversal", "PN000001")).toBeUndefined();
  });
});

describe("item group tree", () => {
  const group = (n: number, name: string, parentId: string | null = null) => ({ id: id(n), name, sortOrder: n, itemCount: 0, rowVersion: "v", parentId });
  it("lists each top-level group followed by its children and indents the children", () => {
    const tree = groupTree([group(1, "Dụng cụ"), group(2, "Lưới", id(1)), group(3, "Thức ăn"), group(4, "Phao", id(1)), group(5, "Cám", id(3))]);
    expect(tree.map((node) => [node.name, node.depth])).toEqual([["Dụng cụ", 0], ["Lưới", 1], ["Phao", 1], ["Thức ăn", 0], ["Cám", 1]]);
    expect(groupLabel(tree[0])).toBe("Dụng cụ");
    expect(groupLabel(tree[1])).toContain("└ Lưới");
  });
  it("treats a child whose parent is missing as a top-level group", () => {
    expect(groupTree([group(2, "Lưới", id(9))]).map((node) => node.depth)).toEqual([0]);
  });
});

describe("form values", () => {
  it("parses a decimal comma and treats empty text as no value", () => {
    expect(parseNumber("1,5")).toBe(1.5);
    expect(parseNumber(" ")).toBeNull();
    expect(Number.isNaN(parseNumber("abc"))).toBe(true);
  });
  it("refuses a maximum below the minimum and a factor with too many decimals", () => {
    const values = initialValues(null, false);
    values.name = "Phao"; values.units[0].unitId = id(3);
    expect(validateForm(values)).toBeUndefined();
    expect(validateForm({ ...values, minQuantity: "10", maxQuantity: "5" })).toMatch(/Định mức tối đa/);
    const extra = { key: "x", id: null, unitId: id(5), factor: "1,2345", code: "", isBase: false, isUsed: false };
    expect(validateForm({ ...values, units: [...values.units, extra] })).toMatch(/Quy đổi/);
    expect(validateForm({ ...values, units: [...values.units, { ...extra, factor: "12" }] })).toBeUndefined();
    expect(validateForm({ ...values, units: [...values.units, { ...extra, unitId: id(3), factor: "12" }] })).toMatch(/một lần/);
  });
  it("sends the opening quantity only when it changed on an update, and never copies ids or codes into a copy", () => {
    const same = buildSaveBody(initialValues(record, false), record);
    expect(same).not.toHaveProperty("openingQuantity");
    expect(same).toMatchObject({ rowVersion: "v1", units: [{ id: id(2), factor: 1, isBase: true }, { id: id(4), factor: 12, isBase: false }] });
    const changed = buildSaveBody({ ...initialValues(record, false), openingQuantity: "7" }, record);
    expect(changed.openingQuantity).toBe(7);
    const copy = initialValues(record, true);
    expect(copy.code).toBe("");
    expect(copy.units.every((unit) => unit.id === null && unit.code === "" && !unit.isUsed)).toBe(true);
    expect(buildSaveBody(copy, null)).not.toHaveProperty("rowVersion");
  });
});
