"use client";
import { Fragment, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { StatusPill } from "@/components/ui/management-page";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { stateLabel } from "@/features/farming-api/contracts";
import { displayTime } from "@/features/operations/ui";
import type { ZoneOverviewItem } from "@/features/water-overview/contracts";
import type { UnsavedGuard } from "@/features/farming-management/use-unsaved-guard";
import styles from "@/features/farming-management/farming-management.module.css";
import { ZoneDetailPanel, type ZoneAccess } from "./zone-detail-panel";
import { IN_USE, zoneStatusLabel, type ZoneRow, type ZoneSortKey } from "./zone-model";

/** `water` is the zone-id lookup of the water overview, present only while its column is shown and loaded. */
type Column = { key: ZoneSortKey; label: string; weight: number; render(row: ZoneRow, water?: ReadonlyMap<string, ZoneOverviewItem>): ReactNode; licenseOnly?: boolean; waterOnly?: boolean; numeric?: boolean };
const text = (value: string | null, className = "") => <span className={`${styles.truncated} ${className}`} title={value ?? undefined}>{value || "—"}</span>;
export const zoneColumns: readonly Column[] = [
  { key: "code", label: "Mã vùng", weight: 14, render: row => text(row.code, styles.name) },
  { key: "name", label: "Tên vùng", weight: 24, render: row => text(row.name) },
  { key: "location", label: "Vị trí", weight: 28, render: row => text(row.location) },
  { key: "area", label: "Diện tích (ha)", weight: 14, numeric: true, render: row => row.area === null ? "—" : row.area.toLocaleString("vi-VN") },
  { key: "rafts", label: "Bè đang dùng", weight: 14, numeric: true, render: row => row.inUseRaftCount },
  { key: "license", label: "Hồ sơ giấy phép", weight: 20, licenseOnly: true, render: row => text(row.licenseState ? stateLabel(row.licenseState) : "Thiếu hồ sơ") },
  { key: "water", label: "Phép đo nước gần nhất", weight: 22, waterOnly: true, render: (row, water) => {
    const item = water?.get(row.id);
    return !item ? "—" : item.latestMeasuredAt ? <span className={styles.truncated}>{displayTime(item.latestMeasuredAt)}{item.hasWaterAlert ? " · có cảnh báo" : ""}</span> : "Chưa có phép đo";
  } },
  { key: "status", label: "Trạng thái", weight: 18, render: row => <StatusPill tone={row.statusId === IN_USE ? "success" : "neutral"}>{zoneStatusLabel(row.statusId)}</StatusPill> },
];

/** Sortable zone list; a row opens its record in place, one at a time, through the screen's unsaved-changes guard. */
export function ZoneTable({ rows, visible, sort, onSort, expandedId, onToggle, canLicense, canWater, water, accessFor, guard, zones, onChanged }: {
  rows: readonly ZoneRow[]; visible: readonly string[]; sort: SortState; onSort(next: SortState): void; expandedId?: string; onToggle(id: string): void;
  canLicense: boolean; canWater: boolean; water?: ReadonlyMap<string, ZoneOverviewItem>; accessFor(zoneId: string): ZoneAccess; guard: UnsavedGuard; zones: ApiRecord[]; onChanged(): void;
}) {
  const columns = zoneColumns.filter(column => visible.includes(column.key) && (!column.licenseOnly || canLicense) && (!column.waterOnly || canWater));
  const weight = columns.reduce((total, column) => total + column.weight, 0);
  return <table className={styles.table}>
    <colgroup><col style={{ width: 28 }} />{columns.map(column => <col key={column.key} style={{ width: `calc(${column.weight / weight * 100}% - ${column.weight / weight * 28}px)` }} />)}</colgroup>
    <thead><tr><th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map(column => <SortableHeader key={column.key} label={column.label} sortKey={column.key} sort={sort} onSort={onSort} className={column.numeric ? styles.number : undefined} />)}</tr></thead>
    <tbody>{rows.map(row => <Fragment key={row.id}>
      <OpenableTableRow id={`zone-row-${row.id}`} data-selected={expandedId === row.id || undefined} onOpen={() => onToggle(row.id)}>
        <td className={styles.expandCell}><button type="button" aria-expanded={expandedId === row.id} aria-controls={`zone-preview-${row.id}`} aria-label={`${expandedId === row.id ? "Thu gọn" : "Mở"} ${row.name}`} onClick={() => onToggle(row.id)}><InterfaceIcon name={expandedId === row.id ? "chevron-down" : "chevron-right"} /></button></td>
        {columns.map(column => <td key={column.key} data-label={column.label} className={column.numeric ? styles.number : undefined}>{column.render(row, water)}</td>)}
      </OpenableTableRow>
      {expandedId === row.id && <tr><td colSpan={columns.length + 1} className={styles.detailCell}><div className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>
        <ZoneDetailPanel id={row.id} access={accessFor(row.id)} guard={guard} zones={zones} onChanged={onChanged} />
      </div></td></tr>}
    </Fragment>)}</tbody>
  </table>;
}
