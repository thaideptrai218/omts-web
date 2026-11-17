import { z } from "zod";
import { seedLotStates } from "@/features/purchase-documents/contracts";

/**
 * Shapes of the Lô giống screen (api/seed-lots), as the BFF at /api/operations/seed-lots hands them over. A seed lot is one Seed line of a completed
 * receipt; its state is worked out by the API from the quantities, never stored. Quantities are in the unit of the seed item (`unitName`).
 */
const id = z.guid(), text = z.string(), opt = text.nullish(), qty = z.number();

export { seedLotStates };
export type SeedLotState = (typeof seedLotStates)[number];
/** FullySeeded, FullyReturned, FullyLost and UsedUp end the life of a lot: nothing is left and nothing can be done with it. */
export const finalSeedLotStates: readonly SeedLotState[] = ["FullySeeded", "FullyReturned", "FullyLost", "UsedUp"];
export const seedLotSorts = ["code", "receivedAt", "remaining"] as const;

const ref = z.object({ id, code: opt, name: text });
export const seedLotRow = z.object({
  id, seedLotCode: text, receiptId: id, receiptCode: text, receivedAt: text, supplier: ref, item: ref, product: ref.nullish(), unitName: text,
  receivedQty: qty, returnedQty: qty, nursingQty: qty, nurseryLossQty: qty, seededQty: qty, issuedOtherQty: qty, remainingQty: qty,
  /** remaining - nursing: the stock still on hand, what Ươm, Treo and Trả hàng can take. `nursingQty` includes the pool of Completed batches. */
  availableQty: qty,
  state: z.enum(seedLotStates), lastUsedAt: opt,
});
/** The sums of the figure columns over the whole filter. Read by name, so a column the API does not total shows a dash. */
export const seedLotTotals = z.object({}).catchall(qty);
/** The lots of each state under the other filters (all seven states, so the pills show their count whatever is picked). */
export const seedLotStateCounts = z.partialRecord(z.enum(seedLotStates), z.number().int());
export const seedLotPage = z.object({ items: z.array(seedLotRow), total: z.number().int(), page: z.number().int(), pageSize: z.number().int(), totals: seedLotTotals, stateCounts: seedLotStateCounts.optional() });

export const seedLotNurseryBatch = z.object({ id, code: text, statusId: z.number().int(), status: opt, quantityIn: qty, survivors: qty.nullish(), startDate: opt });
export const seedLotSeeding = z.object({ id, cycleId: id.nullish(), raftCode: opt, zoneCode: opt, quantity: qty, seededAt: opt });
export const seedLotReturn = z.object({ id, code: text, quantity: qty, returnedAt: opt, statusId: z.number().int() });
export const seedLotIssue = z.object({ id, code: text, kind: z.string(), quantity: qty, issuedAt: opt });
export const seedLotCycle = z.object({ id, raftCode: opt, zoneCode: opt, statusId: z.number().int().nullish(), productCode: opt });
export const seedLotHarvest = z.object({ id, lotCode: text, statusId: z.number().int(), weighedKg: qty.nullish(), estimatedKg: qty.nullish() });
export const seedLotDetail = seedLotRow.extend({
  nurseryBatches: z.array(seedLotNurseryBatch).default([]), seedings: z.array(seedLotSeeding).default([]), returns: z.array(seedLotReturn).default([]),
  issues: z.array(seedLotIssue).default([]), cycles: z.array(seedLotCycle).default([]), harvestLots: z.array(seedLotHarvest).default([]),
});

export type SeedLotRow = z.infer<typeof seedLotRow>;
export type SeedLotTotals = z.infer<typeof seedLotTotals>;
export type SeedLotPage = z.infer<typeof seedLotPage>;
export type SeedLotDetail = z.infer<typeof seedLotDetail>;

/** Filters of the list, as the query of the BFF carries them (every value is text; an empty one is left out). */
export type SeedLotListQuery = Partial<Record<"from" | "to" | "supplierId" | "itemId" | "zoneId" | "state" | "search" | "sort" | "sortDir" | "page" | "pageSize", string>>;
