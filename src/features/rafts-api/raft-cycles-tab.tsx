"use client";
import Link from "next/link";
import { useCallback } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { cycleHistory } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";

/** "Chu kỳ nuôi": the raft's cycle history, with a link to open it on the cycle screen. */
export function RaftCyclesTab({ raftId, zoneId }: { raftId: string; zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "history", raftId }, cycleHistory, signal), [raftId]));
  const href = `/farming/cycles?zoneId=${encodeURIComponent(zoneId)}&raftId=${encodeURIComponent(raftId)}`;
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được lịch sử chu kỳ."} onRetry={remote.reload} retryLabel="Tải lại" />;
  return <>
    {remote.data.length === 0 ? <p className={styles.hint}>Bè chưa có chu kỳ nuôi.</p>
      : <table className={styles.subTable}><thead><tr><th scope="col">Bắt đầu</th><th scope="col">Đóng</th><th scope="col">Tình trạng</th></tr></thead>
        <tbody>{remote.data.map(cycle => <tr key={cycle.id}><td>{formatVietnameseDate(cycle.startDate)}</td><td>{cycle.closeDate ? formatVietnameseDate(cycle.closeDate) : "—"}</td><td>{cycle.closeDate ? "Đã đóng" : "Đang mở"}</td></tr>)}</tbody></table>}
    <TabFooter right={<Link className={styles.footerLink} href={href}>Mở màn Chu kỳ nuôi</Link>} />
  </>;
}
