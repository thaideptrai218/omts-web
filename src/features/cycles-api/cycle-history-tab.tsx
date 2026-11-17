"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useCallback } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { cycleHistory } from "./contracts";
import { readCycles } from "./repository";

/** "Lịch sử": every cycle of the raft, newest first as returned by the API. */
export function CycleHistoryTab({ raftId, zoneId }: { raftId: string; zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "history", raftId }, cycleHistory, signal), [raftId]));
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được lịch sử chu kỳ."} onRetry={remote.reload} retryLabel="Tải lại" />;
  if (!remote.data.length) return <p className={styles.hint}>Bè chưa có chu kỳ nuôi.</p>;
  return <table className={styles.subTable}><thead><tr><th scope="col">Bắt đầu</th><th scope="col">Đóng</th><th scope="col">Tình trạng</th></tr></thead>
    <tbody>{remote.data.map(cycle => <tr key={cycle.id}><td><Link className={styles.link} href={farmingReferenceHref("cycle", { zoneId, raftId, cycleId: cycle.id })}>{formatVietnameseDate(cycle.startDate)}</Link></td><td>{cycle.closeDate ? formatVietnameseDate(cycle.closeDate) : "—"}</td><td>{cycle.closeDate ? "Đã đóng" : "Đang nuôi"}</td></tr>)}</tbody></table>;
}
