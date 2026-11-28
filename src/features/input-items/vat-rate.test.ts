import { describe, expect, it } from "vitest";
import { buildSaveBody, initialValues } from "./item-helpers";
import { itemRow } from "./contracts";
import { defaultVatRate, itemVatId, itemVatName, itemVatPercent, keepLegacyVat, legacyVatCatalogue, lineVatId, lineVatName, lineVatPercent, receiptVat, sumOf, vatChoices, vatOf, vatRateLabel, vatRateList, vatWire, type VatCatalogue } from "./vat-rate";

describe("input VAT math", () => {
  it("adds 10% to a receipt line of 100.000: VAT 10.000, so the supplier is owed 110.000", () => {
    const vat = sumOf(receiptVat([{ amount: 100_000, percent: 10 }], 0));
    expect(vat).toBe(10_000);
    expect(100_000 - 0 + vat).toBe(110_000);
  });
  it("takes VAT on the amount after the receipt discount: 10.000 off gives VAT 9.000 and 99.000 to pay", () => {
    const vat = sumOf(receiptVat([{ amount: 100_000, percent: 10 }], 10_000));
    expect(vat).toBe(9_000);
    expect(100_000 - 10_000 + vat).toBe(99_000);
  });
  it("spreads the receipt discount over the lines by amount, each line at its own percent", () => {
    // 60.000 and 40.000, 10.000 off: the lines keep 54.000 and 36.000.
    expect(receiptVat([{ amount: 60_000, percent: 10 }, { amount: 40_000, percent: 5 }], 10_000)).toEqual([5_400, 1_800]);
  });
  it("gives no VAT for KCT, 0%, a line without a rate or an empty receipt, and rounds half up to the dong", () => {
    expect(receiptVat([{ amount: 100_000, percent: null }, { amount: 100_000, percent: 0 }, { amount: 100_000, percent: undefined }], 0)).toEqual([0, 0, 0]);
    expect(receiptVat([], 0)).toEqual([]);
    expect(vatOf(12_345, 10)).toBe(1_235);
    expect(vatOf(12_344, 10)).toBe(1_234);
    expect(vatOf(50, 5)).toBe(3);
    expect(vatOf(-100, 10)).toBe(0);
  });
  it("works with a percent that has decimals, which the Owner may now add", () => {
    expect(vatOf(100_000, 8.5)).toBe(8_500);
    expect(vatOf(1_000, 7.25)).toBe(73);
  });
  it("names a rate the way the screens show it", () => {
    expect([vatRateLabel("KCT"), vatRateLabel("8%"), vatRateLabel(null), vatRateLabel(undefined), vatRateLabel("")]).toEqual(["KCT", "8%", "—", "—", "—"]);
  });
});

describe("reading a rate from either API", () => {
  it("reads an item and a line of the catalogue by id, name and percent (KCT has no percent)", () => {
    const item = { purchaseVatRateId: "r8", purchaseVatRateName: "8%", purchaseVatPercent: 8 };
    expect([itemVatId(item), itemVatName(item), itemVatPercent(item)]).toEqual(["r8", "8%", 8]);
    const kct = { purchaseVatRateId: "rk", purchaseVatRateName: "KCT", purchaseVatPercent: null };
    expect([itemVatId(kct), itemVatName(kct), itemVatPercent(kct)]).toEqual(["rk", "KCT", null]);
    const line = { vatRateId: "r5", vatRateName: "5%", vatPercent: 5 };
    expect([lineVatId(line), lineVatName(line), lineVatPercent(line)]).toEqual(["r5", "5%", 5]);
  });
  it("reads an item and a line of an API without the catalogue by the old code", () => {
    expect([itemVatId({ purchaseVatRate: "5" }), itemVatName({ purchaseVatRate: "5" }), itemVatPercent({ purchaseVatRate: "5" })]).toEqual(["5", "5%", 5]);
    expect([itemVatId({ purchaseVatRate: "KCT" }), itemVatName({ purchaseVatRate: "KCT" }), itemVatPercent({ purchaseVatRate: "KCT" })]).toEqual(["KCT", "KCT", null]);
    expect([lineVatId({ vatRate: "10" }), lineVatName({ vatRate: "10" }), lineVatPercent({ vatRate: "10" })]).toEqual(["10", "10%", 10]);
  });
  it("reads a record with no rate at all as none", () => {
    expect([itemVatId({}), itemVatName({}), itemVatPercent({}), lineVatId({}), lineVatName({}), lineVatPercent({})]).toEqual([null, null, null, null, null, null]);
  });
  it("sends the old code only for a line that came from an API without the catalogue", () => {
    expect(keepLegacyVat("10")).toEqual({ vatRate: "10" });
    expect(keepLegacyVat("122bb318-a72e-49aa-a8d7-a6169f889007")).toEqual({});
    expect(keepLegacyVat(null)).toEqual({});
  });
});

