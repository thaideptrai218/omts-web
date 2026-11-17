import { describe, expect, it } from "vitest";
import type { ProductView } from "./contracts";
import { buildSaveBody, defaultUnitPrice, cageUnitOf, chosenUnit, initialValues, movementHref, validateForm } from "./product-helpers";

const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const units = [{ id: id(2), unitId: id(3), name: "kg", factor: 1, code: "SP000001-K", isBase: true, salePrice: 60000 }, { id: id(4), unitId: id(5), name: "Lồng", factor: 25, code: "SP000001-L", isBase: false, salePrice: 1500000 }];
const record: ProductView = { id: id(1), code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v1", categoryId: null, categoryName: null, unit: "kg", units,
  description: null, note: null, photoUrl: null, minKg: 10, maxKg: null, onHandKg: 100, isUsed: true, createdAt: "2026-11-10T00:00:00+07:00", createdBy: "Chủ", photos: [] };

describe("product helpers", () => {
  it("finds the unit picked on a row and the Lồng unit by name without diacritics", () => {
    expect(chosenUnit(record, id(4)).name).toBe("Lồng");
    expect(chosenUnit(record, undefined).isBase).toBe(true);
    expect(cageUnitOf(units)?.factor).toBe(25);
  });
  it("starts a copy without code, unit ids or unit codes, and sends every field of an update with the unit list", () => {
    const copy = initialValues(record, true);
    expect(copy.code).toBe("");
    expect(copy.name).toBe("Hàu sữa (bản sao)");
    expect(copy.units).toMatchObject([{ id: null, unitId: id(5), factor: "25", code: "" }]);
    const body = buildSaveBody(initialValues(record, false), record);
    expect(body).toMatchObject({ code: "SP000001", unitPrice: 60000, minKg: 10, maxKg: null, rowVersion: "v1", units: [{ id: id(4), unitId: id(5), factor: 25, code: "SP000001-L", salePrice: 1500000 }] });
  });
  it("names the first problem of the form", () => {
    const values = initialValues(null, false);
    expect(validateForm(values)).toBe("Nhập tên sản phẩm.");
    expect(validateForm({ ...values, name: "A", unitPrice: 0 })).toBe("Nhập giá bán theo kg lớn hơn 0.");
    expect(validateForm({ ...values, name: "A", unitPrice: 1000, minKg: "5", maxKg: "2" })).toMatch(/Định mức tối đa/);
    expect(validateForm({ ...values, name: "A", unitPrice: 1000, units: [{ key: "k", id: null, unitId: id(5), factor: "0", code: "", salePrice: null }] })).toMatch(/Quy đổi/);
    expect(validateForm({ ...values, name: "A", unitPrice: 1000 })).toBeUndefined();
  });
  it("prefills the price of a new unit with factor times the kg price", () => {
    expect(defaultUnitPrice(25, 60000)).toBe(1500000);
    expect(defaultUnitPrice(0.5, 1)).toBe(1);
    expect(defaultUnitPrice(null, 60000)).toBeNull();
  });
  it("links a movement to its document by code", () => {
    expect(movementHref("ProductDisposal", "XHS000001")).toBe("/sales/disposals?code=XHS000001");
    expect(movementHref("SalesInvoice", "HD000001")).toBe("/operations/sales-invoice-list?code=HD000001");
    expect(movementHref("HarvestLot", null)).toBeUndefined();
  });
});
