import { z } from "zod";

/**
 * Shapes of the Lô thu hoạch screen (api/harvest-lots), as the BFF at /api/operations/harvest hands them over: the list with its totals, the sales history
 * of one lot, and the answers of weigh, reopen and close. The lot itself (`harvestDetail`) is the one of the raft harvest screen.
 */
const id = z.guid(), text = z.string(), opt = text.nullish(), kg = z.number();

/** Status ids of a lot: it is for sale only while Open or Reopened; a new lot waits to be weighed. */
export const LOT = { open: 2901, reopened: 2902, closed: 2903, awaitingWeighing: 2904 } as const;
export const lotStatusIds = [LOT.awaitingWeighing, LOT.open, LOT.reopened, LOT.closed] as const;
export const closeReasons = ["SoldWholeLot", "Unsold", "Spoiled", "TimeLimitReached"] as const;
export type CloseReason = (typeof closeReasons)[number];
/** The kinds of movement of a lot on the product ledger; LotClose takes the kg left off when the lot is closed. */
export const movementKinds = ["Harvest", "Sale", "Disposal", "Return", "Reversal", "LotClose"] as const;

export const lotFigures = z.object({ invoicedKg: kg, returnedKg: kg, soldKg: kg, remainingKg: kg, lostKg: kg });
export const lotProduct = z.object({ productId: id, code: text, name: text });
export const lotRow = z.object({
  id, lotCode: text, harvestedAt: text, harvestDate: z.iso.date(), zoneId: id, zoneCode: text, raftId: id, raftCode: text, cycleId: id.nullish(),
  products: z.array(lotProduct).default([]), cageCount: kg, estimatedKg: kg, weighedKg: kg.nullish(), weighedAt: opt, figures: lotFigures,
  statusId: z.number().int(), status: text, closeReason: opt, closeDate: opt, harvestPlan: z.object({ id, code: text }).nullish(), recordedByName: opt,
});
export const lotTotals = z.object({ cageCount: kg, estimatedKg: kg, weighedKg: kg, soldKg: kg, remainingKg: kg, lostKg: kg });
export const lotPage = z.object({ items: z.array(lotRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(), totals: lotTotals });

export const lotMovement = z.object({
  id, occurredAt: text, kind: z.string(), documentId: id.nullish(), documentCode: opt, productId: id.nullish(), productCode: opt, productName: opt,
  quantityKg: kg, transactionPrice: z.number().nullish(), partyName: opt, partyCode: opt,
  /** The order an invoice was made from (Sale rows). */
  salesOrderCode: opt,
});
/** Oldest first; the API answers the list itself, an `items` wrapper is read as well. */
export const lotMovements = z.union([z.array(lotMovement), z.object({ items: z.array(lotMovement) }).transform((value) => value.items)]);

export type LotRow = z.infer<typeof lotRow>;
export type LotTotals = z.infer<typeof lotTotals>;
export type LotPage = z.infer<typeof lotPage>;
export type LotMovement = z.infer<typeof lotMovement>;

/** Filters of the list, as the query of the BFF carries them (every value is text; an empty one is left out). */
export type LotListQuery = Partial<Record<"from" | "to" | "zoneId" | "zoneIds" | "raftId" | "productId" | "statusId" | "weighed" | "closeReason" | "hasPlan" | "search" | "sort" | "desc" | "page" | "pageSize", string>>;

const decimals = (places: number) => (value: number) => Math.abs(value * 10 ** places - Math.round(value * 10 ** places)) < 1e-6;
/** One weighed kg: more than 0, at most 3 decimals. */
export const weighedKgValue = z.number().positive().max(1_000_000_000).refine(decimals(3));
const version = { rowVersion: z.string().min(1).max(200) };

/**
 * Body of POST weigh ("Hoàn tất"): the kg of the lot are the sum of its cages on the sheet, so only the version of the sheet and an optional time go.
 * `weighedAt` (the API takes now) may not be before the harvest or in the future; the API checks that against the lot.
 */
export const weighValues = z.strictObject({ ...version, weighedAt: z.iso.datetime({ offset: true }).optional() });
/** Body of POST/PUT of one cage: `productId` is left out when the lot has one product; `clientOperationId` makes an add safe to send again. */
export const cageValues = z.strictObject({ kg: weighedKgValue, productId: z.guid().optional(), clientOperationId: z.guid().optional() });
export const cageUpdateValues = z.strictObject({ cageId: z.guid(), kg: weighedKgValue, productId: z.guid().optional() });
export const cageRemoveValues = z.strictObject({ cageId: z.guid() });
export const reopenValues = z.strictObject({ ...version, reason: z.string().trim().min(1).max(1000) });
/** Close by hand: the kg left over (0 or more, 2 decimals) and, above 0, why it was not sold. The Owner may close although the crew is not checked out, with a reason. */
export const closeValues = z.strictObject({
  ...version, leftoverKg: z.number().min(0).max(1_000_000_000).refine(decimals(2)), reason: z.enum(["Unsold", "Spoiled"]).optional(),
  ownerApproved: z.boolean().optional(), approvalReason: z.string().trim().min(1).max(1000).optional(),
}).refine((value) => value.leftoverKg === 0 || value.reason !== undefined);
export type WeighValues = z.infer<typeof weighValues>;
