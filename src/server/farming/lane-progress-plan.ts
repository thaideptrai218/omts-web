import "server-only";
import { z } from "zod";
import { laneProgressSaved, laneProgressValues } from "@/features/farming-management/lane-progress-contracts";
import type { FarmingArea, FarmingPlan } from "./farming-plan";

const querySchema = z.strictObject({ action: z.literal("lane-progress"), id: z.guid(), zoneId: z.guid(),
  laneNumber: z.string().regex(/^[1-9]\d{0,2}$/).refine(value => Number(value) <= 200) });
export function planLaneProgress(area: FarmingArea, method: string, query: URLSearchParams): FarmingPlan | undefined {
  if (area !== "raft-details" || method !== "PUT" || query.size !== new Set(query.keys()).size) return;
  const parsed = querySchema.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { id, zoneId, laneNumber } = parsed.data;
  return { action: "lane-progress", method: "PUT", path: `/api/rafts/${id}/lanes/${laneNumber}/progress`,
    ownerOnly: false, zoneId, jsonBody: laneProgressValues,
    schema: laneProgressSaved.refine(value => value.laneNumber === Number(laneNumber)) };
}
