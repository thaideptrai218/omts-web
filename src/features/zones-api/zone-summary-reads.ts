import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { loadOptions } from "@/features/operations/lookups";
import { waterHistorySchema, zoneThresholdsSchema } from "@/features/operations/contracts";
import { createOperationsRepository } from "@/features/operations/repository";
import { zoneRaftRows, type ZoneRaft } from "./zone-summary-model";

const invalid = { status: "error", httpStatus: 502, uncertain: false } as const;
const water = createOperationsRepository("water");

/** Rafts of one zone (code, size, lanes, status, coordinates) through the raft list. */
export async function readZoneRafts(zoneId: string, signal: AbortSignal): Promise<WorkspaceResult<ZoneRaft[]>> {
  const result = await loadOptions("rafts", signal, { zoneId });
  if (result.status !== "success") return result;
  const parsed = zoneRaftRows.safeParse(result.data);
  return parsed.success ? { status: "success", data: parsed.data } : invalid;
}

/** Thresholds in force plus the five newest measurements, read together because both feed the same view. */
export async function readZoneWater(zoneId: string, signal: AbortSignal) {
  const [thresholds, history] = await Promise.all([
    water.read("thresholds", { zoneId }, zoneThresholdsSchema, signal),
    water.read("list", { zoneId, page: "1", pageSize: "5" }, waterHistorySchema, signal),
  ]);
  if (thresholds.status !== "success") return thresholds;
  if (history.status !== "success") return history;
  return { status: "success", data: { thresholds: thresholds.data.thresholds, latest: history.data.items } } as const;
}

/** Keeps one loader shape while skipping the read for a section the account may not see. */
export const skipped = <Value,>(empty: Value): Promise<WorkspaceResult<Value>> => Promise.resolve({ status: "success", data: empty });
