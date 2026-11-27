"use client";
import { useCallback, useMemo, useState } from "react";
import { CollapsibleSection, ListStateMessage } from "@/components/ui/management-screen/management-table";
import { cycleHistory } from "@/features/cycles-api/contracts";
import { farmedSeedText } from "@/features/cycles-api/cycle-farmed-seed";
import { CycleJourneyTab } from "@/features/cycles-api/cycle-journey-tab";
import type { CycleRow } from "@/features/cycles-api/cycle-model";
import { CyclePlanTab, type CycleAccess } from "@/features/cycles-api/cycle-plan-tab";
import { CycleStartAction } from "@/features/cycles-api/cycle-start-action";
import { readCycles } from "@/features/cycles-api/repository";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { Skeleton } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { IN_USE, raftStatusLabel, type RaftDetail } from "./raft-model";

const viewOnly: CycleAccess = { view: true, create: false, edit: false, remove: false, logs: false, logsCreate: false, logsEdit: false };
/**
 * "Chu kỳ nuôi": the cycle screen inside the raft. No open cycle: "Bắt đầu chu kỳ". An open cycle: its journey (thả giống, chăm sóc, thu hoạch, tổng kết with
 * "Kết thúc chu kỳ") and its plan. Below, the history of the raft's cycles. The cycles are read here, when the tab opens.
 */
export function RaftCyclesTab({ raft, zoneId, zoneLabel, access, guard, onChanged, onOpenLogs }: {
  raft: RaftDetail; zoneId: string; zoneLabel: string; access: CycleAccess | undefined; guard: UnsavedGuard; onChanged(notice: string): void; onOpenLogs(): void;
}) {
  const history = useStickyRemote(useCallback((signal: AbortSignal) => readCycles({ action: "history", raftId: raft.id }, cycleHistory, signal), [raft.id]));
  const [planOpen, setPlanOpen] = useState(false), rights = access ?? viewOnly;
  const cycles = history.data, open = cycles?.find(cycle => !cycle.closeDate);
  // The row the cycle components work with: the zone screens build it from a list read; here it comes from the raft record and its cycle history.
  const row = useMemo<CycleRow>(() => ({ raftId: raft.id, raftCode: raft.code, raftStatusId: raft.statusId, raftStatus: raftStatusLabel(raft.statusId), laneCount: raft.laneCount ?? raft.lanes.length,
    cycle: open ?? cycles?.[0] ?? null, lastCloseDate: cycles?.find(cycle => cycle.closeDate)?.closeDate ?? null,
    canStart: raft.statusId === IN_USE && !open, canEdit: !!open && rights.edit, canCancel: !!open && rights.remove }), [raft, cycles, open, rights.edit, rights.remove]);
  const changed = (notice: string) => { history.reload(); onChanged(notice); };
  const jump = (tab: "plan" | "logs") => void guard.leave(() => { if (tab === "logs") onOpenLogs(); else setPlanOpen(true); });
  if (history.loading && !cycles) return <Skeleton />;
  if (!cycles) return <ListStateMessage error={history.error ?? "Không tải được chu kỳ của bè."} onRetry={history.reload} retryLabel="Tải lại" />;
  return <>
    {open
      ? <>
        <CycleJourneyTab key={open.id} part="all" row={row} zoneId={zoneId} access={rights} onJump={jump} onChanged={changed} />
        <div className="mt-3"><CollapsibleSection title="Kế hoạch chu kỳ" description="Sản lượng dự kiến, ngày bắt đầu, đợt ươm và ghi chú." defaultOpen={planOpen} columns={1} onToggle={setPlanOpen}>
          <CyclePlanTab key={open.id} row={row} zoneId={zoneId} access={rights} dirtyRef={guard.dirty} onChanged={changed} />
        </CollapsibleSection></div>
      </>
      : <CycleStartAction row={row} zoneId={zoneId} zoneLabel={zoneLabel} canCreate={rights.create} variant="empty" onStarted={() => changed("Đã bắt đầu chu kỳ nuôi")} />}
    {cycles.length > 0 && <section aria-label="Lịch sử chu kỳ" className="mt-4">
      <h4 className="mb-2 text-sm font-semibold">Lịch sử chu kỳ</h4>
      <table className={styles.subTable}><thead><tr><th scope="col">Bắt đầu</th><th scope="col">Đóng</th><th scope="col">Giống</th><th scope="col">Tình trạng</th></tr></thead>
        <tbody>{cycles.map(cycle => <tr key={cycle.id}><td>{formatVietnameseDate(cycle.startDate)}</td><td>{cycle.closeDate ? formatVietnameseDate(cycle.closeDate) : "—"}</td>
          <td>{farmedSeedText(cycle)}</td><td>{cycle.closeDate ? "Đã đóng" : "Đang nuôi"}</td></tr>)}</tbody></table>
    </section>}
  </>;
}
