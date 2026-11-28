import { z } from "zod";

/**
 * Shapes of the sales return module (api/sales-returns and api/sales-invoices/{id}/sales-return), as the BFF at /api/operations/sales-returns hands them over.
 * A return takes the WHOLE invoice back (no partial return); each invoice line goes back for sale or is thrown away. A return does not change the order.
 * Fields the backend adds in the lifecycle rework (`salesOrder`, `customer`, `zoneCode`, `backForSaleKg`, `discardedKg`, `canCancel`) are optional, so an older answer still reads.
 */
const id = z.guid(), text = z.string(), opt = text.nullish(), money = z.number(), kg = z.number();

/** Status ids of a return: 4101 Đã ghi nhận, 4102 Đã hủy. */
export const RETURN = { recorded: 4101, cancelled: 4102 } as const;
export const outcomes = ["BackForSale", "ThrownAway"] as const;
export type Outcome = (typeof outcomes)[number];
export const MAX_REASON = 1000;

const ref = z.object({ id, code: text });
const person = z.object({ id, name: text });

export const returnLine = z.object({
  invoiceLineId: id, lineNumber: z.number().int().nullish(), productName: opt, productCode: opt, harvestLotId: id, lotCode: text, returnedKg: kg, outcome: z.enum(outcomes), discardedKg: kg,
});
export const returnLotFigures = z.object({ harvestLotId: id, lotCode: text, remainingKg: kg, remainingAfterCancelKg: kg });
export const returnView = z.object({
  id, code: text, invoiceId: id, invoiceCode: text, returnDate: z.iso.date(), recordedAt: opt, reason: text, value: money, statusId: z.number().int(), status: text, recordedBy: person,
  cancelledAt: opt, cancelledBy: person.nullish(), cancelReason: opt, lines: z.array(returnLine), lots: z.array(returnLotFigures).default([]), rowVersion: text,
  salesOrder: ref.nullish(), customer: z.object({ id, code: opt, name: text }).nullish(), zoneCode: opt, backForSaleKg: kg.nullish(), discardedKg: kg.nullish(), canCancel: z.boolean().default(false),
  message: opt, messageCode: opt,
});
export type ReturnView = z.infer<typeof returnView>;

export const returnRow = z.object({
  id, code: text, returnDate: z.iso.date(), recordedAt: opt, invoiceId: id, invoiceCode: text, salesOrder: ref.nullish(), customer: z.object({ id, code: opt, name: text }).nullish(), zoneCode: opt,
  value: money, statusId: z.number().int(), status: text, recordedByName: opt, lineCount: z.number().int(), backForSaleKg: kg, discardedKg: kg,
});
export const returnTotals = z.object({ value: money, backForSaleKg: kg, discardedKg: kg });
export const returnPage = z.object({ items: z.array(returnRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(), totals: returnTotals });
export type ReturnRow = z.infer<typeof returnRow>;
export type ReturnPage = z.infer<typeof returnPage>;
export type ReturnTotals = z.infer<typeof returnTotals>;

/** Filters of the list, as the BFF query carries them (every value is text; an empty one is left out; `zoneIds` are the chosen zones joined by commas). `sortDir` is asc or desc. */
export type ReturnListQuery = Partial<Record<"from" | "to" | "customerId" | "zoneIds" | "statusId" | "search" | "sort" | "sortDir" | "page" | "pageSize", string>>;
export const returnSorts = ["code", "returnDate", "value"] as const;

export const previewLine = z.object({
  invoiceLineId: id, lineNumber: z.number().int(), productName: text, harvestLotId: id, lotCode: text, lotStatusId: z.number().int(), lotStatus: opt, kg, unitPrice: money, amount: money,
});
export const previewClaim = z.object({ id, code: text, sentAt: text, statusId: z.number().int(), status: opt, offer: z.string().nullish() });
export const returnPreview = z.object({
  invoiceId: id, invoiceCode: text, rowVersion: text, requiresCustomer: z.boolean(), customer: z.object({ id, name: text, phoneNumber: opt, code: opt }).nullish(),
  lines: z.array(previewLine), value: money, qualityClaims: z.array(previewClaim).default([]), customerDebt: money.nullish(), debtAfter: money.nullish(), owedBackAfter: money.default(0), ownerMustAgree: z.boolean(),
});
export type ReturnPreview = z.infer<typeof returnPreview>;
export type PreviewLine = z.infer<typeof previewLine>;

/** The answer of the save: the return, the debt after it (below 0 it is money owed back) and the money owed back. */
export const returnSaved = z.object({ return: returnView, debtAfter: money.nullish(), owedBack: money.default(0), message: opt, messageCode: opt });
export type ReturnSaved = z.infer<typeof returnSaved>;

/** One answer to MSG-HARVEST-02: a lot of thrown-away oysters that is still for sale stays for sale, or is closed now with the kg left (above 0, with why). */
export const thrownAwayAnswer = z.strictObject({
  harvestLotId: id, stillForSale: z.boolean(), leftoverKg: z.number().min(0).max(1_000_000_000).optional(), closeReason: z.enum(["Unsold", "Spoiled"]).optional(),
}).refine((answer) => answer.stillForSale || !answer.leftoverKg || answer.closeReason !== undefined);
export type ThrownAwayAnswer = z.infer<typeof thrownAwayAnswer>;

const rowVersion = z.string().min(1).max(200), reason = z.string().trim().min(1).max(MAX_REASON);
/** Body of POST sales-return: the reason, every invoice line once with its outcome, and the answers to the questions asked so far. */
export const createReturnBody = z.strictObject({
  reason, rowVersion, lines: z.array(z.strictObject({ invoiceLineId: id, outcome: z.enum(outcomes) })).min(1).max(200)
    .refine((lines) => new Set(lines.map((line) => line.invoiceLineId)).size === lines.length),
  customerId: id.optional(), ownerAgreed: z.boolean().optional(), thrownAwayLots: z.array(thrownAwayAnswer).max(200).optional(),
});
export type CreateReturnBody = z.infer<typeof createReturnBody>;
/** Body of POST cancel (Owner only). */
export const cancelReturnBody = z.strictObject({ reason, rowVersion, confirmNegativeRemaining: z.boolean().optional() });
export type CancelReturnBody = z.infer<typeof cancelReturnBody>;
