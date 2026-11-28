"use client";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { logTypeLabel } from "@/features/cycles-api/log-contracts";
import { logPhotoSrc } from "@/features/cycles-api/log-photo-src";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import styles from "@/features/farming-management/farming-management.module.css";
import { viDateTime } from "@/features/purchase-documents/document-parts";
import { formatVietnameseDate } from "@/shared/format/date-only";
import type { LogPageItem, LogSortKey } from "./log-page-contract";

type Column = { key: string; label: string; weight: number; sort?: LogSortKey; render(log: LogPageItem, open: () => void): ReactNode };

const when = (value: string) => Number.isNaN(Date.parse(value)) ? "—" : viDateTime(value);
const zoneText = (log: LogPageItem) => [log.zoneCode, log.zoneName].filter(Boolean).join(" · ") || "—";
const stop = (event: { stopPropagation(): void }) => event.stopPropagation();

/** Columns of the care log list; `sort` is the `sortBy` the backend understands, a column without it cannot be sorted. Every cell is one nowrap line that ends in an ellipsis. */
export const logColumns: readonly Column[] = [
  { key: "visitDate", label: "Ngày chăm sóc", weight: 11, sort: "visitDate", render: (log, open) => <button type="button" className={`${styles.truncated} ${styles.link}`}
    aria-label={`Xem nhật ký ${log.raftCode} ngày ${formatVietnameseDate(log.visitDate)}`} onClick={event => { stop(event); open(); }}>{formatVietnameseDate(log.visitDate)}</button> },
  { key: "zone", label: "Vùng nuôi", weight: 17, sort: "zone", render: log => <span className={styles.truncated} title={zoneText(log)}>{zoneText(log)}</span> },
  { key: "raft", label: "Bè", weight: 10, sort: "raft", render: log => <Link className={`${styles.truncated} ${styles.link}`} title={log.raftCode} href={farmingReferenceHref("raft", { zoneId: log.zoneId, search: log.raftCode, tab: "logs" })} onClick={stop}>{log.raftCode}</Link> },
  { key: "logType", label: "Loại", weight: 12, sort: "logType", render: log => <span className={styles.truncated}>{logTypeLabel(log.logType)}</span> },
  { key: "notes", label: "Nội dung", weight: 22, render: log => <span className={styles.truncated} title={log.notes ?? undefined}>{log.notes ?? "—"}</span> },
  { key: "photos", label: "Ảnh", weight: 8, render: log => log.photos.length
    ? <span className="inline-flex items-center gap-2 whitespace-nowrap"><Image src={logPhotoSrc(log.id, log.zoneId, 0)} alt="" width={32} height={32} unoptimized className="size-8 rounded object-cover" />{log.photos.length}</span> : "—" },
  { key: "recordedBy", label: "Người ghi", weight: 12, sort: "recordedBy", render: log => <span className={styles.truncated} title={log.recordedByName ?? undefined}>{log.recordedByName ?? "—"}</span> },
  { key: "recordedAt", label: "Thời gian ghi", weight: 14, sort: "recordedAt", render: log => <span className={styles.truncated}>{when(log.recordedAt)}</span> },
];

/** The care log list: fixed layout so the columns never run into each other (a narrow window scrolls sideways), headers sort on the server, a row opens the log. */
export function LogsTable({ items, visible, sort, onSort, onOpen }: {
  items: readonly LogPageItem[]; visible: readonly string[]; sort: SortState; onSort(next: SortState): void; onOpen(log: LogPageItem): void;
}) {
  const columns = logColumns.filter(column => visible.includes(column.key)), weight = columns.reduce((total, column) => total + column.weight, 0);
  return <table className={styles.table} style={{ minWidth: Math.max(480, columns.length * 120) }}>
    <colgroup>{columns.map(column => <col key={column.key} style={{ width: `${column.weight / weight * 100}%` }} />)}</colgroup>
    <thead><tr>{columns.map(column => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} />)}</tr></thead>
    <tbody>{items.map(log => <OpenableTableRow key={log.id} onOpen={() => onOpen(log)}>
      {columns.map(column => <td key={column.key} data-label={column.label}>{column.render(log, () => onOpen(log))}</td>)}
    </OpenableTableRow>)}</tbody>
  </table>;
}
