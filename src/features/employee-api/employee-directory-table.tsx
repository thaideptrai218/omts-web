"use client";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { StatusPill } from "@/components/ui/management-page";
import { formatVndWithSymbol } from "@/shared/format/vnd";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { accountLabel, dateLabel, employeeTypeLabel, employmentLabel, genderLabel } from "./employee-editor-model";
import { EmployeeDetailPanel } from "./employee-detail-panel";
import { EmployeeAvatar } from "./employee-info-tab";
import { salaryTypeLabel } from "./employee-salary-model";
import type { EmployeeDetailCache } from "./use-employee-detail";
import type { Employee } from "./contracts";
import type { EmployeeViewerAccess } from "./employee-viewer-access";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";
import { fitColumns, usernameColumnWidth } from "./employee-column-fit";
import styles from "./employee-directory.module.css";

type Row = EmployeeListItemDto;
/**
 * `field`: the list row key the column reads; a column whose key no loaded row carries is not offered, so a column is never a wall of dashes
 * (the backend sends personal fields in the list only to who may maintain the employee).
 * `keep`: stays beside an open detail pane (photo, code and name identify the row there).
 */
type Column = { key: string; label: string; width: number; sort?: string; defaultHidden?: boolean; field?: keyof Row; keep?: boolean; render(row: Row): ReactNode };

const text = (value: string | null | undefined, className = "") => <span className={`${styles.truncated} ${className}`} title={value ?? ""}>{value || "—"}</span>;
const addressOf = (row: Row) => [row.address, row.ward, row.area].filter(Boolean).join(", ");

export const employeeColumns: readonly Column[] = [
  { key: "photo", label: "Ảnh", width: 56, keep: true, render: row => <EmployeeAvatar name={row.fullName} photoUrl={row.photoUrl} className={styles.avatar} /> },
  { key: "code", label: "Mã nhân viên", width: 112, sort: "code", keep: true, render: row => text(row.code, "font-mono tabular-nums") },
  { key: "name", label: "Tên nhân viên", width: 190, sort: "name", keep: true, render: row => text(row.fullName, styles.name) },
  { key: "phone", label: "Số điện thoại", width: 118, sort: "phone", render: row => text(row.phoneNumber) },
  { key: "idNumber", label: "Số CMND/CCCD", width: 130, field: "idNumber", render: row => text(row.idNumber) },
  { key: "type", label: "Loại", width: 90, sort: "type", render: row => text(row.employeeType ? employeeTypeLabel(row.employeeType) : null) },
  { key: "zones", label: "Vùng làm việc", width: 130, render: row => <span className={styles.wrap} title={row.workingZones.map(zone => `${zone.code} · ${zone.name}`).join(", ")}>{row.workingZones.map(zone => zone.code).join(", ") || "—"}</span> },
  { key: "salaryType", label: "Loại lương", width: 112, render: row => <span className={row.salaryType ? undefined : styles.meta}>{salaryTypeLabel(row.salaryType)}</span> },
  { key: "debt", label: "Nợ và tạm ứng", width: 120, render: row => <span className={styles.debt} title="Tổng phiếu lương đã chốt còn chưa trả">{typeof row.outstandingWage === "number" ? formatVndWithSymbol(row.outstandingWage) : "—"}</span> },
  { key: "notes", label: "Ghi chú", width: 150, field: "notes", render: row => text(row.notes) },
  { key: "birthday", label: "Ngày sinh", width: 100, defaultHidden: true, field: "birthday", render: row => text(row.birthday ? dateLabel(row.birthday) : null) },
  { key: "gender", label: "Giới tính", width: 90, defaultHidden: true, field: "gender", render: row => text(genderLabel(row.gender) || null) },
  { key: "address", label: "Địa chỉ", width: 220, defaultHidden: true, field: "address", render: row => text(addressOf(row)) },
  { key: "startDate", label: "Ngày bắt đầu làm việc", width: 150, defaultHidden: true, field: "startDate", render: row => text(row.startDate ? dateLabel(row.startDate) : null) },
  { key: "lastDay", label: "Ngày làm cuối", width: 116, sort: "lastWorkingDay", defaultHidden: true, render: row => text(row.lastWorkingDay ? dateLabel(row.lastWorkingDay) : null) },
  // The backend cannot sort by login name, so this header is plain.
  { key: "username", label: "Tài khoản đăng nhập", width: 160, defaultHidden: true, render: row => row.account
    ? <span className={styles.accountLink} data-locked={row.account.status === "Active" ? undefined : ""} title={`@${row.account.username} · ${accountLabel(row.account.status)}`}>@{row.account.username}</span> : <span className={styles.meta}>—</span> },
  { key: "status", label: "Tình trạng", width: 132, sort: "status", keep: true, render: row => <><span className={styles.status} title={employmentLabel(row.status)}><StatusPill tone={row.status === "Employed" ? "success" : "neutral"}>{employmentLabel(row.status)}</StatusPill></span>{row.status === "Left" && row.lastWorkingDay && <small className={styles.meta} title={`Ngày làm cuối: ${dateLabel(row.lastWorkingDay)}`}>{dateLabel(row.lastWorkingDay)}</small>}</> },
];
export const defaultEmployeeColumns = employeeColumns.filter(column => !column.defaultHidden).map(column => column.key);

