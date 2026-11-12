import type { WorkspaceResult } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "@/features/operations/repository";
import { finishHarvestResult, finishHarvestValues, matchesFinishedSelection } from "./finish-harvest-contracts";
import { finishLaneResult } from "./records-contracts";

type Failure = Extract<WorkspaceResult<never>, { status: "error" }>;
export type FinishHarvestOutcome = { finished: number[]; alreadyFinished: number[]; remaining: number[]; failure?: Failure };
const repository = createOperationsRepository("harvest");

/** Only a definite 404 enables the older, sequential per-lane contract. Never replay an uncertain write. */
export async function finishHarvestLanes(raftId: string, zoneId: string, laneNumbers: number[], rowVersion?: string): Promise<WorkspaceResult<FinishHarvestOutcome>> {
  const values = finishHarvestValues.safeParse({ laneNumbers, ...(rowVersion ? { rowVersion } : {}) });
  if (!values.success) return { status: "error", httpStatus: 400, uncertain: false };
  const bulk = await repository.write("finish-harvest", values.data, finishHarvestResult, raftId, zoneId);
  if (bulk.status === "success") return matchesFinishedSelection(laneNumbers, bulk.data)
    ? { status: "success", data: { ...bulk.data, remaining: [] } }
    : { status: "error", httpStatus: 502, uncertain: true };
  if (bulk.httpStatus !== 404 || bulk.uncertain) return bulk;
  const finished: number[] = [], alreadyFinished: number[] = [];
  for (const [index, laneNumber] of laneNumbers.entries()) {
    const single = await repository.write("finish-lane", { laneNumber }, finishLaneResult, raftId, zoneId);
    if (single.status === "error" || single.data.laneNumber !== laneNumber || single.data.state !== "Harvested") {
      const failure: Failure = single.status === "error" ? single : { status: "error", httpStatus: 502, uncertain: true };
      return { status: "success", data: { finished, alreadyFinished, remaining: laneNumbers.slice(index), failure } };
    }
    (single.data.changed ? finished : alreadyFinished).push(laneNumber);
  }
  return { status: "success", data: { finished, alreadyFinished, remaining: [] } };
}
