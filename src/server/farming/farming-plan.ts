import "server-only";
import { z } from "zod";
import { licenseOverviewSchema, licenseSchema, raftSavedSchema, raftSchema } from "@/features/farming-api/contracts";
export type FarmingArea = "zone-licenses" | "raft-details";
const querySchema = z.strictObject({ action: z.enum(["list", "detail", "file", "create", "update", "replace", "photo", "upload-photo"]),
  id: z.guid().optional(), zoneId: z.guid().optional(), asOf: z.iso.date().optional(), photoId: z.guid().optional() });
export type FarmingPlan = { action: string; path: string; method: "GET" | "POST" | "PUT"; schema: z.ZodType; file?: string; photoId?: string; unwrap?: "raft"; upload?: "license" | "photo"; ownerOnly: boolean };
export function planFarming(area: FarmingArea, method: string, query: URLSearchParams): FarmingPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = querySchema.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, id, zoneId, asOf, photoId } = parsed.data;
  const make = (path: string, schema: z.ZodType, verb: FarmingPlan["method"] = "GET"): FarmingPlan => ({ action, path, schema, method: verb, ownerOnly: area === "zone-licenses" || verb !== "GET" });
  if (area === "zone-licenses" && !photoId) {
    const suffix = asOf ? `?asOf=${asOf}` : "";
    if (method === "GET" && action === "list" && zoneId && !id) return make(`/api/zones/${zoneId}/licenses${suffix}`, licenseOverviewSchema);
    if (method === "GET" && ["detail", "file"].includes(action) && id && !zoneId) return { ...make(`/api/zone-licenses/${id}${suffix}`, licenseSchema), ...(action === "file" ? { file: "fileUrl" } : {}) };
    if (method === "POST" && !asOf && !zoneId && ["create", "update", "replace"].includes(action) && (action === "create" ? !id : !!id))
      return { ...make(`/api/zone-licenses${id ? `/${id}` : ""}${action === "replace" ? "/replace" : ""}`, licenseSchema, action === "update" ? "PUT" : "POST"), upload: "license" };
  }
  if (area === "raft-details" && id && !zoneId && !asOf) {
    if (method === "GET" && action === "detail" && !photoId) return make(`/api/rafts/${id}`, raftSchema);
    // The backend serves up to three photos per raft; a photo is fetched by its own id.
    if (method === "GET" && action === "photo" && photoId) return { ...make(`/api/rafts/${id}`, raftSchema), file: "photos", photoId };
    if (method === "POST" && action === "upload-photo" && !photoId) return { ...make(`/api/rafts/${id}/photos`, raftSavedSchema, "POST"), upload: "photo", unwrap: "raft" };
  }
}
