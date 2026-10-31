import "server-only";
import { z } from "zod";
import { conditionSchema, licenseOverviewSchema, licenseSchema, raftSchema } from "@/features/farming-api/contracts";
export type FarmingArea = "zone-licenses" | "raft-details";
const querySchema = z.strictObject({ action: z.enum(["list", "detail", "file", "create", "update", "replace", "photo", "upload-photo", "condition"]),
  id: z.guid().optional(), zoneId: z.guid().optional(), asOf: z.iso.date().optional(), date: z.iso.date().optional(), cycleId: z.guid().optional() });
export type FarmingPlan = { action: string; path: string; method: "GET" | "POST" | "PUT"; schema: z.ZodType; file?: string; upload?: "license" | "photo"; ownerOnly: boolean };
export function planFarming(area: FarmingArea, method: string, query: URLSearchParams): FarmingPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = querySchema.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, id, zoneId, asOf, date, cycleId } = parsed.data;
  const make = (path: string, schema: z.ZodType, verb: FarmingPlan["method"] = "GET"): FarmingPlan => ({ action, path, schema, method: verb, ownerOnly: area === "zone-licenses" || verb !== "GET" });
  if (area === "zone-licenses" && !date && !cycleId) {
    const suffix = asOf ? `?asOf=${asOf}` : "";
    if (method === "GET" && action === "list" && zoneId && !id) return make(`/api/zones/${zoneId}/licenses${suffix}`, licenseOverviewSchema);
    if (method === "GET" && ["detail", "file"].includes(action) && id && !zoneId) return { ...make(`/api/zone-licenses/${id}${suffix}`, licenseSchema), ...(action === "file" ? { file: "fileUrl" } : {}) };
    if (method === "POST" && !asOf && !zoneId && ["create", "update", "replace"].includes(action) && (action === "create" ? !id : !!id))
      return { ...make(`/api/zone-licenses${id ? `/${id}` : ""}${action === "replace" ? "/replace" : ""}`, licenseSchema, action === "update" ? "PUT" : "POST"), upload: "license" };
  }
  if (area === "raft-details" && id && !zoneId && !asOf) {
    if (method === "GET" && action === "condition") return make(`/api/rafts/${id}/condition?${new URLSearchParams({ ...(date ? { date } : {}), ...(cycleId ? { cycleId } : {}) })}`, conditionSchema);
    if (!date && !cycleId) {
      if (method === "GET" && ["detail", "photo"].includes(action)) return { ...make(`/api/rafts/${id}`, raftSchema), ...(action === "photo" ? { file: "photoUrl" } : {}) };
      if (method === "POST" && action === "upload-photo") return { ...make(`/api/rafts/${id}/photo`, raftSchema, "POST"), upload: "photo" };
    }
  }
}
