import { z } from "zod";
import { cycleView } from "./contracts";

const optionalNumber = z.number().nullish();
/**
 * CycleSummary of the backend (GET /summary, `summary` of close/preview and of close): one reader, same figures.
 * Fields added on 11/11/2026 (harvestedCages, remainingKg) are optional so an older backend still parses.
 * kgHarvested is the sum of ESTIMATED kg (web label "ước tính"); cages are decimal.
 */
export const cycleFigures = z.object({
  cycleId: z.guid(), raftCode: z.string(), startDate: z.string(), closeDate: z.string().nullable(), asOf: z.string(),
  seedingSessionCount: z.number(), seedHung: z.number(), seedUnit: z.string().nullable(),
  harvestLotCount: z.number(), kgHarvested: z.number(), lastHarvestDate: z.string().nullable(), daysOfFarming: z.number(),
  expectedSeedQuantity: optionalNumber, targetYieldKg: optionalNumber,
  nursery: z.object({ batchId: z.string(), batchCode: z.string(), quantityIn: optionalNumber, survivors: optionalNumber, lossPieces: optionalNumber, lossPercent: optionalNumber, estimated: z.boolean().optional() }).nullish(),
  closedEarly: z.boolean(), earlyReason: z.string().nullish(), notHarvestedLanes: z.array(z.number().int()), assessment: z.string().nullish(),
  harvestedCages: optionalNumber, remainingKg: optionalNumber,
  lostLanes: z.array(z.object({ laneNumber: z.number().int(), date: z.string().nullish(), reason: z.string().nullish(), reasonCode: z.string().nullish() })).optional(), damagedLanes: z.array(z.number().int()).optional(),
});
export type CycleFigures = z.infer<typeof cycleFigures>;

export const closePreview = z.object({
  summary: cycleFigures, isEarly: z.boolean(), needsOwnerApproval: z.boolean(),
  earlyCloseMessage: z.string().nullish(), earlyCloseMessageCode: z.string().nullish(),
  confirmMessage: z.string(), confirmMessageCode: z.string().nullish(), cycleRowVersion: z.string().min(1),
});
export type ClosePreview = z.infer<typeof closePreview>;

/** Body of POST /close: the assessment is required (CYCLE-06.0.E1); ownerApproved only answers MSG-CYCLE-07 for a Zone Manager. */
export const closeValues = z.strictObject({
  assessment: z.string().trim().min(1).max(2000), rowVersion: z.string().min(1), ownerApproved: z.boolean().optional(),
});
export type CloseValues = z.infer<typeof closeValues>;
export const closedCycle = z.object({ cycle: cycleView, summary: cycleFigures });
export type ClosedCycle = z.infer<typeof closedCycle>;
