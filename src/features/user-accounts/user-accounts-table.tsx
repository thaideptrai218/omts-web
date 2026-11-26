"use client";
import { useEffect, useRef, useState } from "react";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { SortableHeader, type SortState } from "@/components/ui/management-screen/management-table";
import type { AccountSort } from "@/features/account-access/user-account-list-model";
import type { UserAccount } from "@/features/account-access/user-account-model";
import type { LinkedEmployee } from "@/features/account-access/user-info-section";
import { fitColumns } from "@/features/employee-api/employee-column-fit";
import { accountColumnDropOrder, accountColumns } from "./user-accounts-columns";
import styles from "./user-accounts.module.css";

/** Rows open the account on click; the name is also a real button so the keyboard and screen readers can open it. */
export function UserAccountsTable({ items, visible, openId, employees, sort, onSort, onOpen }: {
  items: readonly UserAccount[]; visible: readonly string[]; openId?: string; employees: ReadonlyMap<string, LinkedEmployee>;
  sort: AccountSort; onSort(next: SortState): void; onOpen(id: string): void;
}) {
  // Width of the pane the table sits in; 0 until measured. Columns that do not fit are dropped (least important first) rather than cut or scrolled.
  const tableRef = useRef<HTMLTableElement>(null), [available, setAvailable] = useState(0);
  useEffect(() => {
    const pane = tableRef.current?.parentElement;
    if (!pane || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setAvailable(pane.clientWidth));
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);
  const widthOf = (key: string) => accountColumns.find((column) => column.key === key)?.width ?? 100;
  const shown = fitColumns(accountColumns.filter((column) => visible.includes(column.key)).map((column) => column.key), widthOf, available, 0, accountColumnDropOrder);
  const columns = accountColumns.filter((column) => shown.includes(column.key));
  return <table ref={tableRef} className={styles.table} style={{ width: "100%", minWidth: columns.reduce((sum, column) => sum + widthOf(column.key), 0) }}>
    <colgroup>{columns.map((column) => <col key={column.key} style={column.key === "name" ? undefined : { width: widthOf(column.key) }} />)}</colgroup>
    <thead><tr>{columns.map((column) => <SortableHeader key={column.key} label={column.label} sortKey={column.sort} sort={sort} onSort={onSort} />)}</tr></thead>
    <tbody>{items.map((account) => <OpenableTableRow key={account.id} data-selected={openId === account.id || undefined} onOpen={() => onOpen(account.id)}>
      {columns.map((column) => <td key={column.key} data-label={column.label}>
        {column.key === "name"
          ? <button type="button" className={styles.open} aria-label={`Mở tài khoản ${account.displayName}`} onClick={() => onOpen(account.id)}>{account.displayName}</button>
          : column.render(account, account.employeeId ? employees.get(account.employeeId) : undefined)}
      </td>)}
    </OpenableTableRow>)}</tbody>
  </table>;
}
