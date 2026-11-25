"use client";
import { EmployeeTypeBadge } from "./employee-type-badge";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AccountAccessPanel } from "@/features/account-access/account-access-panel";
import { RolePermissionsDialog } from "@/features/account-access/role-permissions-dialog";
import type { Employee } from "./contracts";
import { accountLabel } from "./employee-editor-model";
import { EmployeeAccountIssueDialog } from "./employee-account-issue-dialog";
import { EmployeeAccountLinkDialog } from "./employee-account-link-dialog";

/** The tab strip belongs to the parent; its tab buttons have ids ending in "-tab-<key>", so a shortcut presses that one. */
const goToTab = (key: string) => () => document.querySelector<HTMLElement>(`[role="tab"][id$="-tab-${key}"]`)?.click();

/**
 * Tab "Tài khoản đăng nhập" of one employee: create or link the login, then choose role and zones, reset the password and lock
 * or unlock, all in the Owner's one place. `canReset` is the Owner (only the Owner sees this tab with its actions);
 * `onAccountChanged` lets the list refresh its role column and login chips.
 */
export function EmployeeAccountTab({ employee, onSaved, onRefresh, onAccountChanged, canReset = false }: {
  employee: Employee; onSaved(employee: Employee): void; onRefresh?(): void; onAccountChanged?(): void; canReset?: boolean;
}) {
  const [dialog, setDialog] = useState<"issue" | "link" | "roles">();
  const account = employee.account;
  const canGrant = employee.status === "Employed" && employee.canMaintain && !employee.hasStaffAccount;
  return <div className="space-y-4">
    <p className="flex flex-wrap items-center gap-2 text-sm"><strong>{employee.fullName}</strong><EmployeeTypeBadge type={employee.employeeType} showLabel /></p>
    {employee.employeeType === "SeasonalWorker" && <p className="text-sm text-text-muted">Tài khoản thời vụ dùng mật khẩu mặc định của hợp tác xã, họ phải đổi ở lần đăng nhập đầu.</p>}
    {account ? (canReset
      ? <AccountAccessPanel account={account} employeeLabel={`${employee.code} · ${employee.fullName}`} workingZoneIds={employee.workingZones.map(zone => zone.id)} onOpenWork={goToTab("work")} onChanged={() => onAccountChanged?.()} />
      : <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-sm text-text-muted">Tên đăng nhập</dt><dd className="break-all font-semibold">@{account.username}</dd></div>
        <div><dt className="text-sm text-text-muted">Tên hiển thị</dt><dd className="break-words">{account.displayName}</dd></div>
        <div><dt className="text-sm text-text-muted">Tình trạng</dt><dd>{accountLabel(account.status)}</dd></div>
      </dl>)
      : <>
        <p className="font-semibold">Chưa có tài khoản đăng nhập.</p>
        {canGrant && <>
          <p className="text-sm text-text-muted">Cấp tài khoản mới, hoặc liên kết với tài khoản có sẵn chưa gắn nhân viên nào.</p>
          <div className="flex flex-wrap gap-3">
            <Button className="w-auto" onClick={() => setDialog("issue")}>Cấp tài khoản đăng nhập</Button>
            <Button className="w-auto" variant="secondary" onClick={() => setDialog("link")}>Liên kết tài khoản có sẵn</Button>
          </div>
        </>}
        {employee.status === "Left" && <p className="text-sm text-text-muted">Nhân viên đã nghỉ việc nên không cấp tài khoản được. Bấm &ldquo;Làm việc lại&rdquo; ở tab Thông tin nếu cần cấp.</p>}
        {employee.status === "Employed" && employee.hasStaffAccount && <p className="text-sm text-text-muted">Nhân viên này đã có tài khoản nội bộ nên không cấp thêm được.</p>}
      </>}
    {canReset && <Button className="w-auto" variant="secondary" onClick={() => setDialog("roles")}>Xem quyền của vai trò</Button>}
    {dialog === "issue" && <EmployeeAccountIssueDialog employee={employee} onClose={() => setDialog(undefined)} onSaved={onSaved} onRefresh={onRefresh} onFixPhone={goToTab("information")} />}
    {dialog === "link" && <EmployeeAccountLinkDialog employee={employee} onClose={() => setDialog(undefined)} onSaved={onSaved} />}
    {dialog === "roles" && <RolePermissionsDialog onClose={() => setDialog(undefined)} />}
  </div>;
}
