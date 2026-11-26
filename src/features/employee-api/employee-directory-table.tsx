"use client";
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { StatusPill } from "@/components/ui/management-page";
import { formatVndWithSymbol } from "@/shared/format/vnd";
import { formatHours } from "@/features/payroll/payroll-model";
import { managementStyles, SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import type { EmployeeListItemDto } from "@/features/employee-management/api/employee-contract.schemas";
import { EmployeeTypeBadge } from "./employee-type-badge";
import { accountLabel, employmentLabel, dateLabel } from "./employee-editor-model";
import { EmployeeDetailPanel } from "./employee-detail-panel";
import type { EmployeeDetailCache } from "./use-employee-detail";
import type { Employee } from "./contracts";
import styles from "./employee-directory.module.css";
import { DetailRow } from "@/components/ui/management-screen/detail-pane";
import { fitColumns, usernameColumnWidth } from "./employee-column-fit";

export type EmployeeLeaveGuard = (leave: () => void) => void;
/** Giờ công và nợ lương đến từ danh sách (`monthHours`, `outstandingWage`), chỉ có với Chủ HTX và Kế toán; không có thì cột hiện "—". */
type Column = { key: string; label: string; width: number; sort?: string; defaultHidden?: boolean; render(row: EmployeeListItemDto, chip?: ReactNode, link?: ReactNode): ReactNode };
/**
 * The login name. As a chip beside the employee's name (default) or as plain text in the "Tên đăng nhập" column (`plain`).
 * For the Owner (`openAccount` given) it is a button that opens the row on the "Tài khoản đăng nhập" tab; a locked or
 * inactive account is greyed and its status is in the tooltip.
 */
function AccountChip({ row, openAccount, plain = false }: { row: EmployeeListItemDto; openAccount?: (id: string) => void; plain?: boolean }) {
  const account = row.account;
  if (!account) return null;
  const label = `@${account.username}`, active = account.status === "Active";
  const shared = { className: plain ? styles.accountLink : styles.accountChip, "data-locked": active ? undefined : "", title: active ? label : `${label} · ${accountLabel(account.status)}` };
  return openAccount
    ? <button type="button" {...shared} aria-label={`Mở tài khoản đăng nhập ${label} của ${row.fullName}`} onClick={event => { event.stopPropagation(); openAccount(row.id); }}>{label}</button>
    : <span {...shared}>{label}</span>;
}
const text = (value: string, className = "") => <span className={`${styles.truncated} ${className}`} title={value}>{value || "—"}</span>;
/** Chữ cái đầu của tên làm ảnh đại diện (không có ảnh nhân viên). */
const initial = (name: string) => Array.from(name.trim())[0]?.toLocaleUpperCase("vi") ?? "?";
export const employeeColumns: readonly Column[] = [
  // The name is the identity column and stays FIRST: while a row is open the management kit keeps only the first data column (plus the last), so any other order hides the name beside the detail pane.
  { key: "name", label: "Họ và tên", width: 190, sort: "name", render: (row, chip) => <span className={styles.nameCell}><span className={styles.avatar} aria-hidden="true">{initial(row.fullName)}</span>{text(row.fullName, styles.name)}<EmployeeTypeBadge type={row.employeeType} />{chip}</span> },
  // The backend cannot sort by login name, so this header is plain. The code stays available in the column picker.
  { key: "username", label: "Tên đăng nhập", width: 160, render: (row, _chip, link) => link ?? <span className={styles.meta}>—</span> },
  { key: "code", label: "Mã nhân viên", width: 116, sort: "code", defaultHidden: true, render: row => text(row.code, "font-mono tabular-nums") },
  { key: "phone", label: "Số điện thoại", width: 122, sort: "phone", render: row => text(row.phoneNumber ?? "—") },
  { key: "type", label: "Loại nhân viên", width: 132, sort: "type", render: row => row.employeeType ? <EmployeeTypeBadge type={row.employeeType} showLabel /> : <span className={styles.meta}>—</span> },
  { key: "jobs", label: "Loại công việc", width: 140, defaultHidden: true, render: row => text(row.jobTypes.map(job => job.name).join(", ")) },
  { key: "zones", label: "Vùng làm việc", width: 112, render: row => <span className={styles.wrap} title={row.workingZones.map(zone => `${zone.code} · ${zone.name}`).join(", ")}>{row.workingZones.map(zone => zone.code).join(", ") || "—"}</span> },
  { key: "lastDay", label: "Ngày làm cuối", width: 116, sort: "lastWorkingDay", defaultHidden: true, render: row => text(row.lastWorkingDay ? dateLabel(row.lastWorkingDay) : "—") },
  { key: "hours", label: "Giờ công", width: 84, render: row => <span className="tabular-nums" title="Giờ công trả lương từ đầu tháng đến hôm nay">{typeof row.monthHours === "number" ? formatHours(row.monthHours) : "—"}</span> },
  { key: "debt", label: "Nợ lương", width: 108, render: row => <span className={styles.debt} title="Tổng phiếu lương đã chốt còn chưa trả">{typeof row.outstandingWage === "number" ? formatVndWithSymbol(row.outstandingWage) : "—"}</span> },
  { key: "status", label: "Tình trạng", width: 132, sort: "status", render: row => <><span className={styles.status} title={employmentLabel(row.status)}><StatusPill tone={row.status === "Employed" ? "success" : "neutral"}>{employmentLabel(row.status)}</StatusPill></span>{row.status === "Left" && row.lastWorkingDay && <small className={styles.meta} title={`Ngày làm cuối: ${dateLabel(row.lastWorkingDay)}`}>{dateLabel(row.lastWorkingDay)}</small>}</> },
];
export const defaultEmployeeColumns = employeeColumns.filter(column => !column.defaultHidden).map(column => column.key);

/** Pointer row opening supplements a native chevron button; rows add no extra keyboard stop. */
export function EmployeeDirectoryTable({ items, disabled, cache, onSaved, detailRevision = 0, visible = defaultEmployeeColumns, zones = [], jobTypes = [], lookupsReady = false, onGuardChange, initialExpandedId, sort, onSort, selection, access = { manage: true, payroll: true }, onAccountChanged, initialExpandedTab }: {
  /** Tab the initially expanded row opens on. */
  initialExpandedTab?: "account";
  onAccountChanged?(): void;
  /** What the viewer may open in a profile; the default is the Owner's. */
  access?: { manage: boolean; payroll: boolean };
  items: EmployeeListItemDto[]; disabled: boolean; onOpen?(id: string): void; cache: EmployeeDetailCache; onSaved(employee: Employee, note?: string): void; detailRevision?: number;
  visible?: readonly string[]; zones?: ApiRecord[]; jobTypes?: { id: string; name: string }[]; lookupsReady?: boolean;
  onGuardChange?(guard: EmployeeLeaveGuard | undefined): void; initialExpandedId?: string;
  /** Server-side order; without `onSort` the headers are plain. */
  sort?: SortState; onSort?(next: SortState): void;
  /** Row checkboxes; selecting never opens a row. */
  selection?: { selected: ReadonlySet<string>; onToggle(id: string, on: boolean): void; onToggleAll(on: boolean): void };
}) {
  const [expandedId, setExpandedId] = useState<string | undefined>(initialExpandedId);
  // Set by the account chip: that row opens on the account tab; `n` remounts the panel when the row was already open on another tab.
  const [accountTab, setAccountTab] = useState<{ id: string; n: number } | undefined>(() => initialExpandedTab && initialExpandedId ? { id: initialExpandedId, n: 1 } : undefined);
  const guard = useRef<EmployeeLeaveGuard | undefined>(undefined);
  const registerGuard = useCallback((next: EmployeeLeaveGuard | undefined) => { guard.current = next; onGuardChange?.(next); }, [onGuardChange]);
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
  const shown = fitColumns(employeeColumns.filter(column => visible.includes(column.key)).map(column => column.key), widthOf, available, fixed);
  const columns = employeeColumns.filter(column => shown.includes(column.key));
  const span = columns.length + (selection ? 2 : 1);
  const allSelected = !!selection && items.length > 0 && items.every(row => selection.selected.has(row.id));
  function toggle(id: string) {
    const leave = () => { setAccountTab(undefined); setExpandedId(current => current === id ? undefined : id); };
    if (guard.current) guard.current(leave); else leave();
  }
  function openAccount(id: string) {
    const open = () => { setExpandedId(id); setAccountTab(current => ({ id, n: (current?.n ?? 0) + 1 })); };
    if (guard.current) guard.current(open); else open();
  }
  // Full width of the pane with a floor per column, so a few columns never shrink to a narrow strip beside empty space.
  return <table ref={tableRef} className={styles.table} data-username-column={shown.includes("username") ? "" : undefined} style={{ width: "100%", minWidth: columns.reduce((sum, column) => sum + widthOf(column.key), fixed) }}>
    {/* Explicit px widths so no text is cut. The name column takes whatever the others leave (at least its own width), so beside an open detail pane (other columns hidden by the kit) it fills the pane. */}
    <colgroup>{selection && <col style={{ width: 28 }} />}<col style={{ width: 28 }} />{columns.map(column => <col key={column.key} style={column.key === "name" ? undefined : { width: widthOf(column.key) }} />)}</colgroup>
    <thead><tr>
      {selection && <th scope="col" className={styles.checkCell}><input type="checkbox" aria-label="Chọn tất cả trên trang" checked={allSelected} onChange={event => selection.onToggleAll(event.target.checked)} /></th>}
      <th scope="col" className={styles.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map(column => onSort && sort ? <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} /> : <th key={column.key} scope="col" title={column.label}>{column.label}</th>)}
    </tr></thead>
    <tbody>{items.map(row => <Fragment key={row.id}>
      <OpenableTableRow disabled={disabled} data-selected={expandedId === row.id || undefined} onOpen={() => toggle(row.id)}>
        {selection && <td className={styles.checkCell}><input type="checkbox" aria-label={`Chọn ${row.fullName}`} checked={selection.selected.has(row.id)} onChange={event => selection.onToggle(row.id, event.target.checked)} /></td>}
        <td className={styles.expandCell}><button type="button" disabled={disabled} aria-expanded={expandedId === row.id} aria-controls={`employee-preview-${row.id}`} aria-label={`${expandedId === row.id ? "Thu gọn" : "Mở"} ${row.fullName}`} onClick={() => toggle(row.id)}><InterfaceIcon name={expandedId === row.id ? "chevron-down" : "chevron-right"} /></button></td>
        {columns.map(column => <td key={column.key} data-label={column.label}>{column.render(row, row.account ? <AccountChip row={row} openAccount={access.manage && !disabled ? openAccount : undefined} /> : undefined, row.account ? <AccountChip plain row={row} openAccount={access.manage && !disabled ? openAccount : undefined} /> : undefined)}</td>)}
      </OpenableTableRow>
      {expandedId === row.id && <DetailRow colSpan={span} className={styles.detailCell}><div className={`${managementStyles.viewWidth} ${styles.detailWidth}`}>
        <EmployeeDetailPanel key={accountTab?.id === row.id ? accountTab.n : 0} initialTab={accountTab?.id === row.id ? "account" : undefined} id={row.id} cache={cache} onSaved={onSaved} revision={detailRevision} zones={zones} jobTypes={jobTypes} lookupsReady={lookupsReady} onGuardChange={registerGuard} payroll={access.payroll} manage={access.manage} onAccountChanged={onAccountChanged} />
      </div></DetailRow>}
    </Fragment>)}</tbody>
  </table>;
}




