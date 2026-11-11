"use client";
import Link from "next/link";
import { Fragment, useCallback, useEffect } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { zoneCycles } from "@/features/cycles-api/contracts";
import { readCycles } from "@/features/cycles-api/repository";
import { TabFooter } from "@/features/farming-management/detail-parts";
import { useStickyRemote } from "@/features/farming-management/use-sticky-remote";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import { RaftDetailPanel, type RaftAccess } from "@/features/rafts-api/raft-detail-panel";
import { Skeleton } from "@/features/operations/ui";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { IN_USE } from "./zone-model";
import { readZoneRafts, skipped } from "./zone-summary-reads";

/**
 * "Bè nuôi": compact table of the zone's rafts (code, size, lanes, status, current cycle). A row opens the same full raft record as the
 * Bè nuôi screen in place (RaftDetailPanel, edit included), one at a time through the unsaved-changes guard.
 */
export function ZoneRaftsTab({ zoneId, zoneLabel, raftAccess, guard, openId, onOpen }: {
  zoneId: string; zoneLabel: string; raftAccess: RaftAccess; guard: UnsavedGuard; openId?: string; onOpen(raftId: string | undefined): void;
}) {
  const showCycles = raftAccess.cycles;
  const remote = useStickyRemote(useCallback(async (signal: AbortSignal) => {
    const [rafts, cycles] = await Promise.all([readZoneRafts(zoneId, signal), showCycles ? readCycles({ action: "zone", zoneId }, zoneCycles, signal) : skipped([])]);
    if (rafts.status !== "success") return rafts;
    if (cycles.status !== "success") return cycles;
    const cycleOf = new Map(cycles.data.map(row => [row.raftId, row.cycle]));
    return { status: "success" as const, data: rafts.data.map(raft => ({ ...raft, cycle: cycleOf.get(raft.id) ?? null })) };
  }, [zoneId, showCycles]));
  const toggle = (id: string) => void guard.leave(() => onOpen(openId === id ? undefined : id));
  // A raft picked on the map arrives as `openId`; bring its row into view once the list is there.
  useEffect(() => {
    if (!openId || !remote.data) return;
    const timer = setTimeout(() => document.getElementById(`zone-raft-row-${openId}`)?.scrollIntoView({ block: "nearest" }), 0);
    return () => clearTimeout(timer);
  }, [openId, remote.data]);
  const listHref = `/workspace/rafts?zoneId=${encodeURIComponent(zoneId)}`;
  const columns = showCycles ? 6 : 5;
  if (!remote.data) return remote.error ? <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại" /> : <Skeleton />;
  return <>
    {remote.data.length === 0 ? <p className={styles.hint}>Vùng chưa có bè nuôi.</p>
      : <table className={styles.table}>
        <colgroup><col style={{ width: 28 }} /></colgroup>
        <thead><tr><th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th><th scope="col">Mã bè</th><th scope="col">Kích thước</th><th scope="col" className={styles.number}>Số làn</th><th scope="col">Trạng thái</th>{showCycles && <th scope="col">Chu kỳ hiện tại</th>}</tr></thead>
        <tbody>{remote.data.map(raft => <Fragment key={raft.id}>
          <OpenableTableRow id={`zone-raft-row-${raft.id}`} data-selected={openId === raft.id || undefined} onOpen={() => toggle(raft.id)}>
            <td className={styles.expandCell}><button type="button" aria-expanded={openId === raft.id} aria-controls={`raft-preview-${raft.id}`} aria-label={`${openId === raft.id ? "Thu gọn" : "Mở"} bè ${raft.code}`} onClick={() => toggle(raft.id)}><InterfaceIcon name={openId === raft.id ? "chevron-down" : "chevron-right"} /></button></td>
            <td className={styles.name}>{raft.code}</td><td>{raft.size || "—"}</td><td className={styles.number}>{raft.laneCount ?? "—"}</td>
            <td><StatusPill tone={raft.statusId === IN_USE ? "success" : "neutral"}>{raft.statusId === IN_USE ? "Đang sử dụng" : "Ngừng sử dụng"}</StatusPill></td>
            {showCycles && <td>{raft.cycle ? `${raft.cycle.closeDate ? "Đã đóng" : "Đang mở"} · từ ${formatVietnameseDate(raft.cycle.startDate)}` : "Chưa có chu kỳ"}</td>}
          </OpenableTableRow>
          {openId === raft.id && <tr><td colSpan={columns} className={styles.detailCell}><RaftDetailPanel id={raft.id} zoneId={zoneId} zoneLabel={zoneLabel} access={raftAccess} guard={guard} onChanged={remote.reload} /></td></tr>}
        </Fragment>)}</tbody></table>}
    <TabFooter right={<Link className={styles.footerLink} href={listHref}>Mở danh sách bè của vùng</Link>} />
  </>;
}
