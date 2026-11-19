"use client";
import { Fragment, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import styles from "@/features/farming-management/farming-management.module.css";
import { RaftDetailPanel, type RaftAccess } from "./raft-detail-panel";
import { CycleLiveCell, LaneLiveCell } from "./raft-list-live-cells";
import type { RaftListLiveState } from "./use-raft-list-live";
import { IN_USE, raftStatusLabel, type RaftRow, type RaftSortKey } from "./raft-model";

type LiveContext = { state?: RaftListLiveState; enabled: boolean };
type Column = { key: string; label: string; weight: number; sort?: RaftSortKey; numeric?: boolean; render(row: RaftRow, live: LiveContext): ReactNode };
const coordinate = (value: number | null | undefined) => value === null || value === undefined ? "—" : String(value);
export const raftColumns: readonly Column[] = [
  { key: "code", label: "Mã bè", weight: 13, sort: "code", render: row => <span className={`${styles.truncated} ${styles.name}`} title={row.code}>{row.code}</span> },
  { key: "lanes", label: "Số làn", weight: 8, sort: "lanes", numeric: true, render: row => row.laneCount ?? "—" },
  { key: "live", label: "Tình trạng làn", weight: 36, render: (_row, live) => <LaneLiveCell live={live.state} enabled={live.enabled} /> },
  { key: "cycle", label: "Chu kỳ nuôi", weight: 22, render: (_row, live) => <CycleLiveCell live={live.state} enabled={live.enabled} /> },
  { key: "latitude", label: "Vĩ độ", weight: 14, numeric: true, render: row => coordinate(row.latitude) },
  { key: "longitude", label: "Kinh độ", weight: 14, numeric: true, render: row => coordinate(row.longitude) },
  { key: "status", label: "Trạng thái", weight: 18, sort: "status", render: row => <StatusPill tone={row.statusId === IN_USE ? "success" : "neutral"}>{raftStatusLabel(row.statusId)}</StatusPill> },
];

/** Sortable raft list of the chosen zone; a row opens its record in place, one at a time, through the unsaved-changes guard. */
export function RaftTable({ rows, live, visible, sort, onSort, expandedId, onToggle, zoneId, zoneLabel, access, guard, onChanged }: {
  rows: readonly RaftRow[]; live: Record<string, RaftListLiveState>; visible: readonly string[]; sort: SortState; onSort(next: SortState): void; expandedId?: string; onToggle(id: string): void;
  zoneId: string; zoneLabel: string; access: RaftAccess; guard: UnsavedGuard; onChanged(): void;
}) {
  const columns = raftColumns.filter(column => visible.includes(column.key));
  const weight = columns.reduce((total, column) => total + column.weight, 0);
  return <table className={styles.table}>
    <colgroup><col style={{ width: 28 }} />{columns.map(column => <col key={column.key} style={{ width: `calc(${column.weight / weight * 100}% - ${column.weight / weight * 28}px)` }} />)}</colgroup>
    <thead><tr><th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map(column => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} className={column.numeric ? styles.number : undefined} />)}</tr></thead>
    <tbody>{rows.map(row => <Fragment key={row.id}>
      <OpenableTableRow id={`raft-row-${row.id}`} data-selected={expandedId === row.id || undefined} onOpen={() => onToggle(row.id)}>
        <td className={styles.expandCell}><button type="button" aria-expanded={expandedId === row.id} aria-controls={`raft-preview-${row.id}`} aria-label={`${expandedId === row.id ? "Thu gọn" : "Mở"} bè ${row.code}`} onClick={() => onToggle(row.id)}><InterfaceIcon name={expandedId === row.id ? "chevron-down" : "chevron-right"} /></button></td>
        {columns.map(column => <td key={column.key} data-label={column.label} className={column.numeric ? styles.number : undefined}>{column.render(row, { state: live[row.id], enabled: access.cycles })}</td>)}
      </OpenableTableRow>
      {expandedId === row.id && <tr><td colSpan={columns.length + 1} className={styles.detailCell}><div className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>
        <RaftDetailPanel id={row.id} zoneId={zoneId} zoneLabel={zoneLabel} access={access} guard={guard} onChanged={onChanged} />
      </div></td></tr>}
    </Fragment>)}</tbody>
  </table>;
}
