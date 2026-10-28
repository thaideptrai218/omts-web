import { z } from "zod";
import { apiIdSchema, apiTextSchema } from "@/features/auth/api/auth-contract.schemas";

// Wire snapshot: omts-backend develop@953f597, FarmingZoneDtos.cs.
// A list row is not a detail: only detail carries coordinates, measurement
// point, and rowVersion. Keep that distinction before binding the UI.
const zoneBaseSchema = z.object({
  id: apiIdSchema,
  code: apiTextSchema,
  name: apiTextSchema,
  location: z.string().nullable(),
  area: z.number().nonnegative().nullable(),
  statusId: z.union([z.literal(101), z.literal(102)]),
  status: apiTextSchema,
  inUseRaftCount: z.number().int().nonnegative(),
  licenseState: z.enum(["Valid", "ExpiringSoon", "Expired", "NotYetEffective", "Superseded", "Missing"]).nullable(),
});

export const farmingZoneListItemSchema = zoneBaseSchema;

export const farmingZonePageSchema = z.object({
  items: z.array(farmingZoneListItemSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  total: z.number().int().nonnegative(),
});

export const farmingZoneViewSchema = zoneBaseSchema.extend({
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  waterMeasurementPoint: z.string().nullable(),
  rowVersion: apiTextSchema,
});

export type FarmingZoneListItemDto = z.infer<typeof farmingZoneListItemSchema>;
export type FarmingZoneViewDto = z.infer<typeof farmingZoneViewSchema>;
