"use client";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { StatusPill } from "@/components/ui/management-page";
import { ListStateMessage, managementStyles } from "@/components/ui/management-screen/management-table";
import { OpenableTableRow } from "@/components/ui/openable-table-row";
import { AccountAccessPanel } from "@/features/account-access/account-access-panel";
import { accountStatusLabel, filterUserAccounts, emptyUserFilters, type UserAccount } from "@/features/account-access/user-account-model";
import { UserGrantChips } from "@/features/account-access/user-grant-chips";
import styles from "./employee-directory.module.css";

/**
 * Logins that no employee holds (the backend allows them). They stay manageable here with the same role, zone, password and lock actions
 * as an employee's login. `search` is the box above the list. Linking one to an employee is done from that employee's login tab.
 */
export function EmployeeUnlinkedAccounts({ accounts, search, initialOpenId, onChanged }: {
  accounts: readonly UserAccount[]; search: string; initialOpenId?: string; onChanged(): void;
}) {
  const [openId, setOpenId] = useState(initialOpenId);
  const rows = filterUserAccounts(accounts.filter(account => !account.employeeId), { ...emptyUserFilters, search });
  const open = accounts.find(account => account.id === openId);
  if (!rows.length) return <ListStateMessage>{search.trim() ? "Không có tài khoản phù hợp." : "Mọi tài khoản đều đã gắn với nhân viên."}</ListStateMessage>;
  return <>
    <p className="px-3 py-2 text-sm text-text-muted">Những tài khoản này chưa gắn với nhân viên nào. Muốn gắn, mở nhân viên đó, vào tab Tài khoản đăng nhập và bấm Liên kết tài khoản có sẵn.</p>
    <table className={styles.table}>
      <thead><tr><th scope="col">Tên hiển thị</th><th scope="col">Tên đăng nhập</th><th scope="col">Điện thoại</th><th scope="col">Vai trò và vùng</th><th scope="col">Tình trạng</th></tr></thead>
      <tbody>{rows.map(account => <OpenableTableRow key={account.id} onOpen={() => setOpenId(account.id)}>
        <td><button type="button" className={managementStyles.linkButton} aria-label={`Mở tài khoản ${account.displayName}`} onClick={() => setOpenId(account.id)}><strong className="font-semibold">{account.displayName}</strong></button></td>
        <td className="break-all">{account.username}</td>
        <td>{account.phoneNumber || "—"}</td>
        <td><UserGrantChips pairs={account.pairs} limit={3} /></td>
        <td><StatusPill tone={account.status === "Active" ? "success" : "danger"}>{accountStatusLabel(account.status)}</StatusPill></td>
      </OpenableTableRow>)}</tbody>
    </table>
    {open && <Dialog open title={`Tài khoản ${open.displayName}`} size="xl" onOpenChange={isOpen => { if (!isOpen) setOpenId(undefined); }}>
      <AccountAccessPanel account={open} onChanged={onChanged} />
    </Dialog>}
  </>;
}
