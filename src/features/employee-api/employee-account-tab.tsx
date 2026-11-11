"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Employee } from "./contracts";
import { accountLabel } from "./employee-editor-model";
import { EmployeeAccountIssueDialog } from "./employee-account-issue-dialog";

export function EmployeeAccountTab({ employee, onSaved, onRefresh }: { employee: Employee; onSaved(employee: Employee): void; onRefresh?(): void }) {
  const [issuing, setIssuing] = useState(false);
  const account = employee.account;
  return <div className="space-y-4">
    {account ? <dl className="grid gap-4 sm:grid-cols-3">
      <div><dt className="text-sm text-text-muted">Tên tài khoản</dt><dd className="break-all font-semibold">@{account.username}</dd></div>
      <div><dt className="text-sm text-text-muted">Tên hiển thị</dt><dd className="break-words">{account.displayName}</dd></div>
      <div><dt className="text-sm text-text-muted">Tình trạng tài khoản</dt><dd>{accountLabel(account.status)}</dd></div>
    </dl> : <>
      <p>Chưa có tài khoản đăng nhập.</p>
      {employee.status === "Employed" && employee.canMaintain && !employee.hasStaffAccount && <Button className="sm:w-auto" onClick={() => setIssuing(true)}>Cấp tài khoản đăng nhập</Button>}
      {employee.status === "Left" && <p className="text-sm text-text-muted">Nhân viên đã nghỉ việc không thể được cấp tài khoản.</p>}
    </>}
    {issuing && <EmployeeAccountIssueDialog employee={employee} onClose={() => setIssuing(false)} onSaved={onSaved} onRefresh={onRefresh} />}
  </div>;
}
