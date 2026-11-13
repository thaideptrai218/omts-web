import { z } from "zod";
import { laneProgressReadFields } from "@/features/farming-management/lane-progress-contracts";
import { stepPhotosSchema } from "@/components/form/photo-contracts";
import { cycleProductFields } from "./cycle-product-fields";
export const cycleSummary = z.object({ id: z.guid(), startDate: z.string(), closeDate: z.string().nullable(), statusId: z.number(), status: z.string(), rowVersion: z.string(), nurseryBatchId: z.string().nullish(), nurseryCode: z.string().nullish(), ...cycleProductFields });
export const zoneCycles = z.array(z.object({ raftId: z.guid(), raftCode: z.string(), raftStatusId: z.number(), raftStatus: z.string(), laneCount: z.number(), cycle: cycleSummary.nullable(), lastCloseDate: z.string().nullable(), canStart: z.boolean(), canEdit: z.boolean(), canCancel: z.boolean() }));
export const cycleHistory = z.array(cycleSummary);
/**
 * GET /api/nursery-batches/available (backend contract 0.6): finished batches with pieces left. Tolerant: a bare array or `items` / `batches`,
 * the seed name as `itemName`, `seedName` or `seedLot.itemName`, and `remaining` or `survivors - seeded`. The BFF relays this shape, the browser normalises it.
 */
const rawNurseryBatch = z.object({ id: z.string().min(1), code: z.string().min(1), itemName: z.string().nullish(), seedName: z.string().nullish(), seedLot: z.object({ itemName: z.string().nullish() }).nullish(),
  remaining: z.number().nullish(), survivors: z.number().nullish(), seeded: z.number().nullish() });
export const rawNurseryBatchList = z.union([z.array(rawNurseryBatch), z.object({ items: z.array(rawNurseryBatch) }), z.object({ batches: z.array(rawNurseryBatch) })]);
/**
 * GET /api/products relayed by the cycles BFF (the cycle screens may not hold the sales catalogue permission): the catalogue products, tolerant of the
 * shape (bare array or `items`) and of the "in use" flag (`inUse` or `statusId` 101); the browser keeps the in-use ones.
 */
const rawProduct = z.object({ id: z.string().min(1), name: z.string().min(1), statusId: z.number().nullish(), inUse: z.boolean().nullish() });
export const rawProductList = z.union([z.array(rawProduct), z.object({ items: z.array(rawProduct) })]);
/** Manual start of a cycle (NURSERY MODEL V2, section 3): one finished nursery batch, the planned total yield (kg) and the start date; the photos travel beside it. */
export const cycleStartInput = z.strictObject({ nurseryBatchId: z.guid(), startDate: z.iso.date(), targetYieldKg: z.number().positive(), note: z.string().max(1000).optional(),
  // The farmed product is required by the backend; the form always sends it, the relay stays tolerant until the backend contract is final.
  productId: z.guid().optional() });
/** Edit of an open cycle: yield, start date and note always; the nursery batch only while no lane was seeded (409 CYCLE_SEED_LOCKED otherwise). */
export const cycleEditInput = z.strictObject({ startDate: z.iso.date().nullable().optional(), targetYieldKg: z.number().positive().nullable().optional(), note: z.string().max(1000).optional(), nurseryBatchId: z.guid().optional(), productId: z.guid().optional() });
export const cycleView = cycleSummary.extend({ raftId: z.guid(), raftCode: z.string(), expectedSeedQuantity: z.number().nullable().default(null), targetYieldKg: z.number().nullable(), seedingCompletedOn: z.string().nullable(), assessment: z.string().nullable(), closedEarly: z.boolean(), daysOfFarming: z.number(), canEdit: z.boolean(), canCancel: z.boolean(),
  note: z.string().nullish(), planPhotos: stepPhotosSchema.optional(), planPhotosFromNursery: z.boolean().nullish(),
  // The nursed batch (V2): `nurseryRemaining` is the pool left for every raft, `nurserySeeded` what this cycle took; `seedLot` names the seed of the batch.
  seedLot: z.object({ code: z.string().nullish(), itemName: z.string().nullish() }).nullish(), canChangeNursery: z.boolean().nullish(), canChangeProduct: z.boolean().nullish(),
  nurserySeeded: z.number().nullish(), nurseryRemaining: z.number().nullish() });
export const cycleProgress = z.object({ raftId: z.guid(), raftCode: z.string(), date: z.string(), cycle: cycleView.nullable(), lanes: z.array(z.object({ ...laneProgressReadFields, id: z.guid(), laneNumber: z.number(), statusId: z.number(), status: z.string(), state: z.string(), isDamaged: z.boolean().optional(), isOutOfService: z.boolean().optional() })), notSeededLanes: z.array(z.number()) });
