"use client";
import { useCallback, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { LaneOverview } from "@/features/farming-management/lane-overview";
import { useRemote } from "@/features/operations/ui";
import { harvestList } from "./records-contracts";
import { harvestRepo, useAllowed } from "./records-shared";
import { OperatingLaneOverview } from "@/features/rafts-api/operating-lane-overview";

/** Raft and progress maps show the current harvest state of each lane (read only: a raft's harvest is finished from its Thu hoạch tab); a historical cycle never offers a current-cycle write. */
export function HarvestAwareLaneOverview({ raftId, zoneId, cycleId, allowFinish = true, onChanged, ...overview }: Omit<ComponentProps<typeof LaneOverview>, "selected" | "onSelectionChange" | "selectionAction"> & {
  raftId: string; zoneId: string; cycleId?: string; allowFinish?: boolean; onChanged?(): void;
}) {
  const canRead = useAllowed("harvest", zoneId)("View");
  const remote = useRemote(useCallback((signal: AbortSignal) => canRead
    ? harvestRepo.read("list", { id: raftId, zoneId }, harvestList, signal)
    : Promise.resolve({ status: "error" as const, httpStatus: 403, uncertain: false }), [raftId, zoneId, canRead]));
  const current = remote.data;
  const lanes = !cycleId && current ? overview.lanes.map(lane => {
    const fresh = current.lanes.find(value => value.laneNumber === lane.laneNumber);
    return fresh ? { ...lane, ...fresh, state: fresh.state ?? lane.state } : lane;
  }) : overview.lanes;
  const scope = { raftId, zoneId, cycleId, readOnly: !allowFinish || !!cycleId && current?.cycle?.id !== cycleId, onChanged: () => { remote.reload(); onChanged?.(); } };
  return <>
    <OperatingLaneOverview {...overview} lanes={lanes} loading={overview.loading || remote.loading} scope={scope} />
    {canRead && remote.error && <div className="mt-2 flex flex-wrap items-center gap-2 text-xs" role="alert"><span>{remote.error}</span><Button type="button" className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại tình trạng thu hoạch</Button></div>}
  </>;
}