/** Whether some loaded row carries the key (null counts: the backend sent it, the employee has no value). */
export const columnAvailable = (column: Column, items: readonly Row[]) => !column.field || items.some(row => row[column.field!] !== undefined);

/** Pointer row opening supplements a native chevron button; rows add no extra keyboard stop. */
export function EmployeeDirectoryTable({ items, disabled, cache, detailRevision = 0, visible = defaultEmployeeColumns, access, initialExpandedId, sort, onSort, selection, onEdit, onChanged, onSalarySaved }: {
  items: Row[]; disabled: boolean; cache: EmployeeDetailCache; detailRevision?: number; visible?: readonly string[];
  /** What the viewer may open in a profile. */
  access: EmployeeViewerAccess; initialExpandedId?: string;
  /** Server-side order; without `onSort` the headers are plain. */
  sort?: SortState; onSort?(next: SortState): void;
  /** Row checkboxes; selecting never opens a row. */
  selection?: { selected: ReadonlySet<string>; onToggle(id: string, on: boolean): void; onToggleAll(on: boolean): void };
  onEdit(employee: Employee): void; onChanged(employee: Employee, note?: string): void; onSalarySaved(): void;
}) {
  const [expandedId, setExpandedId] = useState<string | undefined>(initialExpandedId);
  // Fixed columns (chevron, checkbox) are taken off the width the others may use.
  const fixed = selection ? 56 : 28;
  // Width of the pane the table sits in; 0 until measured. Columns that do not fit are dropped (least important first) instead of truncating text or showing a scrollbar.
  const tableRef = useRef<HTMLTableElement>(null), [available, setAvailable] = useState(0);
  useEffect(() => {
    const pane = tableRef.current?.parentElement;
    if (!pane || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setAvailable(pane.clientWidth));
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);
  const usernameWidth = usernameColumnWidth(items.flatMap(row => row.account ? [`@${row.account.username}`] : []));
  const widthOf = (key: string) => key === "username" ? usernameWidth : employeeColumns.find(column => column.key === key)?.width ?? 100;
  const offered = employeeColumns.filter(column => visible.includes(column.key) && columnAvailable(column, items)).map(column => column.key);
  const shown = fitColumns(offered, widthOf, available, fixed);
  const columns = employeeColumns.filter(column => shown.includes(column.key));
  const span = columns.length + (selection ? 2 : 1);
  const allSelected = !!selection && items.length > 0 && items.every(row => selection.selected.has(row.id));
  const toggle = (id: string) => setExpandedId(current => current === id ? undefined : id);
  // Full width of the pane with a floor per column, so a few columns never shrink to a narrow strip beside empty space.
  return <table ref={tableRef} className={styles.table} style={{ width: "100%", minWidth: columns.reduce((sum, column) => sum + widthOf(column.key), fixed) }}>
    {/* Explicit px widths so no text is cut. The name column takes whatever the others leave, so beside an open detail pane (other columns hidden by the kit) it fills the pane. */}
    <colgroup>{selection && <col style={{ width: 28 }} />}<col style={{ width: 28 }} />{columns.map(column => <col key={column.key} className={column.keep ? styles.keep : undefined} style={column.key === "name" ? undefined : { width: widthOf(column.key) }} />)}</colgroup>
    <thead><tr>
      {selection && <th scope="col" className={styles.checkCell}><input type="checkbox" aria-label="Chọn tất cả trên trang" checked={allSelected} onChange={event => selection.onToggleAll(event.target.checked)} /></th>}
      <th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map(column => column.key === "photo" ? <th key={column.key} scope="col" className={styles.keep}>{column.label}</th>
        : onSort && sort ? <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} className={column.keep ? styles.keep : undefined} /> : <th key={column.key} scope="col" title={column.label} className={column.keep ? styles.keep : undefined}>{column.label}</th>)}
    </tr></thead>
    <tbody>{items.map(row => <Fragment key={row.id}>
      <OpenableTableRow disabled={disabled} data-selected={expandedId === row.id || undefined} onOpen={() => toggle(row.id)}>
        {selection && <td className={styles.checkCell}><input type="checkbox" aria-label={`Chọn ${row.fullName}`} checked={selection.selected.has(row.id)} onChange={event => selection.onToggle(row.id, event.target.checked)} /></td>}
        <td className={styles.expandCell}><button type="button" disabled={disabled} aria-expanded={expandedId === row.id} aria-controls={`employee-preview-${row.id}`} aria-label={`${expandedId === row.id ? "Thu gọn" : "Mở"} ${row.fullName}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expandedId === row.id ? "chevron-down" : "chevron-right"} /></button></td>
        {columns.map(column => <td key={column.key} data-label={column.label} className={column.keep ? styles.keep : undefined}>{column.render(row)}</td>)}
      </OpenableTableRow>
      {expandedId === row.id && <DetailRow colSpan={span} className={styles.detailCell}><div className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>
        <EmployeeDetailPanel id={row.id} cache={cache} revision={detailRevision} access={access} onEdit={onEdit} onChanged={onChanged} onSalarySaved={onSalarySaved} />
      </div></DetailRow>}
    </Fragment>)}</tbody>
  </table>;
}
