import { z } from "zod";
import { stepPhotosSchema } from "@/components/form/photo-contracts";
import { laneProgressReadFields } from "@/features/farming-management/lane-progress-contracts";
import { lanePercentRead, lanePercentValues } from "./record-lane-percents";

const numbers = z.array(z.number().int().positive());
const displayText = z.string().nullish().transform(value => value ?? "");

/** Read metadata may arrive incrementally; blank text is unknown, never a fabricated lot. */
export const seedLot = z.object({
  id: displayText, code: displayText, receiptCode: displayText,
  supplierName: displayText, unit: displayText, itemName: z.string().nullish().transform(value => value ?? null),
  receiptId: z.string().nullish(), supplierId: z.string().nullish(),
  itemId: z.string().nullish(), itemCode: z.string().nullish(),
});

/** V2 stock belongs to the nursery batch; nurserySeeded is specific to this cycle. */
export const nurseryReadFields = {
  nurseryBatchId: z.string().nullish(), nurseryCode: z.string().nullish(),
  nurseryRemaining: z.number().nullish(), nurserySeeded: z.number().nullish(),
  seedLot: seedLot.nullish(),
};

export const seedingLane = z.object({
  ...laneProgressReadFields,
  laneNumber: z.number().int().positive(), canSeed: z.boolean().default(true),
  state: z.string().optional().catch(undefined), isDamaged: z.boolean().optional(),
  isOutOfService: z.boolean().optional(), statusId: z.number().int().optional(),
  lineLengthM: z.number().positive().nullish(), remainingPercent: z.number().nullish(),
});

export const seedLots = z.object({
  raftId: z.guid(),
  lots: z.array(seedLot.extend({
    quantityReceived: z.number(), quantitySeeded: z.number(), boughtForThisRaft: z.boolean(),
    onHand: z.number().nullish(), quantityReturned: z.number().nullish(), quantityConsumed: z.number().nullish(),
  })),
});

export const seedingRecord = z.object({
  photos: stepPhotosSchema, lanePercents: lanePercentRead,
  id: z.guid(), cycleId: z.guid(), raftId: z.guid(), raftCode: z.string(), seedingDate: z.iso.date(),
  seedLot: seedLot.nullish().transform(value => value ?? seedLot.parse({})),
  quantity: z.number(), laneNumbers: numbers,
  recordedByName: z.string().nullish().transform(value => value ?? null), recordedAt: z.string(),
  canCorrect: z.boolean().default(false), rowVersion: z.string(),
  issueId: z.guid().nullish(), issueCode: z.string().nullish(),
});

const seedingListRead = z.object({
  ...nurseryReadFields,
  // Kept readable for historical payloads, never used to derive V2 pool capacity.
  nurseryAllocated: z.number().nullish(),
  cycleId: z.guid(), raftId: z.guid(), raftCode: z.string(),
  seedingCompletedOn: z.iso.date().nullish().transform(value => value ?? null),
  laneCount: z.number(), seededCount: z.number(), notSeededLanes: numbers.default([]),
  canRecord: z.boolean(), canMarkComplete: z.boolean(),
  lanes: z.array(seedingLane).default([]),
  // Lanes the next seeding can pick (not full, not unavailable); full lanes stay in `lanes` for the overview only.
  seedableLaneNumbers: numbers.nullish(),
  records: z.array(seedingRecord).default([]),
  lots: z.array(z.object({ seedLotId: z.guid(), code: z.string(), unit: z.string(), quantity: z.number() })).default([]),
  cycleRowVersion: z.string(),
});

export const seedingList = seedingListRead;

/** Legacy cycles retain lot/plan inputs; V2 supplies cycleId and a free positive daily quantity. */
export const seedValues = z.strictObject({
  cycleId: z.guid().optional(), seedingDate: z.iso.date(), seedLotId: z.guid().optional(),
  lanePercents: lanePercentValues.optional(),
  laneNumbers: numbers.min(1).refine(value => new Set(value).size === value.length),
  quantity: z.number().positive(), confirmOverPlan: z.boolean().optional(),
  overPlanReason: z.string().trim().min(1).max(1000).optional(),
}).refine(value => !value.confirmOverPlan || !!value.overPlanReason, { path: ["overPlanReason"] })
  .refine(value => !!value.confirmOverPlan || value.overPlanReason === undefined, { path: ["confirmOverPlan"] });

export const seedCorrection = seedValues.safeExtend({
  reason: z.string().trim().min(1).max(1000), rowVersion: z.string().min(1),
  keepPhotoIds: z.array(z.string().min(1)).max(3).optional(),
});

export const seedingPreview = z.object({
  cycleId: z.guid(), laneCount: z.number(), seededCount: z.number(),
  notSeededLanes: numbers.default([]), cycleRowVersion: z.string(),
});
