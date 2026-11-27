"use client";
import { useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import type { JourneyAction } from "@/features/cycles-api/cycle-journey-model";
import { openCrewOf } from "@/features/cultivation-api/record-crew-attendance";
import { CompleteSeeding } from "@/features/cultivation-api/records-complete-seeding-dialog";
import { HarvestLaneForm } from "@/features/cultivation-api/records-harvest-lane-form";
import { harvestList, seedingList } from "@/features/cultivation-api/records-contracts";
import { SeedingForm } from "@/features/cultivation-api/records-seeding-form";
import { harvestRepo, seedRepo, useAllowed } from "@/features/cultivation-api/records-shared";
import { Skeleton, useRemote } from "@/features/operations/ui";

type Scope = { zoneId: string; raftId: string; cycleId: string; cycleStartDate?: string };
/**
 * A step of the journey that records something, opened where the user is: Ghi nhận thả giống and Hoàn tất thả giống use the forms of the Thả giống screen
 * (with its list read for the figures they need), Thu hoạch opens the harvest form with lane selection (pick the lanes of the raft, then record the trip). `onDone` tells the tab to read the cycle again.
 */
export function JourneyRecordDialog({ action, onClose, onDone, ...scope }: Scope & { action: JourneyAction; onClose(): void; onDone(): void }) {
  return action.screen === "harvest" ? <HarvestDialog zoneId={scope.zoneId} raftId={scope.raftId} onClose={onClose} onDone={onDone} />
    : <SeedingDialog {...scope} complete={action.key === "journey-seeding-complete"} onClose={onClose} onDone={onDone} />;
}

function HarvestDialog({ zoneId, raftId, onClose, onDone }: { zoneId: string; raftId: string; onClose(): void; onDone(): void }) {
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => harvestRepo.read("list", { id: raftId, zoneId }, harvestList, signal), [raftId, zoneId]));
  if (remote.loading) return <Dialog open title="Thu hoạch" onOpenChange={open => { if (!open) onClose(); }}><Skeleton /></Dialog>;
  if (remote.error || !remote.data) return <Dialog open title="Thu hoạch" onOpenChange={open => { if (!open) onClose(); }}><ListStateMessage error={remote.error ?? "Không tải được thu hoạch."} onRetry={remote.reload} retryLabel="Tải lại" /></Dialog>;
  return <HarvestLaneForm zoneId={zoneId} raftId={raftId} data={remote.data} onClose={onClose} onSaved={onDone} />;
}

function SeedingDialog({ zoneId, raftId, cycleId, cycleStartDate, complete, onClose, onDone }: Scope & { complete: boolean; onClose(): void; onDone(): void }) {
  const allowed = useAllowed("seeding", zoneId);
  const remote = useRemote(useMemo(() => (signal: AbortSignal) => seedRepo.read("list", { id: cycleId, zoneId }, seedingList, signal), [cycleId, zoneId]));
  const data = remote.data;
  if (remote.loading) return <Dialog open title="Thả giống" onOpenChange={open => { if (!open) onClose(); }}><Skeleton /></Dialog>;
  if (remote.error || !data) return <Dialog open title="Thả giống" onOpenChange={open => { if (!open) onClose(); }}><ListStateMessage error={remote.error ?? "Không tải được thả giống."} onRetry={remote.reload} retryLabel="Tải lại" /></Dialog>;
  return complete
    ? <CompleteSeeding cycleId={cycleId} zoneId={zoneId} hasRecords={data.records.length > 0} openCrew={openCrewOf(...data.records.map(record => record.crew))} onClose={onClose} onSaved={onDone} />
    : <SeedingForm zoneId={zoneId} raftId={raftId} cycleId={cycleId} cycleStartDate={cycleStartDate} data={data} record={null} allowed={allowed} onClose={onClose} onSaved={onDone} />;
}
