"use client";
import Link from "next/link";
import { farmingReferenceHref } from "@/features/farming-management/farming-reference-href";
import { Fragment, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { cycleStateLabel, cycleStateOf, raftStatusLabel, type CycleRow, type CycleSortKey } from "./cycle-model";

type Column = { key: string; label: string; weight: number; sort: CycleSortKey; render(row: CycleRow): ReactNode };
export const cycleColumns: readonly Column[] = [
  { key: "raft", label: "Bè nuôi", weight: 24, sort: "raft", render: row => <><span className={`${styles.truncated} ${styles.name}`} title={row.raftCode}>{row.raftCode}</span><small className={styles.meta}>{row.laneCount} làn nuôi{row.cycle && !row.cycle.closeDate && row.cycle.productName ? ` · ${row.cycle.productName}` : ""}</small></> },
  { key: "raftStatus", label: "Trạng thái bè", weight: 20, sort: "raftStatus", render: row => raftStatusLabel(row.raftStatusId) },
  { key: "state", label: "Chu kỳ gần nhất", weight: 22, sort: "state", render: row => <StatusPill tone={cycleStateOf(row) === "open" ? "success" : "neutral"}>{cycleStateLabel(cycleStateOf(row))}</StatusPill> },
  { key: "start", label: "Ngày bắt đầu", weight: 17, sort: "start", render: row => row.cycle ? formatVietnameseDate(row.cycle.startDate) : "—" },
  { key: "close", label: "Ngày đóng", weight: 17, sort: "close", render: row => row.cycle?.closeDate ? formatVietnameseDate(row.cycle.closeDate) : "—" },
];

/** One row per raft of the chosen zone with its latest cycle; a row opens the raft's record in place (`renderDetail`). */
export function CycleTable({ zoneId, rows, visible, sort, onSort, expandedId, onToggle, renderDetail }: {
  zoneId?: string; rows: readonly CycleRow[]; visible: readonly string[]; sort: SortState; onSort(next: SortState): void; expandedId?: string; onToggle(id: string): void;
  renderDetail(row: CycleRow): ReactNode;
}) {
  const columns = cycleColumns.filter(column => visible.includes(column.key));
  const weight = columns.reduce((total, column) => total + column.weight, 0);
  return <table className={styles.table}>
    <colgroup><col style={{ width: 28 }} />{columns.map(column => <col key={column.key} style={{ width: `calc(${column.weight / weight * 100}% - ${column.weight / weight * 28}px)` }} />)}</colgroup>
    <thead><tr><th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map(column => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} />)}</tr></thead>
    <tbody>{rows.map(row => <Fragment key={row.raftId}>
      <OpenableTableRow id={`cycle-row-${row.raftId}`} data-selected={expandedId === row.raftId || undefined} onOpen={() => onToggle(row.raftId)}>
        <td className={styles.expandCell}><button type="button" aria-expanded={expandedId === row.raftId} aria-controls={`cycle-preview-${row.raftId}`} aria-label={`${expandedId === row.raftId ? "Thu gọn" : "Xem"} bè ${row.raftCode}`} onClick={() => onToggle(row.raftId)}><InterfaceIcon name={expandedId === row.raftId ? "chevron-down" : "chevron-right"} /></button></td>
        {columns.map(column => <td key={column.key} data-label={column.label}>{column.key === "raft" ? <Link className={styles.link} href={farmingReferenceHref("raft", { zoneId, recordId: row.raftId, search: row.raftCode })}>{column.render(row)}</Link> : column.render(row)}</td>)}
      </OpenableTableRow>
      {expandedId === row.raftId && <tr><td colSpan={columns.length + 1} className={styles.detailCell}><div className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>
        {renderDetail(row)}
      </div></td></tr>}
    </Fragment>)}</tbody>
  </table>;
}
