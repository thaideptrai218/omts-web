import { z } from "zod";
/** The product farmed in a cycle; null for a cycle started before products were recorded. */
export const cycleProduct = z.object({ id: z.guid(), code: z.string(), name: z.string() });
export const cycleSummary = z.object({ id: z.guid(), startDate: z.string(), closeDate: z.string().nullable(), statusId: z.number(), status: z.string(), rowVersion: z.string(), product: cycleProduct.nullish() });
export const zoneCycles = z.array(z.object({ raftId: z.guid(), raftCode: z.string(), raftStatusId: z.number(), raftStatus: z.string(), laneCount: z.number(), cycle: cycleSummary.nullable(), lastCloseDate: z.string().nullable(), canStart: z.boolean(), canEdit: z.boolean(), canCancel: z.boolean() }));
export const cycleHistory = z.array(cycleSummary);
export const cycleInput = z.strictObject({ startDate: z.iso.date().nullable(), expectedSeedQuantity: z.number().nullable(), expectedHarvestDate: z.iso.date().nullable(), targetYieldKg: z.number().nullable(), productId: z.guid().nullable() });
export const cycleView = cycleSummary.extend({ raftId: z.guid(), raftCode: z.string(), expectedSeedQuantity: z.number().nullable(), expectedHarvestDate: z.string().nullable(), targetYieldKg: z.number().nullable(), seedingCompletedOn: z.string().nullable(), assessment: z.string().nullable(), closedEarly: z.boolean(), daysOfFarming: z.number(), canEdit: z.boolean(), canCancel: z.boolean() });
export const cycleProgress = z.object({ raftId: z.guid(), raftCode: z.string(), date: z.string(), cycle: cycleView.nullable(), lanes: z.array(z.object({ id: z.guid(), laneNumber: z.number(), statusId: z.number(), status: z.string(), state: z.string() })), notSeededLanes: z.array(z.number()) });
