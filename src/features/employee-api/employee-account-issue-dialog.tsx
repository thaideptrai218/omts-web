"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Field } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { issueEmployeeAccountRequestSchema, issueEmployeeAccountResponseSchema } from "./employee-account-contract";
import { employeeAccountError } from "./employee-account-error";
import { EmployeeCredentialDialog } from "./employee-credential-dialog";

export function EmployeeAccountIssueDialog({ employee, onClose, onSaved, onRefresh }: {
  employee: Employee; onClose(): void; onSaved(employee: Employee): void; onRefresh?(): void;
}) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  // This is deliberately component state, never shared with the employee/detail cache.
  const [credential, setCredential] = useState<{ password: string; expiresAt: string; username: string }>();
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
    active.current = true; setPending(true); setError(undefined);
    try {
      const result = await repository.write("issue-account", checked.data, issueEmployeeAccountResponseSchema, employee.id);
      if (!mounted.current) return;
      if (result.status === "success") {
        savedEmployee.current = result.data.employee;
        setCredential({ password: result.data.temporaryPassword, expiresAt: result.data.temporaryPasswordExpiresAt, username: result.data.employee.account?.username ?? checked.data.username });
        setUsername("");
      } else {
        setError(employeeAccountError(result));
        setBlocked(result.uncertain || ["MSG06", "MSG-GEN-06", "MSG-GEN-09", "MSG24"].includes(result.code ?? ""));
      }
    } catch {
      if (mounted.current) { setBlocked(true); setError("Chưa xác định được kết quả cấp tài khoản. Đóng hộp thoại và tải lại hồ sơ để đối chiếu."); }
    } finally { active.current = false; if (mounted.current) setPending(false); }
  }
  if (credential) return <EmployeeCredentialDialog username={credential.username} password={credential.password} expiresAt={credential.expiresAt} onClose={acknowledge} />;
  // The tab sits inside the profile <form>; a <form> nested in a <form> is invalid HTML (React reloads the page in development), so the dialog is rendered on <body>.
  return createPortal(<Dialog open title="Cấp tài khoản đăng nhập" dismissible={!pending} onOpenChange={open => { if (!open) close(); }}>
    <p className="mb-4">Tạo tài khoản đăng nhập mới cho {employee.fullName} bằng tên và số điện thoại trong hồ sơ. Mật khẩu tạm được hiển thị một lần sau khi tạo. Phân quyền được thực hiện tại màn Tài khoản.</p>
    {!employee.phoneNumber && <p role="alert" className="mb-4 text-sm">Hồ sơ chưa có số điện thoại. Hãy bổ sung số điện thoại ở thẻ Thông tin rồi cấp lại tài khoản.</p>}
    <form ref={form} className="space-y-4" noValidate onSubmit={event => { event.preventDefault(); event.stopPropagation(); void save(); }}>
      <Field label="Tên tài khoản *" name="username" required minLength={3} maxLength={50} autoComplete="off" value={username} disabled={pending || blocked} onChange={event => setUsername(event.target.value)} />
      <ErrorNotice error={error} />
      <div className="flex flex-wrap gap-3">
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={close}>Đóng</Button>
        <Button className="w-auto" type="submit" isPending={pending} disabled={blocked || !employee.phoneNumber}>Cấp tài khoản</Button>
      </div>
    </form>
  </Dialog>, document.body);
}
