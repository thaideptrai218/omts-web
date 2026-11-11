"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { zoneCycles } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import type { RaftAccess } from "@/features/rafts-api/raft-detail-panel";
import { Skeleton } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { IN_USE } from "./zone-model";
import { readZoneRafts, skipped } from "./zone-summary-reads";

/**
 * Keep the zone preview compact and link to the standalone raft record.
 */
export function ZoneRaftsTab({ zoneId, raftAccess, guard, openId }: {
  zoneId: string; raftAccess: RaftAccess; guard: UnsavedGuard; openId?: string;
}) {
  const router = useRouter();
  const showCycles = raftAccess.cycles;
  const remote = useStickyRemote(useCallback(async (signal: AbortSignal) => {
    const [rafts, cycles] = await Promise.all([readZoneRafts(zoneId, signal), showCycles ? readCycles({ action: "zone", zoneId }, zoneCycles, signal) : skipped([])]);
    if (rafts.status !== "success") return rafts;
    if (cycles.status !== "success") return cycles;
    const cycleOf = new Map(cycles.data.map(row => [row.raftId, row.cycle]));
    return { status: "success" as const, data: rafts.data.map(raft => ({ ...raft, cycle: cycleOf.get(raft.id) ?? null })) };
  }, [zoneId, showCycles]));
  // A raft picked on the map arrives as `openId`; bring its row into view once the list is there.
  useEffect(() => {
    if (!openId || !remote.data) return;
    const timer = setTimeout(() => document.getElementById(`zone-raft-row-${openId}`)?.scrollIntoView({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [openId, remote.data]);
  const listHref = `/workspace/rafts?zoneId=${encodeURIComponent(zoneId)}`;
  if (!remote.data) return remote.error ? <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại" /> : <Skeleton />;
  return <>
    {remote.data.length === 0 ? <p className={styles.hint}>Vùng chưa có bè nuôi.</p>
      : <table className={styles.table}>
        <thead><tr><th scope="col">Mã bè</th><th scope="col">Kích thước</th><th scope="col" className={styles.number}>Số làn</th><th scope="col">Trạng thái</th>{showCycles && <th scope="col">Chu kỳ hiện tại</th>}</tr></thead>
        <tbody>{remote.data.map(raft => <tr key={raft.id} id={`zone-raft-row-${raft.id}`} data-selected={openId === raft.id || undefined}>
            <td className={styles.name}>
              <Link
                className={styles.link}
                href={`${listHref}&recordId=${encodeURIComponent(raft.id)}`}
                aria-label={`Mở hồ sơ bè ${raft.code}`}
                onNavigate={(event) => {
                  if (!guard.dirty.current) return;
                  event.preventDefault();
                  void guard.leave(() => router.push(`${listHref}&recordId=${encodeURIComponent(raft.id)}`));
                }}
              >{raft.code}</Link>
            </td><td>{raft.size || "—"}</td><td className={styles.number}>{raft.laneCount ?? "—"}</td>
            <td><StatusPill tone={raft.statusId === IN_USE ? "success" : "neutral"}>{raft.statusId === IN_USE ? "Đang sử dụng" : "Ngừng sử dụng"}</StatusPill></td>
            {showCycles && <td>{raft.cycle ? `${raft.cycle.closeDate ? "Đã đóng" : "Đang mở"} · từ ${formatVietnameseDate(raft.cycle.startDate)}` : "Chưa có chu kỳ"}</td>}
          </tr>)}</tbody></table>}
    <TabFooter right={<Link className={styles.footerLink} href={listHref}>Mở danh sách bè của vùng</Link>} />
  </>;
}
