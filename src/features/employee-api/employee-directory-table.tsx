"use client";
import { Fragment, useCallback, useRef, useState, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { StatusPill } from "@/components/ui/management-page";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { accountLabel, employmentLabel, employeeTypeLabel, dateLabel } from "./employee-editor-model";
import { EmployeeDetailPanel } from "./employee-detail-panel";
import type { EmployeeDetailCache } from "./use-employee-detail";
import type { Employee } from "./contracts";
import styles from "./employee-directory.module.css";

export type EmployeeLeaveGuard = (leave: () => void) => void;
type Column = { key: string; label: string; weight: number; sort?: string; defaultHidden?: boolean; render(row: EmployeeListItemDto): ReactNode };
const text = (value: string, className = "") => <span className={`${styles.truncated} ${className}`} title={value}>{value || "—"}</span>;
export const employeeColumns: readonly Column[] = [
  { key: "code", label: "Mã nhân viên", weight: 15, sort: "code", render: row => text(row.code, "font-mono tabular-nums") },
  { key: "name", label: "Họ và tên", weight: 22, sort: "name", render: row => text(row.fullName, styles.name) },
  { key: "phone", label: "Số điện thoại", weight: 17, sort: "phone", render: row => text(row.phoneNumber ?? "—") },
  { key: "type", label: "Loại nhân viên", weight: 20, sort: "type", render: row => <span className={styles.typeChip} title={employeeTypeLabel(row.employeeType)}>{employeeTypeLabel(row.employeeType)}</span> },
  { key: "jobs", label: "Loại công việc", weight: 20, defaultHidden: true, render: row => text(row.jobTypes.map(job => job.name).join(", ")) },
  { key: "zones", label: "Vùng làm việc", weight: 20, render: row => <span className={styles.truncated} title={row.workingZones.map(zone => `${zone.code} · ${zone.name}`).join(", ")}>{row.workingZones.map(zone => zone.code).join(", ") || "—"}</span> },
  { key: "account", label: "Tài khoản", weight: 22, defaultHidden: true, render: row => row.account ? <>{text(`@${row.account.username}`)}<small className={styles.meta}>{accountLabel(row.account.status)}</small></> : <span className={styles.meta}>Chưa có tài khoản</span> },
  { key: "status", label: "Tình trạng", weight: 21, sort: "status", render: row => <><span className={styles.status} title={employmentLabel(row.status)}><StatusPill tone={row.status === "Employed" ? "success" : "neutral"}>{employmentLabel(row.status)}</StatusPill></span>{row.status === "Left" && row.lastWorkingDay && <small className={styles.meta} title={`Ngày làm cuối: ${dateLabel(row.lastWorkingDay)}`}>{dateLabel(row.lastWorkingDay)}</small>}</> },
  { key: "lastDay", label: "Ngày làm cuối", weight: 17, sort: "lastWorkingDay", defaultHidden: true, render: row => text(row.lastWorkingDay ? dateLabel(row.lastWorkingDay) : "—") },
];
export const defaultEmployeeColumns = employeeColumns.filter(column => !column.defaultHidden).map(column => column.key);

/** Pointer row opening supplements a native chevron button; rows add no extra keyboard stop. */
export function EmployeeDirectoryTable({ items, disabled, cache, onSaved, detailRevision = 0, visible = defaultEmployeeColumns, zones = [], jobTypes = [], lookupsReady = false, onGuardChange, initialExpandedId, sort, onSort, selection }: {
  items: EmployeeListItemDto[]; disabled: boolean; onOpen?(id: string): void; cache: EmployeeDetailCache; onSaved(employee: Employee): void; detailRevision?: number;
  visible?: readonly string[]; zones?: ApiRecord[]; jobTypes?: { id: string; name: string }[]; lookupsReady?: boolean;
  onGuardChange?(guard: EmployeeLeaveGuard | undefined): void; initialExpandedId?: string;
  /** Server-side order; without `onSort` the headers are plain. */
  sort?: SortState; onSort?(next: SortState): void;
  /** Row checkboxes; selecting never opens a row. */
  selection?: { selected: ReadonlySet<string>; onToggle(id: string, on: boolean): void; onToggleAll(on: boolean): void };
}) {
  const [expandedId, setExpandedId] = useState<string | undefined>(initialExpandedId);
  const guard = useRef<EmployeeLeaveGuard | undefined>(undefined);
  const registerGuard = useCallback((next: EmployeeLeaveGuard | undefined) => { guard.current = next; onGuardChange?.(next); }, [onGuardChange]);
  const columns = employeeColumns.filter(column => visible.includes(column.key));
  const weight = columns.reduce((total, column) => total + column.weight, 0);
  // Fixed columns (chevron, checkbox) are taken off the proportional ones.
  const fixed = selection ? 56 : 28, span = columns.length + (selection ? 2 : 1);
  const allSelected = !!selection && items.length > 0 && items.every(row => selection.selected.has(row.id));
  function toggle(id: string) {
    const leave = () => setExpandedId(current => current === id ? undefined : id);
    if (guard.current) guard.current(leave); else leave();
  }
  return <table className={styles.table}>
    <colgroup>{selection && <col style={{ width: 28 }} />}<col style={{ width: 28 }} />{columns.map(column => <col key={column.key} style={{ width: `calc(${column.weight / weight * 100}% - ${column.weight / weight * fixed}px)` }} />)}</colgroup>
    <thead><tr>
      {selection && <th scope="col" className={styles.checkCell}><input type="checkbox" aria-label="Chọn tất cả trên trang" checked={allSelected} onChange={event => selection.onToggleAll(event.target.checked)} /></th>}
      <th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map(column => onSort && sort ? <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} /> : <th key={column.key} scope="col" title={column.label}>{column.label}</th>)}
    </tr></thead>
    <tbody>{items.map(row => <Fragment key={row.id}>
      <OpenableTableRow disabled={disabled} data-selected={expandedId === row.id || undefined} onOpen={() => toggle(row.id)}>
        {selection && <td className={styles.checkCell}><input type="checkbox" aria-label={`Chọn ${row.fullName}`} checked={selection.selected.has(row.id)} onChange={event => selection.onToggle(row.id, event.target.checked)} /></td>}
        <td className={styles.expandCell}><button type="button" disabled={disabled} aria-expanded={expandedId === row.id} aria-controls={`employee-preview-${row.id}`} aria-label={`${expandedId === row.id ? "Thu gọn" : "Mở"} ${row.fullName}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expandedId === row.id ? "chevron-down" : "chevron-right"} /></button></td>
        {columns.map(column => <td key={column.key} data-label={column.label}>{column.render(row)}</td>)}
      </OpenableTableRow>
      {expandedId === row.id && <tr><td colSpan={span} className={styles.detailCell}><div className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>
        <EmployeeDetailPanel id={row.id} cache={cache} onSaved={onSaved} revision={detailRevision} zones={zones} jobTypes={jobTypes} lookupsReady={lookupsReady} onGuardChange={registerGuard} payroll />
      </div></td></tr>}
    </Fragment>)}</tbody>
  </table>;
}

