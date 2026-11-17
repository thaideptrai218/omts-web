"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { useCallback } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { zoneCycles } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { Skeleton, useRemote } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";

/** "Chu kỳ nuôi": latest cycle of every raft in the zone; a raft code opens it on the cycle screen. */
export function ZoneCyclesTab({ zoneId }: { zoneId: string }) {
  const remote = useRemote(useCallback((signal: AbortSignal) => readCycles({ action: "zone", zoneId }, zoneCycles, signal), [zoneId]));
  const listHref = farmingReferenceHref("cycle", { zoneId });
  if (remote.loading) return <Skeleton />;
  if (remote.error || !remote.data) return <ListStateMessage error={remote.error ?? "Không tải được chu kỳ nuôi."} onRetry={remote.reload} retryLabel="Tải lại" />;
  return <>
    {remote.data.length === 0 ? <p className={styles.hint}>Vùng chưa có bè nên chưa có chu kỳ.</p>
      : <table className={styles.subTable}><thead><tr><th scope="col">Bè</th><th scope="col">Số làn</th><th scope="col">Chu kỳ gần nhất</th><th scope="col">Bắt đầu</th><th scope="col">Đóng</th></tr></thead>
        <tbody>{remote.data.map(row => <tr key={row.raftId}>
          <td><Link className={styles.link} href={farmingReferenceHref("raft", { zoneId, recordId: row.raftId, search: row.raftCode })}>{row.raftCode}</Link></td>
          <td>{row.laneCount}</td>
          <td>{row.cycle ? row.cycle.closeDate ? "Đã đóng" : "Đang mở" : "Chưa có chu kỳ"}</td>
          <td>{row.cycle ? <Link className={styles.link} href={farmingReferenceHref("cycle", { zoneId, raftId: row.raftId, cycleId: row.cycle.id })}>{formatVietnameseDate(row.cycle.startDate)}</Link> : "—"}</td>
          <td>{row.cycle?.closeDate ? formatVietnameseDate(row.cycle.closeDate) : "—"}</td>
        </tr>)}</tbody></table>}
    <TabFooter right={<Link className={styles.footerLink} href={listHref}>Mở màn Hành trình</Link>} />
  </>;
}
