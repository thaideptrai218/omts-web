import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "@/features/operations/repository";
import { finishHarvestResult, finishHarvestValues, matchesFinishedSelection } from "./finish-harvest-contracts";

const repository = createOperationsRepository("harvest");

/** One all-or-nothing call for the lanes of a raft. A malformed or incomplete 200 is an uncertain result: the screen reloads before another write. */
export async function finishHarvestLanes(raftId: string, zoneId: string, laneNumbers: number[], rowVersion?: string, override?: { ownerApproved: true; approvalReason: string }): Promise<WorkspaceResult<{ finished: number[]; alreadyFinished: number[] }>> {
  const values = finishHarvestValues.safeParse({ laneNumbers, ...(rowVersion ? { rowVersion } : {}), ...override });
  if (!values.success) return { status: "error", httpStatus: 400, uncertain: false };
  const result = await repository.write("finish-harvest", values.data, finishHarvestResult, raftId, zoneId);
  if (result.status === "error") return result;
  return matchesFinishedSelection(laneNumbers, result.data) ? result : { status: "error", httpStatus: 502, uncertain: true };
}
