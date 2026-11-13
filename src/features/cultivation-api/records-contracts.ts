import { z } from "zod";
import { stepPhotosSchema } from "@/components/form/photo-contracts";
import { lanePercentValues, lanePercentRead } from "./record-lane-percents";
import { seedLot } from "./seeding-contracts";
import { cycleSummary } from "./contracts";
import { crewIds, crewReadFields } from "./harvest-crew-contracts";
import { laneProgressReadFields } from "@/features/farming-management/lane-progress-contracts";
const numbers = z.array(z.number().int().positive());
const incidentLaneFields = { ...laneProgressReadFields, isDamaged: z.boolean().optional(), isOutOfService: z.boolean().optional(), statusId: z.number().int().optional(), lineLengthM: z.number().positive().nullish() };
export { seedLots, seedingRecord, seedingList, seedValues, seedCorrection, seedingPreview } from "./seeding-contracts";
export const materialRecord = z.object({ id: z.guid(), raftId: z.guid(), raftCode: z.string(), cycleId: z.guid().nullable(), usageDate: z.iso.date(), repairReason: z.string(), itemId: z.guid(), itemCode: z.string(), itemName: z.string(), unit: z.string(), quantity: z.number(), recordedByName: z.string().nullable(), recordedAt: z.string(), canEdit: z.boolean(), rowVersion: z.string(), issueId: z.guid().nullish(), issueCode: z.string().nullish() });
export const materialList = z.object({ raftId: z.guid(), raftCode: z.string(), canRecord: z.boolean(), groups: z.array(z.object({ cycle: cycleSummary.nullable(), locked: z.boolean(), repairs: z.array(z.object({ usageDate: z.iso.date(), repairReason: z.string(), records: z.array(materialRecord) })) })) });
export const materialValues = z.strictObject({ usageDate: z.iso.date(), repairReason: z.string().trim().min(1), items: z.array(z.strictObject({ itemId: z.guid(), quantity: z.number().positive() })).min(1) });
export const harvestLot = z.object({ photos: stepPhotosSchema, lanePercents: lanePercentRead, ...crewReadFields, id: z.guid(), lotCode: z.string(), harvestedAt: z.string(), harvestDate: z.iso.date(), laneNumbers: numbers, finishedLaneNumbers: numbers, cageCount: z.number(), kgPerCage: z.number(), estimatedKg: z.number(), invoicedKg: z.number(), remainingKg: z.number(), statusId: z.number(), status: z.string(), rowVersion: z.string(), canCorrect: z.boolean().optional(), overPlanReason: z.string().nullish() });
/** Lane facts the harvest screen returns since 11/11/2026; every extra field is optional so older answers still parse. */
export const harvestLane = z.object({ ...incidentLaneFields, laneNumber: z.number().int(), canHarvest: z.boolean(), state: z.enum(["NotSeeded", "Growing", "BeingHarvested", "Harvested", "OutOfService"]).nullish(), reasonCode: z.string().nullish(), canFinish: z.boolean().nullish(), lotCount: z.number().nullish(), harvestedCages: z.number().nullish(), reason: z.string().nullish(), lastHarvestDate: z.string().nullish(), seedLotCodes: z.array(z.string()).nullish() });
/**
 * A purchase request a new trip can be recorded for (decision of 11/11/2026): Accepted, harvest not marked done; the one planned on this raft comes first.
 * `matchesCycleProduct` (backend, product rule of 13/11/2026): the request orders the product the cycle farms; missing (older backend) is read as a match.
 */
