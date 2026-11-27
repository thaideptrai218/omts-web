import { z } from "zod";

/**
 * Input VAT ("VAT mua vào"): the rate on a supply item and on a purchase line, as the API names it. `KCT` is "không chịu thuế GTGT"
 * (oysters sold and seed are always KCT); the others are percentages. A line made before input VAT existed has no rate at all (null).
 */
export const vatRates = ["KCT", "0", "5", "8", "10"] as const;
export type VatRate = (typeof vatRates)[number];
export const vatRate = z.enum(vatRates);
/** Tolerant of an API that does not send the field yet, or sends a value this web does not know: both read as "no rate". */
export const vatRateField = vatRate.nullish().catch(null);
/** A new supply item starts at 10%. */
export const DEFAULT_PURCHASE_VAT: VatRate = "10";

export const vatRateLabel = (rate: VatRate | string | null | undefined) => rate == null || rate === "" ? "—" : rate === "KCT" ? "KCT" : `${rate}%`;
/** The choices under a "(%)" heading (a field or a column): the rate alone. Where no such heading stands, `vatRateLabelChoices` spells the percent. */
export const vatRateChoices: readonly (readonly [VatRate, string])[] = vatRates.map((rate) => [rate, rate] as const);
export const vatRateLabelChoices: readonly (readonly [VatRate, string])[] = vatRates.map((rate) => [rate, vatRateLabel(rate)] as const);
export const isVatRate = (value: unknown): value is VatRate => vatRates.includes(value as VatRate);
const percentOf = (rate: VatRate | null | undefined) => rate == null || rate === "KCT" ? 0 : Number(rate);

/** VAT of an amount to the whole dong, half up (the rounding of purchasing money); KCT, 0% and "no rate" give 0. */
export const vatOf = (amount: number, rate: VatRate | null | undefined) => Math.round(Math.max(0, amount) * percentOf(rate) / 100);

/**
 * VAT of every line of a receipt: (line amount - its share of the receipt discount, spread by line amount) x rate, half up.
 * `lines` carry the amount of each line (quantity x net unit price, already rounded) and its rate.
 */
export function receiptVat(lines: readonly { amount: number; rate: VatRate | null | undefined }[], discount: number): number[] {
  const goods = lines.reduce((sum, line) => sum + line.amount, 0);
  return lines.map((line) => vatOf(goods > 0 ? line.amount * (goods - discount) / goods : line.amount, line.rate));
}
export const sumOf = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0);
