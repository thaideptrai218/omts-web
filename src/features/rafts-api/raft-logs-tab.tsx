"use client";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { CycleLogsTab } from "@/features/cycles-api/cycle-logs-tab";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { Skeleton } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import type { RaftAccess } from "./raft-detail-panel";
import type { RaftDetail } from "./raft-model";
import { useOpenCycle } from "./use-open-cycle";

/** "Nhật ký": the care logs of the raft's open cycle, with the existing log form. Without an open cycle there is nothing to log against. */
export function RaftLogsTab({ raft, zoneId, access, guard }: { raft: RaftDetail; zoneId: string; access: RaftAccess; guard: UnsavedGuard }) {
  const open = useOpenCycle(raft);
  if (open.loading) return <Skeleton />;
  if (open.error || open.cycle === undefined) return <ListStateMessage error={open.error ?? "Không tải được chu kỳ của bè."} onRetry={open.reload} retryLabel="Tải lại" />;
  if (!open.cycle) return <p className={styles.hint}>Bè chưa có chu kỳ đang mở nên chưa có nhật ký chăm sóc. Hãy bắt đầu chu kỳ ở tab Chu kỳ nuôi.</p>;
  return <CycleLogsTab key={open.cycle.id} dirtyRef={guard.dirty} cycleId={open.cycle.id} startDate={open.cycle.startDate} zoneId={zoneId} openCycle
    canCreate={!!access.cycle?.logsCreate} canEdit={!!access.cycle?.logsEdit} />;
}
