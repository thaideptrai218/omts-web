import { z } from "zod";
import { nurseryReadFields } from "./seeding-contracts";
export const cycleSummary = z.object({ ...nurseryReadFields, nurseryAllocated: z.number().nullish(), id: z.guid(), startDate: z.iso.date(), closeDate: z.iso.date().nullable(), statusId: z.number().int(), status: z.string(), rowVersion: z.string() });
export const cycle = cycleSummary.extend({ raftId: z.guid(), raftCode: z.string(), expectedSeedQuantity: z.number().nullable(), targetYieldKg: z.number().nullable(), seedingCompletedOn: z.iso.date().nullable(), assessment: z.string().nullable(), closedEarly: z.boolean(), daysOfFarming: z.number(), canEdit: z.boolean(), canCancel: z.boolean() });
export const zoneCycle = z.object({ raftId: z.guid(), raftCode: z.string(), raftStatusId: z.number(), raftStatus: z.string(), laneCount: z.number(), cycle: cycleSummary.nullable(), lastCloseDate: z.iso.date().nullable(), canStart: z.boolean(), canEdit: z.boolean(), canCancel: z.boolean() });
export const cycleValues = z.strictObject({ startDate: z.iso.date().nullable(), expectedSeedQuantity: z.number().positive().nullable(), targetYieldKg: z.number().positive().nullable() });
export type Cycle = z.infer<typeof cycle>;
export type ZoneCycle = z.infer<typeof zoneCycle>;
