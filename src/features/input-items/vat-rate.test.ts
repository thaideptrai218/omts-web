import { describe, expect, it } from "vitest";
import { buildSaveBody, initialValues } from "./item-helpers";
import { itemRow } from "./contracts";
import { receiptVat, sumOf, vatOf, vatRateLabel } from "./vat-rate";

describe("input VAT math", () => {
  it("adds 10% to a receipt line of 100.000: VAT 10.000, so the supplier is owed 110.000", () => {
    const vat = sumOf(receiptVat([{ amount: 100_000, rate: "10" }], 0));
    expect(vat).toBe(10_000);
    expect(100_000 - 0 + vat).toBe(110_000);
  });
  it("takes VAT on the amount after the receipt discount: 10.000 off gives VAT 9.000 and 99.000 to pay", () => {
    const vat = sumOf(receiptVat([{ amount: 100_000, rate: "10" }], 10_000));
    expect(vat).toBe(9_000);
    expect(100_000 - 10_000 + vat).toBe(99_000);
  });
  it("spreads the receipt discount over the lines by amount, each line at its own rate", () => {
    // 60.000 and 40.000, 10.000 off: the lines keep 54.000 and 36.000.
    expect(receiptVat([{ amount: 60_000, rate: "10" }, { amount: 40_000, rate: "5" }], 10_000)).toEqual([5_400, 1_800]);
  });
  it("gives no VAT for KCT, 0%, a line without a rate or an empty receipt, and rounds half up to the dong", () => {
    expect(receiptVat([{ amount: 100_000, rate: "KCT" }, { amount: 100_000, rate: "0" }, { amount: 100_000, rate: null }, { amount: 100_000, rate: undefined }], 0)).toEqual([0, 0, 0, 0]);
    expect(receiptVat([], 0)).toEqual([]);
    expect(vatOf(12_345, "10")).toBe(1_235);
    expect(vatOf(12_344, "10")).toBe(1_234);
    expect(vatOf(50, "5")).toBe(3);
    expect(vatOf(-100, "10")).toBe(0);
  });
  it("names a rate the way the screens show it", () => {
    expect([vatRateLabel("KCT"), vatRateLabel("0"), vatRateLabel("8"), vatRateLabel(null), vatRateLabel(undefined)]).toEqual(["KCT", "0%", "8%", "—", "—"]);
  });
});

describe("VAT mua vào on the item contract and form", () => {
  const base = { id: "00000000-0000-4000-8000-000000000001", code: "VT000001", name: "Phao", group: "Material", unit: "cái", units: [], onHand: 0, stockValue: 0, statusId: 101, status: "InUse", createdAt: "2026-11-28T00:00:00+07:00", rowVersion: "v" };
  it("reads an item from an API without the field, or with a rate this web does not know, as having no rate", () => {
    expect(itemRow.parse(base).purchaseVatRate ?? null).toBeNull();
    expect(itemRow.parse({ ...base, purchaseVatRate: "12" }).purchaseVatRate).toBeNull();
    expect(itemRow.parse({ ...base, purchaseVatRate: "5" }).purchaseVatRate).toBe("5");
  });
  it("starts the form at 10% for a new item or one without a rate, and at the stored rate otherwise", () => {
    expect(initialValues(null, false).purchaseVatRate).toBe("10");
    expect(initialValues(itemRow.parse(base) as never, false).purchaseVatRate).toBe("10");
    expect(initialValues(itemRow.parse({ ...base, purchaseVatRate: "KCT" }) as never, false).purchaseVatRate).toBe("KCT");
    expect(initialValues(itemRow.parse({ ...base, purchaseVatRate: "8" }) as never, true).purchaseVatRate).toBe("8");
  });
  it("sends the rate of a supply item and none for a seed", () => {
    const values = initialValues(null, false);
    expect(buildSaveBody({ ...values, group: "Material", purchaseVatRate: "5" }, null)).toMatchObject({ purchaseVatRate: "5" });
    expect(buildSaveBody({ ...values, group: "Seed" }, null)).not.toHaveProperty("purchaseVatRate");
  });
});
