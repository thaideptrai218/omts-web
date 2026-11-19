"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Employee } from "./contracts";
import { accountLabel } from "./employee-editor-model";
import { EmployeeAccountIssueDialog } from "./employee-account-issue-dialog";
import { EmployeeAccountLinkDialog } from "./employee-account-link-dialog";

export function EmployeeAccountTab({ employee, onSaved, onRefresh }: { employee: Employee; onSaved(employee: Employee): void; onRefresh?(): void }) {
  const [dialog, setDialog] = useState<"issue" | "link">();
  const account = employee.account;
  const canGrant = employee.status === "Employed" && employee.canMaintain && !employee.hasStaffAccount;
  return <div className="space-y-4">
    {account ? <dl className="grid gap-4 sm:grid-cols-3">
      <div><dt className="text-sm text-text-muted">Tên tài khoản</dt><dd className="break-all font-semibold">@{account.username}</dd></div>
      <div><dt className="text-sm text-text-muted">Tên hiển thị</dt><dd className="break-words">{account.displayName}</dd></div>
      <div><dt className="text-sm text-text-muted">Tình trạng tài khoản</dt><dd>{accountLabel(account.status)}</dd></div>
    </dl> : <>
      <p>Chưa có tài khoản đăng nhập.</p>
      {canGrant && <>
        <p className="text-sm text-text-muted">Liên kết với tài khoản nhân viên có sẵn chưa gắn với ai, hoặc tạo tài khoản mới cho nhân viên này.</p>
        <div className="flex flex-wrap gap-3">
          <Button className="w-auto" variant="secondary" onClick={() => setDialog("link")}>Liên kết tài khoản có sẵn</Button>
          <Button className="w-auto" onClick={() => setDialog("issue")}>Cấp tài khoản đăng nhập</Button>
        </div>
      </>}
      {employee.status === "Left" && <p className="text-sm text-text-muted">Nhân viên đã nghỉ việc không thể được cấp tài khoản.</p>}
    </>}
    {dialog === "issue" && <EmployeeAccountIssueDialog employee={employee} onClose={() => setDialog(undefined)} onSaved={onSaved} onRefresh={onRefresh} />}
    {dialog === "link" && <EmployeeAccountLinkDialog employee={employee} onClose={() => setDialog(undefined)} onSaved={onSaved} />}
  </div>;
}
