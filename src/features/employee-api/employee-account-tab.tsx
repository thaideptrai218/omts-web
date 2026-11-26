"use client";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { accountState, accountStateLabel } from "@/features/account-access/user-account-list-model";
import { toUserAccount } from "@/features/account-access/user-account-model";
import { UserCreateDialog } from "@/features/account-access/user-create-dialog";
import { UserGrantChips } from "@/features/account-access/user-grant-chips";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { useRemote } from "@/features/operations/ui";
import { EmployeeTypeBadge } from "./employee-type-badge";
import type { Employee } from "./contracts";
import { accountLabel } from "./employee-editor-model";
import { EmployeeAccountLinkDialog } from "./employee-account-link-dialog";

/** Same look as a secondary button, for a link to another screen. */
const linkButton = "inline-flex min-h-11 w-auto items-center justify-center rounded-control border border-border-strong/50 bg-surface px-3 py-2 text-[13px] font-semibold leading-5 hover:border-primary/50 hover:bg-surface-subtle lg:min-h-0 lg:py-1";

/** The linked account in a few words: login name, state and, read only, the role and zones it holds. Everything else is done on the Tài khoản người dùng screen. */
function LinkedAccount({ account }: { account: NonNullable<Employee["account"]> }) {
  const detail = useRemote(useCallback((signal: AbortSignal) => createWorkspaceRepository("accounts").detail(account.id, signal), [account.id]));
  const saved = useMemo(() => detail.data ? toUserAccount(detail.data) : undefined, [detail.data]);
  const state = saved ? accountState(saved) : undefined;
  return <div className="space-y-4">
    <dl className="grid gap-4 sm:grid-cols-3">
      <div><dt className="text-sm text-text-muted">Tên đăng nhập</dt><dd className="break-all font-semibold">@{account.username}</dd></div>
      <div><dt className="text-sm text-text-muted">Trạng thái</dt><dd>{state ? <StatusPill tone={state === "active" ? "success" : state === "pending" ? "warning" : "danger"}>{accountStateLabel[state]}</StatusPill> : accountLabel(account.status)}</dd></div>
      <div><dt className="text-sm text-text-muted">Vai trò và vùng</dt><dd>{saved ? <UserGrantChips pairs={saved.pairs} limit={6} /> : detail.error ? <span className="text-text-muted">Chưa đọc được</span> : <span className="text-text-muted">Đang đọc…</span>}</dd></div>
    </dl>
    <Link className={linkButton} href={`/workspace/accounts?accountId=${encodeURIComponent(account.id)}`}>Mở tài khoản</Link>
  </div>;
}

/**
 * Tab "Tài khoản đăng nhập" of one employee, kept light: it shows the linked account (name, state, role and zones, read only) and opens it on the
 * Tài khoản người dùng screen, where roles, password, lock and delete are managed. An official (nội bộ) employee without an account gets "Cấp tài khoản",
 * which opens the same create form as that screen with the employee filled in. Seasonal workers have no account. `canReset` is the Owner.
 */
export function EmployeeAccountTab({ employee, onSaved, onRefresh, onAccountChanged, canReset = false }: {
  employee: Employee; onSaved(employee: Employee): void; onRefresh?(): void; onAccountChanged?(): void; canReset?: boolean;
}) {
  const [dialog, setDialog] = useState<"create" | "link">();
  const account = employee.account;
  const canGrant = employee.employeeType === "Staff" && employee.status === "Employed" && employee.canMaintain && !employee.hasStaffAccount;
  return <div className="space-y-4">
    <p className="flex flex-wrap items-center gap-2 text-sm"><strong>{employee.fullName}</strong><EmployeeTypeBadge type={employee.employeeType} showLabel /></p>
    {account ? (canReset
      ? <LinkedAccount account={account} />
      : <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-sm text-text-muted">Tên đăng nhập</dt><dd className="break-all font-semibold">@{account.username}</dd></div>
        <div><dt className="text-sm text-text-muted">Tên hiển thị</dt><dd className="break-words">{account.displayName}</dd></div>
        <div><dt className="text-sm text-text-muted">Tình trạng</dt><dd>{accountLabel(account.status)}</dd></div>
      </dl>)
      : employee.employeeType === "SeasonalWorker" ? <p className="font-semibold">Không có tài khoản đăng nhập. Nhân viên thời vụ làm theo phân công, không cần tài khoản.</p> : <>
        <p className="font-semibold">Chưa có tài khoản đăng nhập.</p>
        {canGrant && <>
          <p className="text-sm text-text-muted">Tạo tài khoản mới cho nhân viên này, hoặc gắn một tài khoản có sẵn chưa thuộc nhân viên nào.</p>
          <div className="flex flex-wrap gap-3">
            <Button className="w-auto" onClick={() => setDialog("create")}>Cấp tài khoản</Button>
            <Button className="w-auto" variant="secondary" onClick={() => setDialog("link")}>Liên kết tài khoản có sẵn</Button>
          </div>
        </>}
        {employee.status === "Left" && <p className="text-sm text-text-muted">Nhân viên đã nghỉ việc nên không cấp tài khoản được. Bấm &ldquo;Làm việc lại&rdquo; ở tab Thông tin nếu cần cấp.</p>}
        {employee.status === "Employed" && employee.hasStaffAccount && <p className="text-sm text-text-muted">Nhân viên này đã có tài khoản nội bộ nên không cấp thêm được.</p>}
      </>}
    {dialog === "create" && <UserCreateDialog employee={employee} onClose={() => setDialog(undefined)} onCreated={() => { onAccountChanged?.(); onRefresh?.(); }} />}
    {dialog === "link" && <EmployeeAccountLinkDialog employee={employee} onClose={() => setDialog(undefined)} onSaved={onSaved} />}
  </div>;
}
