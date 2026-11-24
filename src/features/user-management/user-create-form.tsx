"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection } from "@/components/ui/management-screen/management-table";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { phoneInputProps, phoneInputValue } from "@/components/form/phone-input-rules";
import { ErrorNotice, Field, Select, useMutation } from "@/features/operations/ui";
import { accountantUniquenessWarning } from "./accountant-uniqueness-warning";
import { createUserRequestSchema, type AccountCredential } from "./account-credential-contract";
import { emptyGrantSelection, selectionToGrants, type GrantSelection } from "./user-grant-selection";
import { firstInvalidField, validateCreateUser, type CreateUserErrors, type CreateUserField } from "./user-create-validation";
import { UserRoleZonePicker } from "./user-role-zone-picker";
import { grantSummaryLine } from "./user-grant-summary";
import type { UserAccount } from "./user-account-model";
import type { EmployeeLookup, UserZone } from "./use-user-accounts";
import { createUserAccount } from "./user-management-repository";

export type UserCreateInitial = { grants: GrantSelection; title: string; hint?: string };

/**
 * "Tạo người dùng" and "Sao chép người dùng" in one dialog: identity, optional linked employee, then role and zones.
 * A copy starts from the template's grants and nothing else (the new person has their own name, username and phone).
 * The account is created with its grants in one request (Grants[]), so there is no half-configured account to finish later.
 */
export function UserCreateForm({ accounts, zones, employees, initial, onClose, onCreated }: {
  accounts: readonly UserAccount[]; zones: readonly UserZone[]; employees: ReadonlyMap<string, EmployeeLookup>;
  initial: UserCreateInitial; onClose(): void; onCreated(credential: AccountCredential): void;
}) {
  const [values, setValues] = useState({ displayName: "", username: "", phoneNumber: "", email: "", employeeId: "" });
  const [selection, setSelection] = useState<GrantSelection>(initial.grants ?? emptyGrantSelection);
  const [problem, setProblem] = useState<string>(), [errors, setErrors] = useState<CreateUserErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const mutation = useMutation(), confirmation = useActionDialog();
  // Only employees still working and without an account can be linked (the backend re-checks).
  const linkable = [...employees.values()].filter((employee) => employee.employed && !employee.hasAccount && !accounts.some((account) => account.employeeId === employee.id));
  const set = (key: keyof typeof values) => (value: string) => setValues((current) => ({ ...current, [key]: value }));
  function pickEmployee(id: string) {
    const employee = employees.get(id);
    setValues((current) => ({ ...current, employeeId: id, ...(employee ? { displayName: current.displayName || employee.fullName, phoneNumber: current.phoneNumber || employee.phoneNumber } : {}) }));
  }
  /** Marks one field invalid in place: `aria-invalid` plus the id of its message for `aria-describedby`. */
  const invalid = (field: CreateUserField) => errors[field] ? { "aria-invalid": true as const, "aria-describedby": `create-user-${field}-error` } : {};
  const message = (field: CreateUserField) => errors[field] ? <p id={`create-user-${field}-error`} role="alert" className="mt-1 text-xs text-danger">{errors[field]}</p> : null;
  const edit = (field: keyof typeof values) => (value: string) => { set(field)(value); if (errors[field as CreateUserField]) setErrors((now) => ({ ...now, [field]: undefined })); };
  async function submit() {
    if (mutation.busy() || mutation.blocked) return;
    setProblem(undefined);
    const found = validateCreateUser(values, selection);
    setErrors(found);
    const first = firstInvalidField(found);
    if (first) { formRef.current?.querySelector<HTMLElement>(first === "grants" ? "input[type=radio]" : `[name=${first}]`)?.focus(); return; }
    const grants = selectionToGrants(selection);
    const parsed = createUserRequestSchema.safeParse({ ...values, employeeId: values.employeeId || null, email: values.email.trim() || null, grants });
    if (!parsed.success) { setProblem(parsed.error.issues[0]?.message ?? "Vui lòng kiểm tra lại thông tin đã nhập."); return; }
    // Decision D9: a second Accountant is a warning, never a block.
    const warning = accountantUniquenessWarning(accounts, grants.map((grant) => grant.role));
    if (warning && !(await confirmation.confirm(warning))) return;
    const credential = await mutation.run(() => createUserAccount(parsed.data));
    if (credential) onCreated(credential);
  }
  return <Dialog open title={initial.title} size="lg" dismissible={!mutation.pending} onOpenChange={(open) => { if (!open) onClose(); }}>
    {confirmation.dialog}
    <form ref={formRef} className="space-y-3" noValidate onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      {initial.hint && <p className="text-sm text-text-muted">{initial.hint}</p>}
      <CollapsibleSection title="Thông tin đăng nhập" description="Mật khẩu tạm được tạo tự động và chỉ hiển thị một lần sau khi lưu." columns={2}>
        <Select label="Nhân viên liên kết (không bắt buộc)" value={values.employeeId} disabled={mutation.pending} onChange={(event) => pickEmployee(event.target.value)}>
          <option value="">Không liên kết</option>{linkable.map((employee) => <option key={employee.id} value={employee.id}>{employee.code} · {employee.fullName}</option>)}
        </Select>
        <div><Field label="Tên hiển thị *" name="displayName" maxLength={200} autoComplete="off" {...invalid("displayName")} value={values.displayName} disabled={mutation.pending} onChange={(event) => edit("displayName")(event.target.value)} />{message("displayName")}</div>
        <div><Field label="Tên đăng nhập *" name="username" maxLength={50} autoComplete="off" {...invalid("username")} value={values.username} disabled={mutation.pending} onChange={(event) => edit("username")(event.target.value)} />{message("username")}</div>
        <div><Field label="Số điện thoại *" name="phoneNumber" {...phoneInputProps} autoComplete="off" {...invalid("phoneNumber")} value={values.phoneNumber} disabled={mutation.pending} onChange={(event) => edit("phoneNumber")(phoneInputValue(event.target.value))} />{message("phoneNumber")}</div>
        <div><Field label="Email" name="email" type="email" maxLength={254} autoComplete="off" {...invalid("email")} value={values.email} disabled={mutation.pending} onChange={(event) => edit("email")(event.target.value)} />{message("email")}</div>
      </CollapsibleSection>
      <CollapsibleSection title="Vai trò và vùng" description="Không bắt buộc: có thể phân quyền sau." columns={1}>
        <UserRoleZonePicker selection={selection} zones={zones} disabled={mutation.pending} onChange={(next) => { setSelection(next); if (errors.grants) setErrors((now) => ({ ...now, grants: undefined })); }} />
        {message("grants")}
        <p className="text-sm text-text-muted" aria-live="polite">{grantSummaryLine(values.username, selection, zones)}</p>
      </CollapsibleSection>
      <ErrorNotice error={problem ?? mutation.error} />
      {mutation.uncertain && <p className="text-sm">Hãy đóng hộp thoại và tải lại danh sách để đối chiếu trước khi tạo lại; lệnh tạo không được gửi lại tự động.</p>}
      <div className="flex flex-wrap justify-end gap-3 pt-1">
        <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={onClose}>Bỏ qua</Button>
        <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button>
      </div>
    </form>
  </Dialog>;
}
