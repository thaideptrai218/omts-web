import type { ApiRecord, WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";

const IN_USE_ZONE = "101", DISCONTINUED_ZONE = 102;

/**
 * Zones that can take new work: In Use only. Discontinued zones are listed on the Vùng nuôi screen alone, so every other zone choice
 * asks the server for In Use zones and also drops any discontinued row that still comes back.
 */
export async function loadInUseZones(signal: AbortSignal): Promise<WorkspaceResult<ApiRecord[]>> {
  const result = await loadOptions("zones", signal, { statusId: IN_USE_ZONE });
  return result.status === "success" ? { status: "success", data: result.data.filter(zone => zone.statusId !== DISCONTINUED_ZONE && zone.status !== "Discontinued") } : result;
}
