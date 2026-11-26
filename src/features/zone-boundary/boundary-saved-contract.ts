import { z } from "zod";
import { farmingZoneViewSchema } from "@/features/farming-zones/api/farming-zone-contract.schemas";
import { projectBoundaryWarnings } from "./boundary-contract";

/** Answer of a boundary save: the zone with its new row version and boundary, and the allow-listed warnings (rafts left outside). */
export const boundarySavedSchema = z.object({ zone: farmingZoneViewSchema, warnings: z.unknown().optional() })
  .transform(saved => ({ zone: saved.zone, warnings: projectBoundaryWarnings(saved) }));
export type BoundarySaved = z.output<typeof boundarySavedSchema>;
