import { z } from "zod";

const percent = z.number().min(0).max(100);
export const laneProgressChange = z.object({
  at: z.string(), byName: z.string().nullish(), reason: z.string().nullish(),
  oldSeededPercent: percent.nullish(), seededPercent: percent.nullish(),
  oldHarvestedPercent: percent.nullish(), harvestedPercent: percent.nullish(),
});
/** Optional read additions keep old backends readable; missing partial progress stays unknown. */
export const laneProgressReadFields = {
  seededPercent: percent.nullish(), harvestedPercent: percent.nullish(), rowVersion: z.string().min(1).optional(),
  lastModifiedByName: z.string().nullish(), lastModifiedAt: z.string().nullish(),
  progressHistory: z.array(laneProgressChange).optional(),
};
export const laneProgressValues = z.strictObject({
  seededPercent: percent.optional(), harvestedPercent: percent.optional(),
  reason: z.string().trim().min(1).max(500), rowVersion: z.string().min(1).max(2000),
}).refine(value => value.seededPercent !== undefined || value.harvestedPercent !== undefined);
export const laneProgressSaved = z.object({ laneNumber: z.number().int().positive(),
  ...laneProgressReadFields, state: z.string().optional(),
}).refine(value => value.seededPercent != null || value.harvestedPercent != null);
export type LaneProgressMetadata = z.infer<typeof laneProgressSaved>;
