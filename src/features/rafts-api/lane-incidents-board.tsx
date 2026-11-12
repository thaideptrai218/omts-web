"use client";
import { useCallback, useRef, useState } from "react";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import type { Raft } from "@/features/farming-api/contracts";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { operationAllowed } from "@/features/operations/permissions";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import { incidentActionLabel, type IncidentAction } from "./lane-incident-contracts";
import { LaneIncidentForm } from "./lane-incident-form";
import { LaneIncidentHistory } from "./lane-incident-history";
import { laneIncidentRepository } from "./lane-incident-repository";

type Lane = Raft["lanes"][number];
const states: Record<string, string> = { NotSeeded: "Chưa thả giống", Growing: "Đang nuôi", BeingHarvested: "Đang thu hoạch", Harvested: "Đã thu xong", OutOfService: "Mất giống, ngừng hoạt động" };
type DraftState = { onDirty?(dirty: boolean): void; onPending?(pending: boolean): void };
export function LaneIncidentsBoard({ raft, onChanged, onDirty, onPending }: { raft: Raft; onChanged(): void } & DraftState) {
  const [opened, setOpened] = useState<number>();
  const dirty = useRef(false), pending = useRef(false), confirmation = useActionDialog();
  const reportDirty = useCallback((value: boolean) => { dirty.current = value; onDirty?.(value); }, [onDirty]);
  const reportPending = useCallback((value: boolean) => { pending.current = value; onPending?.(value); }, [onPending]);
  async function toggle(n: number) {
    if (pending.current) return;
    if (dirty.current && !await confirmation.confirm("Bỏ các thay đổi chưa lưu của làn?")) return;
    setOpened(value => value === n ? undefined : n);
  }
  return <section aria-label="Các làn của bè" className="mt-5">{confirmation.dialog}<h4 className="mb-2 text-sm font-semibold">Các làn của bè</h4>
    {!raft.lanes.length ? <p className="text-sm text-text-muted">Bè chưa có làn.</p> : <ul className="grid gap-2">
      {[...raft.lanes].filter(lane => lane.statusId !== 2002).sort((a, b) => a.laneNumber - b.laneNumber).map(lane => <li key={lane.id} className="rounded-control border border-border p-3">
        <button key="open-lane" type="button" aria-expanded={opened === lane.laneNumber} className="flex w-full flex-wrap items-center gap-2 text-left text-sm" onClick={() => void toggle(lane.laneNumber)}>
          <strong>Làn {lane.laneNumber}</strong>{lane.isOutOfService ? <StatusPill tone="neutral">Ngừng hoạt động</StatusPill> : <StatusPill tone="success">Đang sử dụng</StatusPill>}
          {lane.isDamaged && <StatusPill tone="danger">Hỏng</StatusPill>}{lane.state && <StatusPill tone="neutral">{states[lane.state] ?? lane.state}</StatusPill>}
          {lane.lineLengthM != null && <span className="text-text-muted">{lane.lineLengthM.toLocaleString("vi-VN")} m</span>}
        </button>
        {opened === lane.laneNumber && (typeof lane.isDamaged === "boolean" ? <OpenedLane key={`${lane.id}-${raft.rowVersion}`} raft={raft} lane={lane} onChanged={onChanged} onDirty={reportDirty} onPending={reportPending} />
          : <p className="mt-2 text-xs text-text-muted">Chưa có lịch sử sự cố của làn.</p>)}
      </li>)}
    </ul>}
  </section>;
}
function OpenedLane({ raft, lane, onChanged, onDirty, onPending }: { raft: Raft; lane: Lane; onChanged(): void } & DraftState) {
  const [action, setAction] = useState<IncidentAction>();
  const reportState = useCallback((state: { dirty: boolean; pending: boolean }) => { onDirty?.(state.dirty); onPending?.(state.pending); }, [onDirty, onPending]);
  const { identity, permissions } = useApiWorkspace();
  const remote = useRemote(useCallback(async (signal: AbortSignal) => {
    const result = await laneIncidentRepository.history({ id: raft.id, zoneId: raft.zone.id, laneNumber: lane.laneNumber }, signal);
    if (result.status === "error" && result.httpStatus === 404) return { status: "success" as const, data: { available: false, incidents: [] } };
    return result.status === "success" ? { status: "success" as const, data: { available: true, incidents: result.data.incidents } } : result;
  }, [raft.id, raft.zone.id, lane.laneNumber]));
  const facts = useRemote(useCallback((signal: AbortSignal) => laneIncidentRepository.cycle(raft.id, raft.zone.id, signal), [raft.id, raft.zone.id]));
  if (remote.loading) return <Skeleton />;
  if (remote.error) return <><ErrorNotice error={remote.error} /><Button type="button" variant="secondary" className="w-auto" onClick={remote.reload}>Tải lại lịch sử làn</Button></>;
  if (!remote.data?.available) return <p className="mt-2 text-xs text-text-muted">Chưa có lịch sử sự cố của làn.</p>;
  const state = facts.data?.lanes.find(value => value.laneNumber === lane.laneNumber)?.state ?? lane.state;
  const hasSeed = state === "Growing" || state === "BeingHarvested";
  const writable = raft.statusId === 101 && lane.statusId === 2001 && !lane.isOutOfService && operationAllowed("cultivation-cycles", identity, permissions.functionPermissions, "Edit", raft.zone.id);
  const actions: IncidentAction[] = lane.isDamaged ? ["repair", "discontinue"] : ["damage", "discontinue"];
  function changed() { setAction(undefined); onChanged(); remote.reload(); facts.reload(); }
  return <div className="mt-3">
    {facts.error && <p className="text-xs text-text-muted">Chưa tải được tình trạng chu kỳ. <button type="button" className="underline" onClick={facts.reload}>Tải lại</button></p>}
    {action ? <LaneIncidentForm key={action} action={action} raftId={raft.id} raftCode={raft.code} zoneId={raft.zone.id} laneNumber={lane.laneNumber} rowVersion={raft.rowVersion}
      hasSeed={hasSeed} cycleRowVersion={facts.data?.cycle?.rowVersion} onStateChange={reportState} onClose={() => setAction(undefined)} onSaved={changed} />
      : writable && <div className="flex flex-wrap justify-end gap-2">{actions.map(value => <Button key={`action-${value}`} type="button" variant="secondary" className="w-auto"
        disabled={value === "discontinue" && (facts.loading || !!facts.error || !facts.data)} title={value === "discontinue" && !facts.data ? "Tải tình trạng chu kỳ trước khi ngừng hoạt động làn." : undefined}
        onClick={() => setAction(value)}>{incidentActionLabel[value]}</Button>)}</div>}
    <LaneIncidentHistory incidents={remote.data.incidents} />
  </div>;
}
