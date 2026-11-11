import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { employeePageSchema } from "@/features/employee-api/contracts";
import { harvestYieldReport } from "@/features/harvest-yield/contracts";
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

/** Harvest totals of one zone for the report's default window (the current month). */
export async function readZoneYield(zoneId: string, signal: AbortSignal) {
  const result = await createOperationsRepository("harvest-yield").read("list", { zoneIds: zoneId, groupBy: "zone" }, harvestYieldReport, signal);
  return result.status === "success" ? { status: "success", data: { ...result.data.totals, from: result.data.from, to: result.data.to } } as const : result;
}

/** Number of employees currently working in the zone (page size 1: only the total is used). */
export async function readZoneStaffCount(zoneId: string, signal: AbortSignal) {
  const result = await createOperationsRepository("employees").read("list", { zoneId, statusId: "401", page: "1", pageSize: "1" }, employeePageSchema, signal);
  return result.status === "success" ? { status: "success", data: result.data.total } as const : result;
}

/** Keeps one loader shape while skipping the read for a section the account may not see. */
export const skipped = <Value,>(empty: Value): Promise<WorkspaceResult<Value>> => Promise.resolve({ status: "success", data: empty });
