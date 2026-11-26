import { z } from "zod";

/**
 * The weighing sheet (phiếu cân) of one lot, as GET /api/harvest-lots/{id}/cages answers it (and every cage write): the cages weighed at the port in order, the sum per product line,
 * and, when the lot has a trader, the trader's own cages beside them with the agreement. The trader fields are read defensively: an older API leaves them out.
 */
const id = z.guid(), text = z.string(), kg = z.number();
export const cageRow = z.object({ id, number: z.number().int(), productId: id.nullish(), kg, weighedAt: text.nullish() });
export const traderCage = z.object({ id, number: z.number().int(), kg, weighedAt: text.nullish() });
export const cageProduct = z.object({
  lineNumber: z.number().int().nullish(), productId: id, productCode: text, productName: text,
  harvestedCages: kg.default(0), weighedCages: z.number().default(0), cagesKg: kg.default(0), weighedKg: kg.nullish(),
});
export const cageSheet = z.object({
  lotId: id, lotCode: text, statusId: z.number().int().nullish(), status: text.nullish(), rowVersion: text, harvestedCages: kg.default(0), estimatedKg: kg.default(0),
  cages: z.array(cageRow).default([]), products: z.array(cageProduct).default([]), cagesKg: kg.default(0), weighedKg: kg.nullish(), weighedAt: text.nullish(),
  needsCompleting: z.boolean().default(false), canEdit: z.boolean().default(false),
  orderCodes: z.array(text).default([]), traderName: text.nullish(), traderCages: z.array(traderCage).default([]), traderCagesKg: kg.nullish(),
  agreement: z.object({ agreedAt: text.nullish(), agreedKg: kg.nullish() }).nullish(), needsAgreement: z.boolean().default(false), canAgree: z.boolean().default(false),
});
export type CageSheet = z.infer<typeof cageSheet>;
export type CageRow = z.infer<typeof cageRow>;
