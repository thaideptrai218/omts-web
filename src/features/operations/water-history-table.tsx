"use client";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import styles from "@/features/farming-management/farming-management.module.css";
import { displayTime, statusLabel } from "./ui";
import { isOutside, type WaterRow, type WaterSortKey, type WaterZoneRef } from "./water-history-model";
import { WaterMeasurementPanel } from "./water-measurement-panel";
import { formatMeasuredValue } from "./water-measurement-shared";

type Column = { key: string; label: string; weight: number; sort?: WaterSortKey; numeric?: boolean; render(row: WaterRow, zone: WaterZoneRef): ReactNode };

export const waterColumns: readonly Column[] = [
  { key: "time", label: "Thời điểm đo", weight: 17, sort: "time", render: row => <span className={`${styles.truncated} ${styles.name}`}>{displayTime(row.measuredAt)}</span> },
  { key: "zone", label: "Vùng", weight: 15, render: (_, zone) => <Link className={`${styles.truncated} ${styles.link}`} title={zone.name} href={`/workspace/zones?recordId=${encodeURIComponent(zone.id)}&search=${encodeURIComponent(zone.code)}`}>{zone.name}</Link> },
  { key: "raft", label: "Bè", weight: 9, sort: "raft", render: row => <span className={styles.truncated} title={row.raftCode}>{row.raftCode}</span> },
  { key: "ph", label: "pH", weight: 8, sort: "ph", numeric: true, render: row => formatMeasuredValue(row.ph) },
  { key: "salinity", label: "Độ mặn (‰)", weight: 11, sort: "salinity", numeric: true, render: row => formatMeasuredValue(row.salinity) },
  { key: "temperature", label: "Nhiệt độ (°C)", weight: 12, sort: "temperature", numeric: true, render: row => formatMeasuredValue(row.temperature) },
  { key: "alert", label: "Cảnh báo", weight: 14, sort: "alert", render: row => <StatusPill tone={isOutside(row) ? "danger" : "neutral"}>{isOutside(row) ? "Vượt ngưỡng" : "Trong ngưỡng"}</StatusPill> },
  { key: "status", label: "Trạng thái", weight: 12, sort: "status", render: row => <StatusPill tone={row.statusCode === "ACTIVE" ? "success" : "neutral"}>{statusLabel(row.statusCode)}</StatusPill> },
  { key: "by", label: "Người ghi", weight: 16, sort: "by", render: row => <span className={styles.truncated} title={row.measuredBy?.name}>{row.measuredBy?.name ?? "—"}</span> },
];

/** Sortable measurement list of the chosen zone; a row opens its record in place, one at a time, through the unsaved-changes guard. */
export function WaterHistoryTable({ rows, visible, sort, onSort, expandedId, onToggle, zone, canEdit, guard, onChanged }: {
  rows: readonly WaterRow[]; visible: readonly string[]; sort: SortState; onSort(next: SortState): void; expandedId?: string; onToggle(id: string): void;
  zone: WaterZoneRef; canEdit: boolean; guard: UnsavedGuard; onChanged(notice: string): void;
}) {
  const columns = waterColumns.filter(column => visible.includes(column.key));
  const weight = columns.reduce((total, column) => total + column.weight, 0);
  return <table className={styles.table}>
    <colgroup><col style={{ width: 28 }} />{columns.map(column => <col key={column.key} style={{ width: `calc(${column.weight / weight * 100}% - ${column.weight / weight * 28}px)` }} />)}</colgroup>
    <thead><tr><th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map(column => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} className={column.numeric ? styles.number : undefined} />)}</tr></thead>
    <tbody>{rows.map(row => <Fragment key={row.id}>
      <OpenableTableRow id={`water-row-${row.id}`} data-selected={expandedId === row.id || undefined} onOpen={() => onToggle(row.id)}>
        <td className={styles.expandCell}><button type="button" aria-expanded={expandedId === row.id} aria-controls={`water-preview-${row.id}`} aria-label={`${expandedId === row.id ? "Thu gọn" : "Mở"} phép đo ${displayTime(row.measuredAt)}`} onClick={() => onToggle(row.id)}><InterfaceIcon name={expandedId === row.id ? "chevron-down" : "chevron-right"} /></button></td>
        {columns.map(column => <td key={column.key} data-label={column.label} className={column.numeric ? styles.number : undefined}>{column.render(row, zone)}</td>)}
      </OpenableTableRow>
      {expandedId === row.id && <tr><td colSpan={columns.length + 1} className={styles.detailCell}><div className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>
        <WaterMeasurementPanel id={row.id} zone={zone} canEdit={canEdit} guard={guard} onChanged={onChanged} />
      </div></td></tr>}
    </Fragment>)}</tbody>
  </table>;
}
