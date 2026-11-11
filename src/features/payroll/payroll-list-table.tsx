"use client";
import { Fragment, type ReactNode } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { SortableHeader, managementStyles, type SortState } from "@/components/ui/management-screen/management-table";
import { StatusPill } from "@/components/ui/management-page";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { Money } from "@/features/operations/ui";
import type { SheetPage, SheetRow } from "./contracts";
import { PayrollDetailPanel } from "./payroll-detail-panel";
import { periodLabel, rangeLabel, statusLabel, statusTone } from "./payroll-model";
import s from "./payroll-screen.module.css";

type Sum = keyof SheetPage["summary"];
export type ListColumn = Readonly<{ key: string; label: string; sort?: string; sum?: Sum; nowrap?: boolean; render(row: SheetRow): ReactNode }>;
const money = (key: Sum, sort?: string): Pick<ListColumn, "sum" | "sort"> => ({ sum: key, sort });
export const listColumns: readonly ListColumn[] = [
  { key: "code", label: "Mã", sort: "code", nowrap: true, render: (row) => <span className={s.mono}>{row.code}</span> },
  { key: "name", label: "Tên bảng lương", sort: "name", render: (row) => <span className={s.name}>{row.name}</span> },
  { key: "periodType", label: "Kỳ hạn trả lương", render: (row) => periodLabel[row.periodType] },
  { key: "range", label: "Kỳ làm việc", sort: "from", render: (row) => rangeLabel(row.from, row.to) },
  { key: "total", label: "Tổng lương", ...money("total", "total"), render: (row) => <Money value={row.total} /> },
  { key: "paid", label: "Đã trả nhân viên", ...money("paid", "paid"), render: (row) => <Money value={row.paid} /> },
  { key: "outstanding", label: "Còn cần trả", ...money("outstanding"), render: (row) => <Money value={row.outstanding} /> },
  { key: "status", label: "Trạng thái", sort: "status", nowrap: true, render: (row) => <StatusPill tone={statusTone(row.status)}>{statusLabel[row.status]}</StatusPill> },
];

/** KiotViet-style list: a totals row under the header, and the opened sheet's detail in place under its row. */
export function PayrollListTable({ page, columns, sort, expandedId, selected, onSort, onToggle, onSelect, onSelectAll, onChanged }: {
  page: SheetPage; columns: readonly ListColumn[]; sort: SortState; expandedId?: string; selected: ReadonlySet<string>;
  onSort(next: SortState): void; onToggle(id: string): void; onSelect(id: string, on: boolean): void; onSelectAll(on: boolean): void; onChanged(notice?: string): void;
}) {
  const all = page.items.length > 0 && page.items.every((row) => selected.has(row.id));
  // `fit`: columns shrink and wrap (name, period, headers) so every column stays in view without horizontal scroll.
  return <table className={`${s.table} ${s.fit}`}>
    <caption className="sr-only">Danh sách bảng lương</caption>
    <thead><tr>
      <th scope="col" className={s.checkCell}><input type="checkbox" aria-label="Chọn tất cả trên trang" checked={all} onChange={(event) => onSelectAll(event.target.checked)} /></th>
      <th scope="col" className={s.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} className={column.sum ? s.right : undefined} />)}
    </tr></thead>
    <tbody>
      <tr className={s.totalRow} data-testid="payroll-totals">
        <td className={s.checkCell} /><td className={s.expandCell} />
        {columns.map((column, index) => <td key={column.key} className={column.sum ? s.right : undefined}>{column.sum ? <Money value={page.summary[column.sum]} /> : index === 0 ? "Tổng cộng" : null}</td>)}
      </tr>
      {page.items.map((row) => {
        const open = expandedId === row.id;
        return <Fragment key={row.id}>
          <OpenableTableRow data-selected={open || undefined} onOpen={() => onToggle(row.id)}>
            <td className={s.checkCell}><input type="checkbox" aria-label={`Chọn ${row.name}`} checked={selected.has(row.id)} onChange={(event) => onSelect(row.id, event.target.checked)} /></td>
            <td className={s.expandCell}><button type="button" aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở"} ${row.name}`} onClick={() => onToggle(row.id)}><InterfaceIcon name={open ? "chevron-down" : "chevron-right"} /></button></td>
            {columns.map((column) => <td key={column.key} className={column.sum ? s.right : column.nowrap ? s.nowrap : undefined}>{column.render(row)}</td>)}
          </OpenableTableRow>
          {open && <tr><td colSpan={columns.length + 2} className={s.detailCell}><div className={managementStyles.viewWidth}><PayrollDetailPanel id={row.id} onChanged={onChanged} /></div></td></tr>}
        </Fragment>;
      })}
    </tbody>
  </table>;
}
