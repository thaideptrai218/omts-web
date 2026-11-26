"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { emptyGrantSelection, type GrantSelection } from "@/features/account-access/user-grant-selection";
import { createOperationsRepository } from "@/features/operations/repository";
import { EmployeeAccountGrantChoice } from "./employee-account-grant-choice";
import { accountantWarningFor, applyGrantSelection, grantOutcomeNotice, hasAnyRole, selectionError } from "./employee-account-grants";
import { ErrorNotice, Field } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { issueEmployeeAccountRequestSchema, issueEmployeeAccountResponseSchema } from "./employee-account-contract";
import { employeeAccountError } from "./employee-account-error";
import { suggestUsername } from "./employee-account-username-suggestion";
import { EmployeeCredentialDialog } from "./employee-credential-dialog";

export function EmployeeAccountIssueDialog({ employee, onClose, onSaved, onRefresh, onFixPhone }: {
  employee: Employee; onClose(): void; onSaved(employee: Employee): void; onRefresh?(): void; onFixPhone?(): void;
}) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const [username, setUsername] = useState(() => suggestUsername(employee.fullName));
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  // This is deliberately component state, never shared with the employee/detail cache.
  const [credential, setCredential] = useState<{ password: string; expiresAt: string; username: string }>();
  const [selection, setSelection] = useState<GrantSelection>(emptyGrantSelection);
  const [grantNotice, setGrantNotice] = useState<{ text?: string; failed: boolean }>();
  const zoneNames = useRef(new Map<string, string>());
  const confirmation = useActionDialog();
  const savedEmployee = useRef<Employee | undefined>(undefined);
  const active = useRef(false), mounted = useRef(true);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; savedEmployee.current = undefined; };
  }, []);
  function close() {
    if (active.current) return;
    onClose();
    if (blocked) onRefresh?.();
  }
  function acknowledge() {
    setCredential(undefined);
    const saved = savedEmployee.current;
    savedEmployee.current = undefined;
    onClose();
    if (saved) onSaved(saved);
  }
  async function save() {
    if (active.current || blocked || credential || employee.account || employee.hasStaffAccount || employee.status !== "Employed" || !employee.canMaintain) return;
    const checked = issueEmployeeAccountRequestSchema.safeParse({ username });
    if (!checked.success) {
      setError(checked.error.issues[0].message);
      form.current?.querySelector<HTMLInputElement>('[name="username"]')?.focus();
      return;
    }
    const missingZone = selectionError(selection);
    if (missingZone) { setError(missingZone); return; }
    // D9: a second Accountant only warns; the Owner's OK continues.
    active.current = true; setPending(true); setError(undefined);
    // Awaited only when an Accountant is chosen, so a plain issue still sends its request synchronously.
    const warning = selection.accountant ? await accountantWarningFor(selection) : undefined;
    if (warning && !(await confirmation.confirm(warning))) { active.current = false; if (mounted.current) setPending(false); return; }
    try {
      const result = await repository.write("issue-account", checked.data, issueEmployeeAccountResponseSchema, employee.id);
      if (!mounted.current) return;
      if (result.status === "success") {
        savedEmployee.current = result.data.employee;
        // The account exists now; grants go through the grant-create path and a failure never hides the password.
        const accountId = result.data.employee.account?.id;
        const outcome = accountId && hasAnyRole(selection) ? await applyGrantSelection(accountId, selection, zoneNames.current) : undefined;
        if (!mounted.current) return;
        setGrantNotice({ text: grantOutcomeNotice(outcome), failed: !!outcome?.failed.length });
        setCredential({ password: result.data.temporaryPassword, expiresAt: result.data.temporaryPasswordExpiresAt, username: result.data.employee.account?.username ?? checked.data.username });
        setUsername(""); setSelection(emptyGrantSelection);
      } else {
        setError(employeeAccountError(result));
        setBlocked(result.uncertain || ["MSG06", "MSG-GEN-06", "MSG-GEN-09", "MSG24"].includes(result.code ?? ""));
      }
    } catch {
      if (mounted.current) { setBlocked(true); setError("Chưa biết tài khoản đã được cấp chưa. Hãy đóng hộp này và tải lại hồ sơ để kiểm tra."); }
    } finally { active.current = false; if (mounted.current) setPending(false); }
  }
  const disabledReason = blocked ? "Chưa cấp lại được. Hãy đóng hộp này và tải lại hồ sơ để kiểm tra." : !employee.phoneNumber ? "Chưa cấp được vì hồ sơ chưa có số điện thoại." : undefined;
  if (credential) return <EmployeeCredentialDialog username={credential.username} password={credential.password} expiresAt={credential.expiresAt} onClose={acknowledge} grantNotice={grantNotice?.text} grantFailed={grantNotice?.failed} />;
  // The tab sits inside the profile <form>; a <form> nested in a <form> is invalid HTML (React reloads the page in development), so the dialog is rendered on <body>.
  return createPortal(<Dialog open title="Cấp tài khoản đăng nhập" dismissible={!pending} onOpenChange={open => { if (!open) close(); }}>
    <p className="mb-4 text-sm text-text-muted">Cấp tài khoản cho {employee.fullName}. Mật khẩu tạm chỉ hiện một lần sau khi cấp, nhớ ghi lại.</p>
    {confirmation.dialog}
    <form ref={form} className="space-y-4" noValidate onSubmit={event => { event.preventDefault(); event.stopPropagation(); void save(); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Field label="Tên đăng nhập *" name="username" required minLength={3} maxLength={50} autoComplete="off" value={username} disabled={pending || blocked} onChange={event => setUsername(event.target.value)} />
          <p className="mt-1 text-xs text-text-muted">Gợi ý theo tên nhân viên, bạn có thể sửa.</p>
        </div>
        <div>
          <p className="text-xs font-medium text-text-muted">Số điện thoại (từ hồ sơ)</p>
          <p className="mt-1 flex min-h-10 items-center text-sm font-semibold">{employee.phoneNumber || "—"}</p>
        </div>
      </div>
      {!employee.phoneNumber && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-warning/40 bg-warning-soft p-3 text-sm">
        <p className="min-w-0 flex-1">Hồ sơ chưa có số điện thoại nên chưa cấp được tài khoản.</p>
        {onFixPhone && <Button type="button" className="w-auto" variant="secondary" disabled={pending} onClick={() => { onClose(); onFixPhone(); }}>Bổ sung số điện thoại</Button>}
      </div>}
      <EmployeeAccountGrantChoice selection={selection} onChange={setSelection} disabled={pending || blocked} username={username} onZones={names => { zoneNames.current = names; }} />
      <ErrorNotice error={error} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={close}>Đóng</Button>
        <Button className="w-auto" type="submit" isPending={pending} disabled={!!disabledReason} aria-describedby={disabledReason ? "issue-account-disabled-reason" : undefined}>{hasAnyRole(selection) ? "Cấp tài khoản và phân quyền" : "Cấp tài khoản"}</Button>
      </div>
      {disabledReason && <p id="issue-account-disabled-reason" className="text-right text-xs text-text-muted">{disabledReason}</p>}
    </form>
  </Dialog>, document.body);
}
