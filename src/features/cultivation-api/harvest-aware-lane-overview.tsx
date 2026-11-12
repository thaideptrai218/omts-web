"use client";
import { useCallback, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { LaneOverview } from "@/features/farming-management/lane-overview";
import { useRemote } from "@/features/operations/ui";
import { FinishHarvestOverview } from "./finish-harvest-overview";
import { harvestList } from "./records-contracts";
import { harvestRepo, useAllowed } from "./records-shared";
import { eligibleToFinish } from "./finish-harvest-model";

/** Raft and progress maps use current backend eligibility; a historical cycle never offers a current-cycle write. */
export function HarvestAwareLaneOverview({ raftId, zoneId, cycleId, rowVersion, allowFinish = true, onChanged, ...overview }: ComponentProps<typeof LaneOverview> & {
  raftId: string; zoneId: string; cycleId?: string; rowVersion?: string; allowFinish?: boolean; onChanged?(): void;
}) {
  const allowed = useAllowed("harvest", zoneId), canRead = allowed("View"), canCreate = allowed("Create");
  const remote = useRemote(useCallback((signal: AbortSignal) => canRead
    ? harvestRepo.read("list", { id: raftId, zoneId }, harvestList, signal)
    : Promise.resolve({ status: "error" as const, httpStatus: 403, uncertain: false }), [raftId, zoneId, canRead]));
  const current = remote.data;
  const canFinish = allowFinish && !!current?.canRecordHarvest && canCreate && (!cycleId || current.cycle?.id === cycleId);
  const lanes = !cycleId && current ? overview.lanes.map(lane => {
    const fresh = current.lanes.find(value => value.laneNumber === lane.laneNumber);
    return fresh ? { ...lane, ...fresh, state: fresh.state ?? lane.state } : lane;
  }) : overview.lanes;
  return <>
    {canFinish ? <FinishHarvestOverview {...overview} lanes={lanes} raftId={raftId} zoneId={zoneId} rowVersion={rowVersion}
      eligibleLaneNumbers={current.lanes.filter(eligibleToFinish).map(lane => lane.laneNumber)} onChanged={() => { remote.reload(); onChanged?.(); }} />
      : <LaneOverview {...overview} lanes={lanes} />}
    {canRead && remote.error && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" role="alert"><span>{remote.error}</span><Button type="button" className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại tình trạng thu hoạch</Button></div>}
  </>;
}
