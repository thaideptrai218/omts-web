import type { ReactNode } from "react";
import s from "./payroll-screen.module.css";

export type DataColumn<T> = Readonly<{ key: string; label: string; right?: boolean; render(row: T): ReactNode }>;

/** Plain read-only table used by the payroll detail subtabs and the payable list; rows carry no buttons. */
export function PayrollDataTable<T extends { id: string }>({ caption, columns, rows, emptyText = "Chưa có dữ liệu để hiển thị." }: {
  caption: string; columns: readonly DataColumn<T>[]; rows: readonly T[]; emptyText?: string;
}) {
  return <table className={s.table}>
    <caption className="sr-only">{caption}</caption>
    <thead><tr>{columns.map((column) => <th key={column.key} scope="col" className={column.right ? s.right : undefined}>{column.label}</th>)}</tr></thead>
    <tbody>{rows.length === 0
      ? <tr><td colSpan={columns.length} className={s.emptyCell}>{emptyText}</td></tr>
      : rows.map((row) => <tr key={row.id}>{columns.map((column) => <td key={column.key} className={column.right ? s.right : undefined}>{column.render(row)}</td>)}</tr>)}</tbody>
  </table>;
}
