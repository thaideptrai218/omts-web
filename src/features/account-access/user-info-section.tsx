"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { phoneInputProps, phoneInputValue, validVietnamesePhone, vietnamesePhoneMessage } from "@/components/form/phone-input-rules";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { EmployeeTypeBadge } from "@/features/employee-api/employee-type-badge";
import { ErrorNotice, Field, useMutation } from "@/features/operations/ui";
import { toUserAccount, type UserAccount } from "./user-account-model";

export type LinkedEmployee = { id: string; name: string; type?: string | null };

/** The linked employee with a link to the Nhân viên screen, or the plain words when there is none. */
export function LinkedEmployeeText({ account, employee }: { account: Pick<UserAccount, "employeeId">; employee?: LinkedEmployee }) {
  if (!account.employeeId) return <>Không gắn nhân viên</>;
  const name = employee?.name ?? "Nhân viên đã gắn";
  return <span className="inline-flex flex-wrap items-center gap-1.5"><Link className="font-semibold underline" href={`/workspace/employees?recordId=${encodeURIComponent(account.employeeId)}&search=${encodeURIComponent(name)}`}>{name}</Link><EmployeeTypeBadge type={employee?.type} /></span>;
}

/**
 * Contact details and note of the account, edited in place (DESIGN_GUIDELINES 1.12). Saving sends the whole form with the row version,
 * so a stale edit gets MSG06; a blank note clears it. A deleted account is read only.
 */
export function UserInfoSection({ account, disabled, employee, onSaved }: { account: UserAccount; disabled?: boolean; employee?: LinkedEmployee; onSaved(saved: UserAccount): void }) {
  const repository = useMemo(() => createWorkspaceRepository("accounts"), []);
  const [editing, setEditing] = useState(false), [problem, setProblem] = useState<string>();
  const initial = () => ({ displayName: account.displayName, username: account.username, phoneNumber: account.phoneNumber ?? "", email: account.email ?? "", note: account.note ?? "" });
  const [values, setValues] = useState(initial);
  const mutation = useMutation();
  const set = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  function startEdit() { setValues(initial()); setProblem(undefined); setEditing(true); }
  async function save() {
    if (mutation.busy() || mutation.blocked) return;
    if (!values.displayName.trim() || !values.username.trim()) { setProblem("Tên hiển thị và tên đăng nhập là bắt buộc."); return; }
    if (!validVietnamesePhone(values.phoneNumber)) { setProblem(vietnamesePhoneMessage); return; }
    if (values.note.trim().length > 500) { setProblem("Ghi chú tối đa 500 ký tự."); return; }
    setProblem(undefined);
    const body = { displayName: values.displayName.trim(), username: values.username.trim(), phoneNumber: values.phoneNumber, email: values.email.trim() || null, note: values.note.trim() || null, rowVersion: account.rowVersion };
    const saved = await mutation.run(() => repository.mutate("update", body, account.id));
    if (saved) { onSaved(toUserAccount(saved)); setEditing(false); }
  }
  if (!editing) return <section aria-label="Thông tin tài khoản" className="space-y-3">
    <dl className="grid gap-3 sm:grid-cols-2">
      {([["Tên hiển thị", account.displayName], ["Tên đăng nhập", account.username], ["Số điện thoại", account.phoneNumber], ["Email", account.email]] as const)
        .map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="break-all text-sm font-medium">{value || "—"}</dd></div>)}
      <div><dt className="text-xs text-text-muted">Nhân viên</dt><dd className="text-sm font-medium"><LinkedEmployeeText account={account} employee={employee} /></dd></div>
      <div className="sm:col-span-2"><dt className="text-xs text-text-muted">Ghi chú</dt><dd className="whitespace-pre-wrap break-words text-sm font-medium">{account.note || "—"}</dd></div>
    </dl>
    {account.deleted ? <p className="text-sm text-text-muted">Tài khoản đã xóa nên không sửa được.</p> : <Button className="w-auto" variant="secondary" disabled={disabled} onClick={startEdit}>Sửa thông tin</Button>}
  </section>;
  return <form aria-label="Sửa thông tin tài khoản" className="space-y-3" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Tên hiển thị *" maxLength={200} value={values.displayName} disabled={mutation.pending} onChange={(event) => set("displayName")(event.target.value)} />
      <Field label="Tên đăng nhập *" maxLength={50} value={values.username} disabled={mutation.pending} onChange={(event) => set("username")(event.target.value)} />
      <Field label="Số điện thoại *" {...phoneInputProps} value={values.phoneNumber} disabled={mutation.pending} onChange={(event) => set("phoneNumber")(phoneInputValue(event.target.value))} />
      <Field label="Email" type="email" maxLength={254} value={values.email} disabled={mutation.pending} onChange={(event) => set("email")(event.target.value)} />
      <label className="block text-xs font-medium text-text-muted sm:col-span-2">Ghi chú
        <textarea className="omts-control mt-1 min-h-20" maxLength={500} value={values.note} disabled={mutation.pending} onChange={(event) => set("note")(event.target.value)} />
      </label>
    </div>
    <ErrorNotice error={problem ?? mutation.error} />
    <div className="flex flex-wrap justify-end gap-3">
      <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => setEditing(false)}>Bỏ qua</Button>
      <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button>
    </div>
  </form>;
}
