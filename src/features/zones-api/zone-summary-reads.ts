import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { zoneRaftRows, type ZoneRaft } from "./zone-summary-model";

const invalid = { status: "error", httpStatus: 502, uncertain: false } as const;

/** Rafts of one zone (code, size, lanes, status, coordinates) through the raft list. */
export async function readZoneRafts(zoneId: string, signal: AbortSignal): Promise<WorkspaceResult<ZoneRaft[]>> {
  const result = await loadOptions("rafts", signal, { zoneId });
  if (result.status !== "success") return result;
  const parsed = zoneRaftRows.safeParse(result.data);
  return parsed.success ? { status: "success", data: parsed.data } : invalid;
}

/** Keeps one loader shape while skipping the read for a section the account may not see. */
export const skipped = <Value,>(empty: Value): Promise<WorkspaceResult<Value>> => Promise.resolve({ status: "success", data: empty });
