import { z } from "zod";

/**
 * Input VAT ("VAT mua vào"): the Owner keeps a catalogue of rates (`/api/vat-rates`); an item and a purchase line point at one of them.
 * `KCT` is the system rate "không chịu thuế GTGT" (oysters sold and seed are always KCT) and has no percent. A line made before input VAT existed has no rate (null).
 *
 * An API that does not have the catalogue yet (404) is served by the earlier fixed list of five rates, whose ids are the old codes
 * ("KCT", "0", "5", "8", "10"); the items and lines of such an API name their rate by those codes in `purchaseVatRate` / `vatRate`.
 */
export const legacyVatCodes = ["KCT", "0", "5", "8", "10"] as const;
export type LegacyVatCode = (typeof legacyVatCodes)[number];
export const legacyVatCode = z.enum(legacyVatCodes);
/** Tolerant of an API that does not send the old field, or sends a value this web does not know: both read as "no rate". */
export const legacyVatField = legacyVatCode.nullish().catch(null);

const flag = z.boolean().nullish().transform((value) => value ?? false);
const whole = z.number().nullish().transform((value) => value ?? 0);
export const vatRateRow = z.object({
  id: z.string().min(1), name: z.string(), percent: z.number().nullish().transform((value) => value ?? null),
  isExempt: flag, isSystem: flag, isDefault: flag, active: z.boolean(), sortOrder: whole, itemCount: whole, rowVersion: z.string().nullish().transform((value) => value ?? ""),
});
export type VatRateRow = z.infer<typeof vatRateRow>;
export const vatRateList = z.array(vatRateRow);
export const vatRateDeactivated = z.object({ rate: vatRateRow, movedItems: whole });

/** The rates a screen picks from. `legacy` is true when they are the fixed list of an API without the catalogue. */
export type VatCatalogue = { rates: readonly VatRateRow[]; legacy: boolean };
export const emptyVatCatalogue: VatCatalogue = { rates: [], legacy: false };
const legacyRow = (code: LegacyVatCode, sortOrder: number): VatRateRow => ({
  id: code, name: code === "KCT" ? "KCT" : `${code}%`, percent: code === "KCT" ? null : Number(code), isExempt: code === "KCT", isSystem: code === "KCT", isDefault: code === "10", active: true, sortOrder, itemCount: 0, rowVersion: "",
});
export const legacyVatCatalogue: VatCatalogue = { rates: legacyVatCodes.map((code, index) => legacyRow(code, index)), legacy: true };

/** A rate name for a field or a column: "—" for no rate at all. */
export const vatRateLabel = (name: string | null | undefined) => name == null || name === "" ? "—" : name;
/** The name of a legacy code as the screens show it ("10" is "10%"). */
export const legacyVatName = (code: string | null | undefined) => code == null || code === "" ? null : code === "KCT" ? "KCT" : `${code}%`;
const legacyPercent = (code: string | null | undefined) => code == null || code === "KCT" || code === "" ? null : Number(code);

/** Which rate an item points at, whichever way its API names it: the id of the catalogue, or the old code. */
export type ItemVat = { purchaseVatRateId?: string | null; purchaseVatRateName?: string | null; purchaseVatPercent?: number | null; purchaseVatRate?: string | null };
export const itemVatId = (row: ItemVat) => row.purchaseVatRateId ?? row.purchaseVatRate ?? null;
export const itemVatName = (row: ItemVat) => row.purchaseVatRateName ?? legacyVatName(row.purchaseVatRateId ? null : row.purchaseVatRate);
export const itemVatPercent = (row: ItemVat) => row.purchaseVatRateId ? row.purchaseVatPercent ?? null : legacyPercent(row.purchaseVatRate);

/** The same for a receipt or return line. */
export type LineVat = { vatRateId?: string | null; vatRateName?: string | null; vatPercent?: number | null; vatRate?: string | null };
export const lineVatId = (row: LineVat) => row.vatRateId ?? row.vatRate ?? null;
export const lineVatName = (row: LineVat) => row.vatRateName ?? legacyVatName(row.vatRateId ? null : row.vatRate);
export const lineVatPercent = (row: LineVat) => row.vatRateId ? row.vatPercent ?? null : row.vatPercent ?? legacyPercent(row.vatRate);

export const findVatRate = (catalogue: VatCatalogue, id: string | null | undefined) => id ? catalogue.rates.find((rate) => rate.id === id) : undefined;
export const defaultVatRate = (catalogue: VatCatalogue) => catalogue.rates.find((rate) => rate.isDefault && rate.active);

/**
 * The choices of a rate picker: the active rates in catalogue order, plus the rate the record has now when it was switched off, so the record still shows its name.
 * `current.name` is the name the record carries, for a rate that is no longer in the list at all.
 */
export function vatChoices(catalogue: VatCatalogue, current?: { id: string | null | undefined; name?: string | null }): { id: string; name: string }[] {
  const choices = catalogue.rates.filter((rate) => rate.active).map((rate) => ({ id: rate.id, name: rate.name }));
  if (current?.id && !choices.some((choice) => choice.id === current.id)) choices.push({ id: current.id, name: findVatRate(catalogue, current.id)?.name ?? current.name ?? current.id });
  return choices;
}

/** A rate on the wire: the catalogue id under `key`, or, for an API without the catalogue, the old code under `legacyKey`. */
export const vatWire = (catalogue: VatCatalogue, id: string | null | undefined, key: string, legacyKey: string): Record<string, string> =>
  id ? { [catalogue.legacy ? legacyKey : key]: id } : {};

/** The old code of a line read from an API without the rate catalogue, to send back unchanged (a catalogue rate sends nothing: leaving the rate out keeps the stored one). */
export const keepLegacyVat = (id: string | null | undefined): Record<string, string> => id && legacyVatCode.safeParse(id).success ? { vatRate: id } : {};

/** VAT of an amount to the whole dong, half up (the rounding of purchasing money); KCT, 0% and "no rate" (percent null) give 0. */
export const vatOf = (amount: number, percent: number | null | undefined) => Math.round(Math.max(0, amount) * (percent ?? 0) / 100);

/**
 * VAT of every line of a receipt: (line amount - its share of the receipt discount, spread by line amount) x percent, half up.
 * `lines` carry the amount of each line (quantity x net unit price, already rounded) and its percent (null for KCT or no rate).
 */
export function receiptVat(lines: readonly { amount: number; percent: number | null | undefined }[], discount: number): number[] {
  const goods = lines.reduce((sum, line) => sum + line.amount, 0);
  return lines.map((line) => vatOf(goods > 0 ? line.amount * (goods - discount) / goods : line.amount, line.percent));
}
export const sumOf = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0);

/** The percent of a rate as a person reads it: "10%", "8,5%"; "—" for KCT. */
export const percentText = (percent: number | null | undefined) => percent == null ? "—" : `${String(percent).replace(".", ",")}%`;
