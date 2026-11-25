"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScreenGuide } from "@/components/ui/screen-guide";
import type { Employee } from "./contracts";
import { accountLabel } from "./employee-editor-model";
import { EmployeeAccountIssueDialog } from "./employee-account-issue-dialog";
import { EmployeeAccountLinkDialog } from "./employee-account-link-dialog";
import { EmployeeAccountPasswordReset } from "./employee-account-password-reset";

/** The tab strip belongs to the parent; its tab buttons have ids ending in "-tab-information", so the phone shortcut presses that one. */
const goToInformationTab = () => document.querySelector<HTMLElement>('[role="tab"][id$="-tab-information"]')?.click();

/** `canReset`: the Owner only; shows the copy-username and reset-password card. */
export function EmployeeAccountTab({ employee, onSaved, onRefresh, canReset = false }: { employee: Employee; onSaved(employee: Employee): void; onRefresh?(): void; canReset?: boolean }) {
  const [dialog, setDialog] = useState<"issue" | "link">();
  const account = employee.account;
  const canGrant = employee.status === "Employed" && employee.canMaintain && !employee.hasStaffAccount;
  return <div className="space-y-4">
    <ScreenGuide id="employee-account-tab" steps={[
      { title: "Cấp tài khoản", text: "Nhân viên cần tài khoản mới đăng nhập được vào ứng dụng.", target: "text:Cấp tài khoản" },
      { title: "Hoặc liên kết", text: "Nếu họ đã có tài khoản, hãy liên kết thay vì tạo thêm.", target: "text:Liên kết" },
      { title: "Chọn vai trò", text: "Chọn ngay khi cấp, hoặc sau này ở Quản lý người dùng." },
    ]} />
    {account ? <>
      <dl className="grid gap-4 sm:grid-cols-3">
        <div><dt className="text-sm text-text-muted">Tên tài khoản</dt><dd className="break-all font-semibold">@{account.username}</dd></div>
        <div><dt className="text-sm text-text-muted">Tên hiển thị</dt><dd className="break-words">{account.displayName}</dd></div>
        <div><dt className="text-sm text-text-muted">Tình trạng tài khoản</dt><dd>{accountLabel(account.status)}</dd></div>
        {/* Roles and zones are granted in the user-management drawer; this opens that user directly. */}
        <div className="sm:col-span-3"><Link className="font-semibold underline" href={`/workspace/accounts?accountId=${encodeURIComponent(account.id)}`}>Phân quyền và quản lý tài khoản</Link></div>
      </dl>
      {canReset && <EmployeeAccountPasswordReset account={account} displayName={account.displayName || employee.fullName} />}
    </> : <>
      <p className="font-semibold">Chưa có tài khoản đăng nhập.</p>
      {canGrant && <>
        <p className="text-sm text-text-muted">Liên kết tài khoản có sẵn chưa gắn với ai, hoặc cấp tài khoản mới.</p>
        <div className="flex flex-wrap gap-3">
          <Button className="w-auto" variant="secondary" onClick={() => setDialog("link")}>Liên kết tài khoản có sẵn</Button>
          <Button className="w-auto" onClick={() => setDialog("issue")}>Cấp tài khoản đăng nhập</Button>
        </div>
      </>}
      {employee.status === "Left" && <p className="text-sm text-text-muted">Nhân viên đã nghỉ việc không thể được cấp tài khoản. Bấm &ldquo;Làm việc lại&rdquo; ở tab Thông tin nếu cần cấp.</p>}
      {employee.status === "Employed" && employee.hasStaffAccount && <p className="text-sm text-text-muted">Nhân viên này đã có tài khoản nội bộ nên không cấp thêm được.</p>}
    </>}
    {dialog === "issue" && <EmployeeAccountIssueDialog employee={employee} onClose={() => setDialog(undefined)} onSaved={onSaved} onRefresh={onRefresh} onFixPhone={goToInformationTab} />}
    {dialog === "link" && <EmployeeAccountLinkDialog employee={employee} onClose={() => setDialog(undefined)} onSaved={onSaved} />}
  </div>;
}
