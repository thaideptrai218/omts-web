"use client";
import { useMemo } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import type { JourneyAction } from "@/features/cycles-api/cycle-journey-model";
import { openCrewOf } from "@/features/cultivation-api/record-crew-attendance";
import { CompleteSeeding } from "@/features/cultivation-api/records-complete-seeding-dialog";
import { HarvestPanel } from "@/features/cultivation-api/records-harvest-panel";
import { seedingList } from "@/features/cultivation-api/records-contracts";
import { SeedingForm } from "@/features/cultivation-api/records-seeding-form";
import { seedRepo, useAllowed } from "@/features/cultivation-api/records-shared";
import { Skeleton, useRemote } from "@/features/operations/ui";

type Scope = { zoneId: string; raftId: string; cycleId: string; cycleStartDate?: string };
/**
 * A step of the journey that records something, opened where the user is: Ghi nhận thả giống and Hoàn tất thả giống use the forms of the Thả giống screen
 * (with its list read for the figures they need), Thu hoạch opens that raft's harvest panel in a window. `onDone` tells the tab to read the cycle again.
 */
export function JourneyRecordDialog({ action, onClose, onDone, ...scope }: Scope & { action: JourneyAction; onClose(): void; onDone(): void }) {
  return action.screen === "harvest" ? <HarvestDialog zoneId={scope.zoneId} raftId={scope.raftId} onClose={onDone} />
    : <SeedingDialog {...scope} complete={action.key === "journey-seeding-complete"} onClose={onClose} onDone={onDone} />;
}

function HarvestDialog({ zoneId, raftId, onClose }: { zoneId: string; raftId: string; onClose(): void }) {
  return <Dialog open size="xl" title="Thu hoạch" onOpenChange={open => { if (!open) onClose(); }}><HarvestPanel zoneId={zoneId} raftId={raftId} /></Dialog>;
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
