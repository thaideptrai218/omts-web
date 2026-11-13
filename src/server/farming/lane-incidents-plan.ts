import "server-only";
import { z } from "zod";
import { damageValues, outOfServiceValues, laneIncidentHistory, laneIncidentSaved, repairValues, restoreValues } from "@/features/rafts-api/lane-incident-contracts";
import type { FarmingArea, FarmingPlan } from "./farming-plan";

const querySchema = z.strictObject({ action: z.enum(["lane-history", "lane-damage", "lane-repair", "lane-discontinue", "lane-restore", "lane-photo", "lane-photo-view"]),
  id: z.guid(), zoneId: z.guid(), laneNumber: z.string().regex(/^[1-9]\d{0,2}$/).refine(value => Number(value) <= 200), incidentId: z.guid().optional(), photoIndex: z.string().regex(/^[0-2]$/).optional() });
export function planLaneIncidents(area: FarmingArea, method: string, query: URLSearchParams): FarmingPlan | undefined {
  if (area !== "raft-details" || query.size !== new Set(query.keys()).size) return;
  const parsed = querySchema.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, id, zoneId, laneNumber, incidentId, photoIndex } = parsed.data;
  const root = `/api/rafts/${id}`, lane = `${root}/lanes/${laneNumber}`;
  const base = { action, zoneId, ownerOnly: false };
  if (action === "lane-photo-view" && method === "GET" && incidentId && photoIndex !== undefined)
    return { ...base, method: "GET", path: `${root}/lane-history?laneNumber=${laneNumber}`, schema: laneIncidentHistory, file: "incident-photo", incidentId, photoIndex: Number(photoIndex) };
  if (photoIndex !== undefined) return;
  if (action === "lane-history" && method === "GET" && !incidentId)
    return { ...base, method: "GET", path: `${root}/lane-history?laneNumber=${laneNumber}`, schema: laneIncidentHistory };
  if (method !== "POST") return;
  if (action === "lane-photo" && incidentId) return { ...base, method: "POST", path: `${lane}/incidents/${incidentId}/photos`, upload: "incident-photo", schema: z.object({ done: z.literal(true) }) };
  if (incidentId) return;
  const commands = { "lane-damage": ["report-damage", damageValues], "lane-repair": ["repair", repairValues], "lane-discontinue": ["out-of-service", outOfServiceValues], "lane-restore": ["restore-service", restoreValues] } as const;
  if (!(action in commands)) return;
  const [command, jsonBody] = commands[action as keyof typeof commands];
  if (action === "lane-damage") return { ...base, method: "POST", path: `${lane}/${command}`, upload: "lane-damage", uploadBody: jsonBody, schema: laneIncidentSaved };
  return { ...base, method: "POST", path: `${lane}/${command}`, jsonBody, schema: laneIncidentSaved };
}
