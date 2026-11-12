"use client";
import { useCallback, useRef, useState } from "react";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { laneProgressDisplay } from "@/features/farming-management/lane-progress-display";
import { LaneProgressEditor } from "@/features/farming-management/lane-progress-editor";
import type { LaneProgressMetadata } from "@/features/farming-management/lane-progress-contracts";
import type { LaneOverviewItem } from "@/features/farming-management/lane-overview";
import { readRaftDetail } from "./raft-model";
import { laneIncidentRepository } from "./lane-incident-repository";
import { LaneIncidentDetails, type IncidentRaft, type LaneDraftState } from "./lane-incident-details";

export type LaneOperatingScope = { raftId: string; zoneId: string; cycleId?: string; cycleRowVersion?: string; readOnly?: boolean; onChanged(): void };
/** Fetch physical/cycle facts only for the opened lane. Historical cycles never expose current-cycle mutations. */
export function LaneOperatingDetails({ lane, scope, raft: suppliedRaft, onStateChange, onProgressSaved, progressUnsupported, onProgressUnsupported }: {
  lane: LaneOverviewItem; scope: LaneOperatingScope; raft?: IncidentRaft; onStateChange?(state: LaneDraftState): void; onProgressSaved?(saved: LaneProgressMetadata): void;
  progressUnsupported?: boolean; onProgressUnsupported?(): void;
}) {
  const { identity, permissions } = useApiWorkspace();
  const states = useRef({ progress: { dirty: false, pending: false }, incident: { dirty: false, pending: false } });
  const [locks, setLocks] = useState({ progress: false, incident: false });
  const report = useCallback((part: "progress" | "incident", state: LaneDraftState) => {
    states.current[part] = state;
    setLocks(current => ({ ...current, [part]: state.dirty || state.pending }));
    onStateChange?.({ dirty: states.current.progress.dirty || states.current.incident.dirty, pending: states.current.progress.pending || states.current.incident.pending });
  }, [onStateChange]);
  const progressState = useCallback((state: LaneDraftState) => report("progress", state), [report]);
  const incidentState = useCallback((state: LaneDraftState) => report("incident", state), [report]);
  const loadRaft = !suppliedRaft;
  const raft = useRemote(useCallback((signal: AbortSignal) => loadRaft
    ? readRaftDetail(scope.raftId, signal) : Promise.resolve({ status: "success" as const, data: null }), [loadRaft, scope.raftId]));
  const canReadHarvest = operationAllowed("harvest", identity, permissions.functionPermissions, "View", scope.zoneId);
  const facts = useRemote(useCallback((signal: AbortSignal) => canReadHarvest
    ? laneIncidentRepository.cycle(scope.raftId, scope.zoneId, signal) : Promise.resolve({ status: "success" as const, data: null }), [scope.raftId, scope.zoneId, canReadHarvest]));
  const historical = scope.readOnly || !!scope.cycleId && (canReadHarvest ? facts.data?.cycle?.id !== scope.cycleId : !scope.cycleRowVersion);
  const current = !historical ? facts.data?.lanes.find(item => item.laneNumber === lane.laneNumber) : undefined;
  const physical = suppliedRaft ? lane : raft.data?.lanes.find(item => item.laneNumber === lane.laneNumber);
  const merged = { ...lane, ...(!historical ? physical : {}), ...current };
  const display = laneProgressDisplay(merged);
  const context = suppliedRaft ?? (raft.data && { id: scope.raftId, code: raft.data.code, zoneId: scope.zoneId, rowVersion: raft.data.rowVersion, statusId: raft.data.statusId });
  const version = merged.rowVersion ?? facts.data?.cycle?.rowVersion ?? scope.cycleRowVersion;
  const canEdit = !progressUnsupported && !historical && !facts.loading && (!!facts.data?.cycle || !!scope.cycleRowVersion) && context?.statusId === 101 && !merged.isDamaged && !merged.isOutOfService && merged.statusId !== 2002
    && operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, "Edit", scope.zoneId);
  function changed(saved?: LaneProgressMetadata) { if (saved) onProgressSaved?.(saved); scope.onChanged(); raft.reload(); facts.reload(); }
  return <div className="space-y-3">
    {raft.loading || facts.loading ? <Skeleton /> : <>
      <fieldset disabled={locks.incident} className="min-w-0 border-0 p-0"><LaneProgressEditor key={`${lane.laneNumber}:${version}:${merged.seededPercent}:${merged.harvestedPercent}`} lane={merged} target={{ raftId: scope.raftId, zoneId: scope.zoneId, laneNumber: lane.laneNumber }} rowVersion={version} canEdit={canEdit} onChanged={changed} onStateChange={progressState} onUnsupported={onProgressUnsupported} /></fieldset>
      {!historical && context && physical && <fieldset disabled={locks.progress} className="min-w-0 border-0 p-0"><LaneIncidentDetails key={`${lane.laneNumber}:${context.rowVersion}`} raft={context} lane={merged} hasSeed={display.state === "Growing" || display.state === "BeingHarvested"} cycleRowVersion={facts.data?.cycle?.rowVersion}
        canDiscontinue={!facts.loading && !facts.error && !!facts.data} onChanged={changed} onStateChange={incidentState} /></fieldset>}
    </>}
    <ErrorNotice error={raft.error || facts.error} />
    {(raft.error || facts.error) && <button type="button" className="omts-control px-3 text-xs" disabled={locks.progress || locks.incident} onClick={() => { raft.reload(); facts.reload(); }}>Tải lại chi tiết làn</button>}
  </div>;
}
