"use client";
import { Fragment } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import type { DataColumn } from "./payroll-data-table";
import { PayrollDetailPanel } from "./payroll-detail-panel";
import type { PayrollSheet } from "./payroll-model";
import s from "./payroll-screen.module.css";

/** Closed rows carry only the chevron toggle; the open row shows the detail panel at the width of the view. */
export function PayrollSheetTable({ rows, columns, expandedId, onToggle }: Readonly<{
  rows: readonly PayrollSheet[]; columns: readonly DataColumn<PayrollSheet>[]; expandedId: string | undefined; onToggle(id: string): void;
}>) {
  return <table className={s.table}>
    <caption className="sr-only">Danh sách bảng lương theo kỳ</caption>
    <thead><tr>
      <th scope="col" className={s.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map((column) => <th key={column.key} scope="col" className={column.right ? s.right : undefined}>{column.label}</th>)}
    </tr></thead>
    <tbody>{rows.map((sheet) => {
      const open = expandedId === sheet.id;
      return <Fragment key={sheet.id}>
        <OpenableTableRow data-selected={open || undefined} onOpen={() => onToggle(sheet.id)}>
          <td className={s.expandCell}><button type="button" aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở"} bảng lương ${sheet.periodLabel}`} onClick={() => onToggle(sheet.id)}><InterfaceIcon name={open ? "chevron-down" : "chevron-right"} /></button></td>
          {columns.map((column) => <td key={column.key} className={column.right ? s.right : undefined}>{column.render(sheet)}</td>)}
        </OpenableTableRow>
        {open && <tr><td colSpan={columns.length + 1} className={s.detailCell}><div className={managementStyles.viewWidth}><PayrollDetailPanel sheet={sheet} /></div></td></tr>}
      </Fragment>;
    })}</tbody>
  </table>;
}
