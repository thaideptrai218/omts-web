import { z } from "zod";
import { raftSchema } from "@/features/farming-api/contracts";

const id = z.guid(), text = z.string(), note = text.trim().max(500);
export const incidentMaterial = z.object({ itemId: id, itemCode: text.nullish(), itemName: text.nullish(), unit: text, quantity: z.number().positive(), issueId: id.nullish(), issueCode: text.nullish() });
/** LaneIncidentView of the API contract of 12/11/2026; additive fields stay optional, every field we use is validated. */
export const laneIncident = z.object({ id, laneNumber: z.number().int().positive(), kind: text, occurredAt: z.iso.datetime({ offset: true }),
  reasonCode: text.nullish(), reason: text.nullish(), hadSeed: z.boolean().optional(), recordedByName: text.nullish(), resolvesIncidentId: id.nullish(),
  photos: z.array(z.object({ id: id.optional(), url: text.optional(), sortOrder: z.number().int().optional() })).max(3).optional(),
  materials: z.array(incidentMaterial).optional() });
export const laneIncidentHistory = z.object({ incidents: z.array(laneIncident) });
export const laneIncidentSaved = z.object({ incident: laneIncident.optional(), raft: raftSchema.optional(),
  lane: z.object({ laneNumber: z.number().int().positive(), isDamaged: z.boolean().optional(), isOutOfService: z.boolean().optional(), state: text.optional() }).optional(),
  changed: z.boolean().optional(), raftRowVersion: text.nullish(), cycleRowVersion: text.nullish(), everySeededLaneHarvested: z.boolean().nullish(), message: text.optional(), messageCode: text.optional() })
  .refine(value => !!value.incident || !!value.raft || !!value.lane);
const version = { rowVersion: text.min(1) };
export const damageValues = z.strictObject({ ...version, reason: note.min(1) });
export const repairValues = z.strictObject({ ...version, reason: note.min(1),
  materials: z.array(z.strictObject({ itemId: id, quantity: z.number().positive().multipleOf(0.001), unit: text.min(1).optional() })).min(1)
    .refine(values => new Set(values.map(value => value.itemId)).size === values.length).optional() });
/** `confirm` answers the 409 MSG-GEN-04 question when seed hangs on the lane; `cycleRowVersion` is the open cycle's. */
export const outOfServiceValues = z.strictObject({ ...version, reason: note.min(1), confirm: z.boolean().optional(), cycleRowVersion: text.min(1).optional() });
export type LaneIncident = z.infer<typeof laneIncident>;
export type IncidentAction = "damage" | "repair" | "discontinue";
export const incidentActionLabel = { damage: "Báo hỏng", repair: "Sửa làn", discontinue: "Ngừng hoạt động" } as const;
