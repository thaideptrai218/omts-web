import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { zoneMapSchema, type MapZone } from "./zone-map-contract";
export async function readZoneMap(includeDiscontinued: boolean, signal: AbortSignal): Promise<WorkspaceResult<MapZone[]>> {
  try {
    const response = await fetch(`/api/zone-map?includeDiscontinued=${includeDiscontinued}`, { cache: "no-store", credentials: "same-origin", redirect: "error", signal, headers: { Accept: "application/json" } });
    const value = await response.json();
    const parsed = response.ok && value.status === "success" ? zoneMapSchema.safeParse(value.data) : undefined;
    return parsed?.success ? { status: "success", data: parsed.data }
      : { status: "error", httpStatus: response.ok ? 502 : response.status, code: value.code, uncertain: false };
  } catch { return { status: "error", httpStatus: 0, uncertain: false }; }
}
