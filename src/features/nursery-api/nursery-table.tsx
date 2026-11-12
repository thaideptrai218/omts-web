"use client";
import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { nurseryStatus, quantityText, type NurseryRow } from "./contracts";

type Column = { key: string; label: string; sort?: string; render(row: NurseryRow): ReactNode };
export const nurseryColumns: readonly Column[] = [
  { key: "code", label: "Mã đợt ươm", sort: "code", render: row => <strong className={styles.name}>{row.code}</strong> },
  { key: "zone", label: "Vùng nuôi", render: row => `${row.zoneCode} · ${row.zoneName}` },
  { key: "lot", label: "Lô giống", render: row => <Link className="text-primary underline" href={`/farming/nursery?${new URLSearchParams({ code: row.code, zoneId: row.zoneId })}`}>{row.seedLotCode ?? "Xem lô giống"}</Link> },
  { key: "quantityIn", label: "Số mảnh vào", sort: "quantityIn", render: row => quantityText(row.quantityIn) },
  { key: "startDate", label: "Ngày bắt đầu", sort: "startDate", render: row => formatVietnameseDate(row.startDate) },
  { key: "days", label: "Số ngày ươm", render: row => `${row.daysNursing} ngày` },
  { key: "status", label: "Trạng thái", sort: "status", render: row => <StatusPill tone={row.statusId === 4001 ? "neutral" : row.statusId === 4002 ? "success" : "danger"}>{nurseryStatus(row.statusId)}</StatusPill> },
];
export function NurseryTable({ rows, visible, sort, onSort, expanded, onToggle, detail }: {
  rows: readonly NurseryRow[]; visible: readonly string[]; sort: SortState; onSort(sort: SortState): void; expanded?: string; onToggle(id: string): void; detail(row: NurseryRow): ReactNode;
}) {
  const columns = nurseryColumns.filter(column => visible.includes(column.key));
  return <table className={styles.table} style={{ minWidth: 850 }}><thead><tr><th scope="col" className={styles.expandCell}><span className="sr-only">Mở chi tiết</span></th>{columns.map(column => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} />)}</tr></thead>
    <tbody>{rows.map(row => <Fragment key={row.id}><OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => onToggle(row.id)}>
      <td className={styles.expandCell}><button type="button" aria-expanded={expanded === row.id} aria-controls={`nursery-detail-${row.id}`} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => onToggle(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
      {columns.map(column => <td key={column.key}>{column.render(row)}</td>)}
    </OpenableTableRow>{expanded === row.id && <tr><td colSpan={columns.length + 1} className={styles.detailCell}><div id={`nursery-detail-${row.id}`} className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>{detail(row)}</div></td></tr>}</Fragment>)}</tbody>
  </table>;
}
