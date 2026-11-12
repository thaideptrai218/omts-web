"use client";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { incidentActionLabel, type IncidentAction } from "./lane-incident-contracts";
import { LaneIncidentForm } from "./lane-incident-form";
import { LaneIncidentHistory } from "./lane-incident-history";
import { laneIncidentRepository } from "./lane-incident-repository";
import type { LaneOverviewItem } from "@/features/farming-management/lane-overview";

export type IncidentRaft = { id: string; code: string; zoneId: string; rowVersion: string; statusId: number };
export type LaneDraftState = { dirty: boolean; pending: boolean };
export function LaneIncidentDetails({ raft, lane, hasSeed, cycleRowVersion, canDiscontinue, onChanged, onStateChange }: {
  raft: IncidentRaft; lane: LaneOverviewItem; hasSeed: boolean; cycleRowVersion?: string; canDiscontinue: boolean;
  onChanged(): void; onStateChange?(state: LaneDraftState): void;
}) {
  const [action, setAction] = useState<IncidentAction>();
  const { identity, permissions } = useApiWorkspace();
  const remote = useRemote(useCallback(async (signal: AbortSignal) => {
    const result = await laneIncidentRepository.history({ id: raft.id, zoneId: raft.zoneId, laneNumber: lane.laneNumber }, signal);
    if (result.status === "error" && [404, 405].includes(result.httpStatus)) return { status: "success" as const, data: { available: false, incidents: [] } };
    return result.status === "success" ? { status: "success" as const, data: { available: true, incidents: result.data.incidents } } : result;
  }, [raft.id, raft.zoneId, lane.laneNumber]));
  if (remote.loading) return <Skeleton />;
  if (remote.error) return <><ErrorNotice error={remote.error} /><Button type="button" variant="secondary" className="w-auto" onClick={remote.reload}>Tải lại lịch sử làn</Button></>;
  if (!remote.data?.available) return <p className="mt-2 text-xs text-text-muted">Chưa có lịch sử sự cố của làn.</p>;
  const writable = raft.statusId === 101 && lane.statusId === 2001 && operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, "Edit", raft.zoneId);
  const actions: IncidentAction[] = lane.isOutOfService ? ["restore"] : lane.isDamaged ? ["repair", "discontinue"] : ["damage", "discontinue"];
  function changed() { setAction(undefined); onChanged(); remote.reload(); }
  return <div className="mt-3">
    {action ? <LaneIncidentForm key={action} action={action} raftId={raft.id} raftCode={raft.code} zoneId={raft.zoneId} laneNumber={lane.laneNumber} rowVersion={raft.rowVersion}
      hasSeed={hasSeed} cycleRowVersion={cycleRowVersion} onStateChange={onStateChange} onClose={() => setAction(undefined)} onSaved={changed} />
      : writable && <div className="flex flex-wrap justify-end gap-2">{actions.map(value => <Button key={`action-${value}`} type="button" variant="secondary" className="w-auto"
        disabled={value === "discontinue" && !canDiscontinue} title={value === "discontinue" && !canDiscontinue ? "Tải tình trạng chu kỳ trước khi ngừng hoạt động làn." : undefined}
        onClick={() => setAction(value)}>{incidentActionLabel[value]}</Button>)}</div>}
    <LaneIncidentHistory incidents={remote.data.incidents} />
  </div>;
}