export const harvestOrder = z.object({ id: z.guid(), code: z.string(), customerName: z.string(), productName: z.string(), productId: z.string().nullish(), matchesCycleProduct: z.boolean().nullish(), acceptedCages: z.number(), harvestedCages: z.number(), pickupDate: z.iso.date(), workDate: z.iso.date().nullish(), plannedOnRaft: z.boolean() });
/** `cycleProductId` / `cycleProductName` (backend 13/11/2026, screen level): the oyster the raft's open cycle farms; null for a legacy cycle or no open cycle. */
export const harvestList = z.object({ raftId: z.guid(), raftCode: z.string(), cycle: cycleSummary.nullable(), cycleProductId: z.string().nullish(), cycleProductName: z.string().nullish(), averageKgPerCage: z.number(), canRecordHarvest: z.boolean(), lanes: z.array(harvestLane), harvestedCages: z.number().nullish(), harvestedKg: z.number().nullish(), targetYieldKg: z.number().nullish(), remainingKg: z.number().nullish(), targetPercent: z.number().nullish(), overTarget: z.boolean().nullish(), orders: z.array(harvestOrder).default([]), lots: z.array(harvestLot) });
export const harvestSettings = z.object({ averageKgPerCage: z.number(), daysBeforeAutoClose: z.number().int(), rowVersion: z.string() });
export const harvestSettingsValues = z.strictObject({ averageKgPerCage: z.number().positive().max(9999999.99).multipleOf(0.01), daysBeforeAutoClose: z.number().int().min(1).max(365), rowVersion: z.string().min(1) });
export const harvestClosePreview = z.object({ days: z.number().int(), lotCount: z.number().int(), lowered: z.boolean() });
export const harvestDetail = z.object({ ...crewReadFields, id: z.guid(), lotCode: z.string(), cycleId: z.guid(), raftId: z.guid(), raftCode: z.string(), zoneId: z.guid(), zoneCode: z.string(), harvestedAt: z.string(), harvestDate: z.iso.date(), laneNumbers: numbers, finishedLaneNumbers: numbers, cageCount: z.number(), kgPerCage: z.number(), estimatedKg: z.number(), figures: z.object({ invoicedKg: z.number(), returnedKg: z.number(), soldKg: z.number(), remainingKg: z.number(), lostKg: z.number(), differenceKg: z.number(), notFinal: z.boolean() }), closeDate: z.iso.date().nullable(), leftoverKg: z.number().nullable(), lanePercents: lanePercentRead, photos: stepPhotosSchema, recordedByName: z.string().nullable(), canCorrect: z.boolean().default(false), canRemove: z.boolean().default(false), rowVersion: z.string(), overPlanReason: z.string().nullish() });
const twoDecimals = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
/**
 * Harvest fields shared by a new trip and a correction. cageCount is decimal (0.5 = half a cage, at most 2 decimals); estimatedKg is an ESTIMATE (null: the backend computes cages x kgPerCage).
 * The cycle target is a plan, not a cap (owner decision 12/11/2026): nothing here compares a harvest with it.
 */
const harvestBase = z.strictObject({ lanePercents: lanePercentValues.optional(), crew: crewIds.optional(), laneNumbers: numbers.min(1), finishedLaneNumbers: numbers,
  cageCount: z.number().positive().max(100_000).refine(twoDecimals), estimatedKg: z.number().positive().max(1_000_000_000).refine(twoDecimals).nullable() })
  .refine(v => new Set(v.laneNumbers).size === v.laneNumbers.length && new Set(v.finishedLaneNumbers).size === v.finishedLaneNumbers.length && v.finishedLaneNumbers.every(n => v.laneNumbers.includes(n)));
/** A new trip also names the purchase request it harvests for; the backend refuses a trip without it (400 MSG-GEN-01, field "Purchase request"). */
export const harvestValues = harvestBase.safeExtend({ purchaseRequestId: z.guid() });
/** Non-blocking notice saved with the lot (e.g. ESTIMATED_KG_FAR_FROM_CAGES); the web words it by code. */
export const harvestWarning = z.object({ code: z.string().max(60), message: z.string().max(400).nullish(), details: z.record(z.string(), z.unknown()).nullish() });
export const harvestSaved = z.object({ lot: z.object({ id: z.guid(), lotCode: z.string() }), everySeededLaneHarvested: z.boolean().nullish(), cycleRowVersion: z.string().nullish(), warnings: z.array(harvestWarning).default([]) });
export const harvestCorrected = z.object({ lot: harvestDetail, everySeededLaneHarvested: z.boolean().nullish(), cycleRowVersion: z.string().nullish(), warnings: z.array(harvestWarning).default([]) });
/** POST /api/rafts/{raftId}/lanes/{n}/finish-harvest (no body): changed=false when the lane was already Harvested. */
export const finishLaneResult = z.object({ laneNumber: z.number().int(), state: z.string(), changed: z.boolean(), lotCode: z.string().nullish(), everySeededLaneHarvested: z.boolean().nullish(), cycleRowVersion: z.string().nullish(), message: z.string().nullish() });
export const harvestCorrection = harvestBase.safeExtend({ replaceCrew: z.boolean().optional(), keepPhotoKeys: z.array(z.string().min(1)).max(3), reason: z.string().trim().min(1), rowVersion: z.string().min(1) });
export const laneState = z.union([z.enum(["NotSeeded", "Growing", "BeingHarvested", "Harvested", "OutOfService"]), z.number().int().min(0).max(4)]);
export const raftProgress = z.object({ raftId: z.guid(), raftCode: z.string(), date: z.iso.date(), cycle: z.object({ id: z.guid(), startDate: z.iso.date() }).nullable(), lanes: z.array(z.object({ ...incidentLaneFields, id: z.guid(), laneNumber: z.number().int(), statusId: z.number(), state: laneState })), notSeededLanes: numbers });
export const laneProgress = z.object({ raftId: z.guid(), raftCode: z.string(), laneId: z.guid(), laneNumber: z.number().int(), state: laneState, cycle: cycleSummary.nullable(), sessions: z.array(z.object({ id: z.guid(), seedingDate: z.iso.date(), seedLot, quantity: z.number() })) });
