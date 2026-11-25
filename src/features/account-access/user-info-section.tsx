"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { phoneInputProps, phoneInputValue, validVietnamesePhone, vietnamesePhoneMessage } from "@/components/form/phone-input-rules";
import { createWorkspaceRepository } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice, Field, useMutation } from "@/features/operations/ui";
import { toUserAccount, type UserAccount } from "./user-account-model";

/** Contact details of the account, edited in place (DESIGN_GUIDELINES 1.12). Saving sends the row version so a stale edit gets MSG06. */
export function UserInfoSection({ account, disabled, employeeLabel, onSaved }: { account: UserAccount; disabled?: boolean; employeeLabel?: string; onSaved(saved: UserAccount): void }) {
  const repository = useMemo(() => createWorkspaceRepository("accounts"), []);
  const [editing, setEditing] = useState(false), [problem, setProblem] = useState<string>();
  const [values, setValues] = useState({ displayName: account.displayName, username: account.username, phoneNumber: account.phoneNumber ?? "", email: account.email ?? "" });
  const mutation = useMutation();
  const set = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  function startEdit() {
    setValues({ displayName: account.displayName, username: account.username, phoneNumber: account.phoneNumber ?? "", email: account.email ?? "" });
    setProblem(undefined); setEditing(true);
  }
  async function save() {
    if (mutation.busy() || mutation.blocked) return;
    if (!values.displayName.trim() || !values.username.trim()) { setProblem("Tên hiển thị và tên đăng nhập là bắt buộc."); return; }
    if (!validVietnamesePhone(values.phoneNumber)) { setProblem(vietnamesePhoneMessage); return; }
    setProblem(undefined);
    const body = { displayName: values.displayName.trim(), username: values.username.trim(), phoneNumber: values.phoneNumber, email: values.email.trim() || null, rowVersion: account.rowVersion };
    const saved = await mutation.run(() => repository.mutate("update", body, account.id));
    if (saved) { onSaved(toUserAccount(saved)); setEditing(false); }
  }
  if (!editing) return <section aria-label="Thông tin đăng nhập" className="space-y-3">
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {([["Tên hiển thị", account.displayName], ["Tên đăng nhập", account.username], ["Số điện thoại", account.phoneNumber], ["Email", account.email], ["Nhân viên", employeeLabel]] as const)
        .map(([label, value]) => <div key={label}><dt className="text-xs text-text-muted">{label}</dt><dd className="break-all text-sm font-medium">{value || "—"}</dd></div>)}
    </dl>
    <Button className="w-auto" variant="secondary" disabled={disabled} onClick={startEdit}>Sửa thông tin đăng nhập</Button>
  </section>;
  return <form aria-label="Sửa thông tin đăng nhập" className="space-y-3" noValidate onSubmit={(event) => { event.preventDefault(); void save(); }}>
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Tên hiển thị *" maxLength={200} value={values.displayName} disabled={mutation.pending} onChange={(event) => set("displayName")(event.target.value)} />
      <Field label="Tên đăng nhập *" maxLength={50} value={values.username} disabled={mutation.pending} onChange={(event) => set("username")(event.target.value)} />
      <Field label="Số điện thoại *" {...phoneInputProps} value={values.phoneNumber} disabled={mutation.pending} onChange={(event) => set("phoneNumber")(phoneInputValue(event.target.value))} />
      <Field label="Email" type="email" maxLength={254} value={values.email} disabled={mutation.pending} onChange={(event) => set("email")(event.target.value)} />
    </div>
    <ErrorNotice error={problem ?? mutation.error} />
    <div className="flex flex-wrap justify-end gap-3">
      <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => setEditing(false)}>Bỏ qua</Button>
      <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button>
    </div>
  </form>;
}
