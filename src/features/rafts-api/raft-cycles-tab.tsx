"use client";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { cycleHistory, type cycleSummary } from "@/features/cycles-api/contracts";
import type { z } from "zod";
import { farmedSeedText } from "@/features/cycles-api/cycle-farmed-seed";
import { CycleJourneyTab } from "@/features/cycles-api/cycle-journey-tab";
import type { CycleRow } from "@/features/cycles-api/cycle-model";
import { CyclePlanTab, type CycleAccess } from "@/features/cycles-api/cycle-plan-tab";
import { CycleStartAction } from "@/features/cycles-api/cycle-start-action";
import { readCycles } from "@/features/cycles-api/repository";
import { Facts, TabFooter } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { Skeleton } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { JourneyAction } from "@/features/cycles-api/cycle-journey-model";
import { IN_USE, raftStatusLabel, type RaftDetail } from "./raft-model";
import { JourneyRecordDialog } from "./raft-journey-record";

const viewOnly: CycleAccess = { view: true, create: false, edit: false, remove: false, logs: false, logsCreate: false, logsEdit: false };
type Summary = z.infer<typeof cycleSummary>;
/**
 * "Chu kỳ nuôi": the cycle screen inside the raft. No open cycle: "Bắt đầu chu kỳ". An open cycle: its journey (thả giống, thu hoạch, tổng kết with "Kết thúc chu kỳ"),
 * where recording opens the form in a window on this screen. "Kế hoạch chu kỳ" in the footer opens the plan as a card (with "Chỉnh sửa" inside).
 * Below, the history of the raft's cycles; a cycle opens as a read-only card. The cycles are read here, when the tab opens.
 */
export function RaftCyclesTab({ raft, zoneId, zoneLabel, access, guard, onChanged, onOpenLogs }: {
  raft: RaftDetail; zoneId: string; zoneLabel: string; access: CycleAccess | undefined; guard: UnsavedGuard; onChanged(notice: string): void; onOpenLogs(): void;
}) {
  const history = useStickyRemote(useCallback((signal: AbortSignal) => readCycles({ action: "history", raftId: raft.id }, cycleHistory, signal), [raft.id]));
  const [planOpen, setPlanOpen] = useState(false), [recording, setRecording] = useState<JourneyAction>(), [viewing, setViewing] = useState<Summary>(), [revision, setRevision] = useState(0);
  const rights = access ?? viewOnly, cycles = history.data, open = cycles?.find(cycle => !cycle.closeDate);
  // The row the cycle components work with: the zone screens build it from a list read; here it comes from the raft record and its cycle history.
  const rowOf = useCallback((cycle: Summary | undefined, editable: boolean): CycleRow => ({ raftId: raft.id, raftCode: raft.code, raftStatusId: raft.statusId, raftStatus: raftStatusLabel(raft.statusId), laneCount: raft.laneCount ?? raft.lanes.length,
    cycle: cycle ?? null, lastCloseDate: cycles?.find(item => item.closeDate)?.closeDate ?? null,
    canStart: raft.statusId === IN_USE && !open, canEdit: editable && !!cycle && rights.edit, canCancel: editable && !!cycle && rights.remove }), [raft, cycles, open, rights.edit, rights.remove]);
  const row = useMemo(() => rowOf(open ?? cycles?.[0], !!open), [rowOf, open, cycles]);
  const changed = (notice: string) => { history.reload(); setRevision(value => value + 1); onChanged(notice); };
  if (history.loading && !cycles) return <Skeleton />;
  if (!cycles) return <ListStateMessage error={history.error ?? "Không tải được chu kỳ của bè."} onRetry={history.reload} retryLabel="Tải lại" />;
  return <>
    {open
      ? <CycleJourneyTab key={`${open.id}:${revision}`} part="all" row={row} zoneId={zoneId} access={rights} onJump={tab => void guard.leave(() => { if (tab === "logs") onOpenLogs(); else setPlanOpen(true); })} onChanged={changed} onRecord={setRecording} />
      : <CycleStartAction row={row} zoneId={zoneId} zoneLabel={zoneLabel} canCreate={rights.create} variant="empty" onStarted={() => changed("Đã bắt đầu chu kỳ nuôi")} />}
    {cycles.length > 0 && <section aria-label="Lịch sử chu kỳ" className="mt-4">
      <h4 className="mb-2 text-sm font-semibold">Lịch sử chu kỳ</h4>
      <table className={styles.subTable}><thead><tr><th scope="col">Chu kỳ</th><th scope="col">Bắt đầu</th><th scope="col">Đóng</th><th scope="col">Giống</th><th scope="col">Tình trạng</th></tr></thead>
        <tbody>{cycles.map(cycle => <tr key={cycle.id}>
          <td><button type="button" className={styles.link} aria-label={`Xem chu kỳ từ ${formatVietnameseDate(cycle.startDate)}`} onClick={() => setViewing(cycle)}>Chu kỳ {formatVietnameseDate(cycle.startDate)}</button></td>
          <td>{formatVietnameseDate(cycle.startDate)}</td><td>{cycle.closeDate ? formatVietnameseDate(cycle.closeDate) : "—"}</td>
          <td>{farmedSeedText(cycle)}</td><td>{cycle.closeDate ? "Đã đóng" : "Đang nuôi"}</td></tr>)}</tbody></table>
    </section>}
    {open && <TabFooter left={<Button key="plan" type="button" variant="ghost" className="w-auto" onClick={() => setPlanOpen(true)}><InterfaceIcon name="calendar" className="size-4" />Kế hoạch chu kỳ</Button>} />}
    {planOpen && open && <Dialog open size="lg" title="Kế hoạch chu kỳ" onOpenChange={next => { if (!next) void guard.leave(() => setPlanOpen(false)); }}>
      <CyclePlanTab key={open.id} row={row} zoneId={zoneId} access={rights} dirtyRef={guard.dirty} onChanged={notice => { setPlanOpen(false); changed(notice); }} />
    </Dialog>}
    {recording && open && <JourneyRecordDialog action={recording} zoneId={zoneId} raftId={raft.id} cycleId={open.id} cycleStartDate={open.startDate} onClose={() => setRecording(undefined)} onDone={() => { setRecording(undefined); changed(""); }} />}
    {viewing && <Dialog open size="xl" title={`Chu kỳ từ ${formatVietnameseDate(viewing.startDate)}`} onOpenChange={next => { if (!next) setViewing(undefined); }}>
      <Facts items={[["Bắt đầu", formatVietnameseDate(viewing.startDate)], ["Kết thúc", viewing.closeDate ? formatVietnameseDate(viewing.closeDate) : "Đang nuôi"], ["Giống", farmedSeedText(viewing)], ["Đợt ươm", viewing.nurseryCode]]} />
      <div className="mt-3"><CycleJourneyTab key={viewing.id} part="all" row={rowOf(viewing, false)} zoneId={zoneId} access={viewOnly} onJump={() => undefined} onChanged={() => undefined} /></div>
    </Dialog>}
  </>;
}
