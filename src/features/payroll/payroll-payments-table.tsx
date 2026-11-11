"use client";
import { Fragment } from "react";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { Money } from "@/features/operations/ui";
import type { PaymentRow } from "./contracts";
import type { DataColumn } from "./payroll-data-table";
import { PayrollPaymentDetail } from "./payroll-payment-detail";
import s from "./payroll-screen.module.css";

/** Voucher list with a totals row under the header and the opened voucher's detail in place under its row. */
export function PayrollPaymentsTable({ rows, columns, total, totalNote, expandedId, onToggle }: {
  rows: readonly PaymentRow[]; columns: readonly DataColumn<PaymentRow>[]; total: number; totalNote?: string; expandedId?: string; onToggle(id: string): void;
}) {
  return <table className={`${s.table} ${s.fit}`}>
    <caption className="sr-only">Phiếu chi lương</caption>
    <thead><tr><th scope="col" className={s.expandCell}><span className="sr-only">Mở dòng</span></th>
      {columns.map((column) => <th key={column.key} scope="col" className={column.right ? s.right : undefined}>{column.label}</th>)}</tr></thead>
    <tbody>
      <tr className={s.totalRow} data-testid="payments-totals">
        <td className={s.expandCell} />
        {columns.map((column, index) => <td key={column.key} className={column.right ? s.right : undefined}>
          {column.key === "amount" ? <Money value={total} /> : index === 0 ? <>Tổng cộng{totalNote && <span className={s.muted}> ({totalNote})</span>}</> : null}</td>)}
      </tr>
      {rows.map((row) => {
        const open = expandedId === row.id;
        return <Fragment key={row.id}>
          <OpenableTableRow data-selected={open || undefined} onOpen={() => onToggle(row.id)}>
            <td className={s.expandCell}><button type="button" aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở"} phiếu chi ${row.voucherCode}`} onClick={() => onToggle(row.id)}><InterfaceIcon name={open ? "chevron-down" : "chevron-right"} /></button></td>
            {columns.map((column) => <td key={column.key} className={column.right ? s.right : undefined}>{column.render(row)}</td>)}
          </OpenableTableRow>
          {open && <tr><td colSpan={columns.length + 1} className={s.detailCell}><div className={managementStyles.viewWidth}><PayrollPaymentDetail row={row} /></div></td></tr>}
        </Fragment>;
      })}
    </tbody>
  </table>;
}
