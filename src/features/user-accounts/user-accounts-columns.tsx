import type { ReactNode } from "react";
import { StatusPill } from "@/components/ui/management-page";
import { accountState, accountStateLabel } from "@/features/account-access/user-account-list-model";
import type { UserAccount } from "@/features/account-access/user-account-model";
import { UserGrantLineChips } from "@/features/account-access/user-grant-chips";
import { LinkedEmployeeText, type LinkedEmployee } from "@/features/account-access/user-info-section";
import styles from "./user-accounts.module.css";

export type AccountColumn = { key: string; label: string; width: number; sort?: string; defaultHidden?: boolean; render(account: UserAccount, employee: LinkedEmployee | undefined): ReactNode };
const tone = { active: "success", pending: "warning", locked: "danger", deleted: "neutral" } as const;
const plain = (value: string | null | undefined) => <span className={styles.wrap}>{value || "—"}</span>;

/**
 * Columns of the account list. The name column is first (the kit keeps the first and the last column when a pane opens beside the list),
 * the state is last. Text always wraps, so nothing is cut. The optional "Ghi chú" column is off until picked.
 */
export const accountColumns: readonly AccountColumn[] = [
  { key: "name", label: "Tên hiển thị", width: 150, sort: "name", render: (account) => <span className={`${styles.wrap} font-semibold`}>{account.displayName}</span> },
  { key: "username", label: "Tên đăng nhập", width: 130, sort: "username", render: (account) => <span className={styles.wrap}>{account.username}</span> },
  { key: "phone", label: "Điện thoại", width: 104, sort: "phone", render: (account) => plain(account.phoneNumber) },
  { key: "email", label: "Email", width: 150, sort: "email", render: (account) => plain(account.email) },
  { key: "roles", label: "Vai trò và vùng", width: 200, render: (account) => account.deleted ? <span className="text-text-muted">—</span> : <UserGrantLineChips pairs={account.pairs} /> },
  { key: "employee", label: "Nhân viên", width: 150, render: (account, employee) => <span className={styles.wrap}><LinkedEmployeeText account={account} employee={employee} /></span> },
  { key: "note", label: "Ghi chú", width: 170, sort: "note", defaultHidden: true, render: (account) => plain(account.note) },
  { key: "state", label: "Trạng thái", width: 130, sort: "state", render: (account) => { const state = accountState(account); return <StatusPill tone={tone[state]}>{accountStateLabel[state]}</StatusPill>; } },
];
export const defaultAccountColumns = accountColumns.filter((column) => !column.defaultHidden).map((column) => column.key);
/** Least important first, dropped when the pane is too narrow so the table never scrolls sideways. */
export const accountColumnDropOrder = ["note", "email", "phone", "employee", "roles"] as const;
