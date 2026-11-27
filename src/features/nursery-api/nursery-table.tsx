"use client";
import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import styles from "@/features/farming-management/farming-management.module.css";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { nurseryStatusText, nurseryStatusTone, quantityText, type NurseryRow } from "./contracts";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";
import { seedLotsHref } from "@/features/input-items/stock-kind";

/** Survivors are counted by eye when the nursery is completed, so they and the loss are estimates; the short header says so with a star. */
const estimateTitle = "Số ước tính: sống sót đếm bằng mắt khi hoàn tất ươm";

type Column = { key: string; label: string; title?: string; sort?: string; defaultHidden?: boolean; render(row: NurseryRow): ReactNode };
export const nurseryColumns: readonly Column[] = [
  { key: "code", label: "Mã đợt ươm", sort: "code", render: row => <strong className={styles.name}>{row.code}</strong> },
  // Hidden while one zone is listed (it would repeat on every row); the screen shows it by itself whenever several zones are listed.
  { key: "zone", label: "Vùng ươm", defaultHidden: true, render: row => `${row.zoneCode} · ${row.zoneName}` },
  // The lot opens on the Lô giống screen by its code (PN000028-1), not on this list.
  { key: "lot", label: "Lô giống", render: row => <>{row.seedLotCode ? <Link className="whitespace-nowrap text-primary underline" href={seedLotsHref(row.seedLotCode)}>{row.seedLotCode}</Link> : "—"}{row.itemName && <small className="block truncate text-xs text-text-muted" title={row.itemName}>{row.itemName}</small>}</> },
  { key: "quantityIn", label: "Vào ươm", sort: "quantityIn", render: row => quantityText(row.quantityIn) },
  { key: "survivors", label: "Sống sót*", title: estimateTitle, render: row => quantityText(row.survivors) },
  { key: "seeded", label: "Đã thả", render: row => row.statusId === 4001 || row.statusId === 4003 ? "—" : quantityText(row.seeded) },
  { key: "remaining", label: "Còn lại", render: row => row.statusId === 4002 && row.remaining === 0 ? "Đã thả hết" : row.statusId === 4001 || row.statusId === 4003 ? "—" : quantityText(row.remaining) },
  { key: "lossPieces", label: "Hao hụt*", title: estimateTitle, defaultHidden: true, render: row => quantityText(row.lossPieces) },
  { key: "startDate", label: "Ngày bắt đầu", sort: "startDate", render: row => formatVietnameseDate(row.startDate) },
  { key: "days", label: "Số ngày ươm", render: row => `${row.daysNursing} ngày` },
  { key: "status", label: "Trạng thái", sort: "status", render: row => <StatusPill tone={nurseryStatusTone(row.statusId)}>{nurseryStatusText(row)}</StatusPill> },
];
export const defaultNurseryColumns = nurseryColumns.filter(column => !column.defaultHidden).map(column => column.key);
export function NurseryTable({ rows, visible, sort, onSort, expanded, onToggle, detail }: {
  rows: readonly NurseryRow[]; visible: readonly string[]; sort: SortState; onSort(sort: SortState): void; expanded?: string; onToggle(id: string): void; detail(row: NurseryRow): ReactNode;
}) {
  const columns = nurseryColumns.filter(column => visible.includes(column.key));
  return <table className={styles.table} style={{ minWidth: 850 }}><thead><tr><th scope="col" className={styles.expandCell}><span className="sr-only">Mở chi tiết</span></th>{columns.map(column => <SortableHeader key={column.key} label={column.label} title={column.title} sortKey={column.sort} sort={sort} onSort={onSort} />)}</tr></thead>
    <tbody>{rows.map(row => <Fragment key={row.id}><OpenableTableRow data-selected={expanded === row.id || undefined} onOpen={() => onToggle(row.id)}>
      <td className={styles.expandCell}><button key={`toggle-${row.id}`} type="button" aria-expanded={expanded === row.id} aria-controls={`nursery-detail-${row.id}`} aria-label={`${expanded === row.id ? "Thu gọn" : "Mở"} ${row.code}`} onClick={() => onToggle(row.id)}><InterfaceIcon name={expanded === row.id ? "chevron-down" : "chevron-right"} /></button></td>
      {columns.map(column => <td key={column.key}>{column.render(row)}</td>)}
    </OpenableTableRow>{expanded === row.id && <DetailRow colSpan={columns.length + 1} className={styles.detailCell}><div id={`nursery-detail-${row.id}`} className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>{detail(row)}</div></DetailRow>}</Fragment>)}</tbody>
  </table>;
}
