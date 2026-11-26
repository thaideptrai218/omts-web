import "server-only";
import { z } from "zod";
import { saveBoundaryRequestSchema, scanStartedSchema, scanStatusSchema } from "@/features/zone-boundary/boundary-contract";
import { boundarySavedSchema } from "@/features/zone-boundary/boundary-saved-contract";
import type { FarmingPlan } from "./farming-plan";

const querySchema = z.strictObject({ action: z.enum(["boundary", "boundary-scan", "boundary-scan-status"]), id: z.guid().optional(), scanId: z.guid().optional() });
/**
 * The licence-map boundary of a zone, Owner only like the backend. The browser POSTs every write (the route has no PUT) and the BFF sends the backend verb:
 * `boundary` (id) saves or clears (`PUT /api/zones/{id}/boundary`), `boundary-scan` (multipart photo, id optional: no id is the zone-less scan of the create form)
 * starts a read, `boundary-scan-status` (scanId, same id as the start) polls it.
 */
export function planZoneBoundary(method: string, query: URLSearchParams): FarmingPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = querySchema.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, id, scanId } = parsed.data;
  const base = { action, ownerOnly: true, problem: true } as const;
  const scans = id ? `/api/zones/${id}/boundary-scans` : "/api/zones/boundary-scans";
  if (action === "boundary" && method === "POST" && id && !scanId)
    return { ...base, method: "PUT", path: `/api/zones/${id}/boundary`, jsonBody: saveBoundaryRequestSchema, jsonMaxBytes: 65_536, schema: boundarySavedSchema };
  if (action === "boundary-scan" && method === "POST" && !scanId) return { ...base, method: "POST", path: scans, upload: "scan-photo", schema: scanStartedSchema };
  if (action === "boundary-scan-status" && method === "GET" && scanId) return { ...base, method: "GET", path: `${scans}/${scanId}`, schema: scanStatusSchema };
}