describe("the VAT rate catalogue", () => {
  const rows = vatRateList.parse([
    { id: "rk", name: "KCT", percent: null, isExempt: true, isSystem: true, isDefault: false, active: true, sortOrder: 0, itemCount: 2, rowVersion: "a" },
    { id: "r5", name: "5%", percent: 5, isExempt: false, isSystem: false, isDefault: false, active: false, sortOrder: 2, itemCount: 0, rowVersion: "b" },
    { id: "r10", name: "10%", percent: 10, isExempt: false, isSystem: false, isDefault: true, active: true, sortOrder: 4, itemCount: 7, rowVersion: "c" },
  ]);
  const catalogue: VatCatalogue = { rates: rows, legacy: false };
  it("offers the active rates, and the current rate of a record when it was switched off", () => {
    expect(vatChoices(catalogue).map((choice) => choice.name)).toEqual(["KCT", "10%"]);
    expect(vatChoices(catalogue, { id: "r5", name: "5%" }).map((choice) => choice.name)).toEqual(["KCT", "10%", "5%"]);
    expect(vatChoices(catalogue, { id: "gone", name: "12%" }).map((choice) => choice.name)).toEqual(["KCT", "10%", "12%"]);
    expect(vatChoices(catalogue, { id: "r10", name: "10%" })).toHaveLength(2);
  });
  it("finds the default rate among the active ones", () => {
    expect(defaultVatRate(catalogue)?.id).toBe("r10");
  });
  it("serves an API without the catalogue with the old five rates, KCT first and 10% the default, named by their old codes", () => {
    expect(legacyVatCatalogue.legacy).toBe(true);
    expect(legacyVatCatalogue.rates.map((rate) => [rate.id, rate.name, rate.percent])).toEqual([["KCT", "KCT", null], ["0", "0%", 0], ["5", "5%", 5], ["8", "8%", 8], ["10", "10%", 10]]);
    expect(defaultVatRate(legacyVatCatalogue)?.id).toBe("10");
    expect(vatWire(legacyVatCatalogue, "8", "vatRateId", "vatRate")).toEqual({ vatRate: "8" });
    expect(vatWire(catalogue, "r5", "vatRateId", "vatRate")).toEqual({ vatRateId: "r5" });
    expect(vatWire(catalogue, null, "vatRateId", "vatRate")).toEqual({});
  });
  it("fills the flags a lean API leaves out", () => {
    expect(vatRateList.parse([{ id: "x", name: "7%", percent: 7, active: true }])[0]).toMatchObject({ isExempt: false, isSystem: false, isDefault: false, itemCount: 0, sortOrder: 0, rowVersion: "" });
  });
});

describe("VAT mua vào on the item contract and form", () => {
  const base = { id: "00000000-0000-4000-8000-000000000001", code: "VT000001", name: "Phao", group: "Material", unit: "cái", units: [], onHand: 0, stockValue: 0, statusId: 101, status: "InUse", createdAt: "2026-11-28T00:00:00+07:00", rowVersion: "v" };
  const rate = { purchaseVatRateId: "122bb318-a72e-49aa-a8d7-a6169f889007", purchaseVatRateName: "8%", purchaseVatPercent: 8 };
  it("reads an item from an API without the field, or with an old code this web does not know, as having no rate", () => {
    expect(itemVatId(itemRow.parse(base))).toBeNull();
    expect(itemVatId(itemRow.parse({ ...base, purchaseVatRate: "12" }))).toBeNull();
    expect(itemVatId(itemRow.parse({ ...base, purchaseVatRate: "5" }))).toBe("5");
    expect(itemVatId(itemRow.parse({ ...base, ...rate }))).toBe(rate.purchaseVatRateId);
  });
  it("starts the form empty for a new item (the form then offers the default) and at the stored rate otherwise", () => {
    expect(initialValues(null, false).purchaseVatRateId).toBe("");
    expect(initialValues(itemRow.parse(base) as never, false).purchaseVatRateId).toBe("");
    expect(initialValues(itemRow.parse({ ...base, ...rate }) as never, false).purchaseVatRateId).toBe(rate.purchaseVatRateId);
    expect(initialValues(itemRow.parse({ ...base, ...rate }) as never, true).purchaseVatRateId).toBe(rate.purchaseVatRateId);
    expect(initialValues(itemRow.parse({ ...base, group: "Seed", ...rate }) as never, false).purchaseVatRateId).toBe("");
  });
  it("sends the rate of a supply item by id, by the old code for an API without the catalogue, and none for a seed", () => {
    const values = { ...initialValues(null, false), group: "Material", purchaseVatRateId: "r5" };
    const catalogue: VatCatalogue = { rates: vatRateList.parse([{ id: "r5", name: "5%", percent: 5, active: true }]), legacy: false };
    expect(buildSaveBody(values, null, catalogue)).toMatchObject({ purchaseVatRateId: "r5" });
    expect(buildSaveBody({ ...values, purchaseVatRateId: "5" }, null, legacyVatCatalogue)).toMatchObject({ purchaseVatRate: "5" });
    expect(buildSaveBody({ ...values, group: "Seed" }, null, catalogue)).not.toHaveProperty("purchaseVatRateId");
    expect(buildSaveBody({ ...values, purchaseVatRateId: "" }, null, catalogue)).not.toHaveProperty("purchaseVatRateId");
  });
  it("leaves the rate out when an item keeps a rate that was switched off, so the API keeps it", () => {
    const record = itemRow.parse({ ...base, ...rate }) as never;
    const off: VatCatalogue = { rates: vatRateList.parse([{ id: rate.purchaseVatRateId, name: "8%", percent: 8, active: false }]), legacy: false };
    const values = initialValues(record, false);
    expect(buildSaveBody(values, record, off)).not.toHaveProperty("purchaseVatRateId");
    const on: VatCatalogue = { rates: vatRateList.parse([{ id: rate.purchaseVatRateId, name: "8%", percent: 8, active: true }]), legacy: false };
    expect(buildSaveBody(values, record, on)).toMatchObject({ purchaseVatRateId: rate.purchaseVatRateId });
  });
});
