"use client";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SelectBox } from "@/components/ui/select-box";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import { phoneInputProps, phoneInputValue } from "@/components/form/phone-input-rules";
import { EmployeeTypeBadge } from "@/features/employee-api/employee-type-badge";
import { suggestUsername } from "@/features/employee-api/employee-account-username-suggestion";
import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice, Field, useRemote } from "@/features/operations/ui";
import { accountantWarningFromServer } from "./accountant-uniqueness-warning";
import type { AccountCredential } from "./account-credential-contract";
import { ACCOUNTANT_ROLE, ZONE_MANAGER_ROLE } from "./user-account-model";
import { UserCreateGrantRows } from "./user-create-grant-rows";
import { checkCreateAccount, createAccountError, newGrantRow, type CreateAccountField, type GrantRow } from "./user-create-model";
import { UserCredentialDialog } from "./user-credential-dialog";
import { createStaffAccount } from "./user-management-repository";
import { useAccountlessStaff, type PickableEmployee } from "./use-accountless-staff";
import { ZoneWorkHint } from "./zone-work-hint";

const FOCUS: Record<Exclude<CreateAccountField, "grants">, string> = { displayName: "displayName", username: "username", phoneNumber: "phoneNumber", email: "email", note: "note" };

/**
 * "Tạo tài khoản người dùng": the ONE form that makes a login, used by the account screen and by an employee's "Cấp tài khoản"
 * (then `employee` is given: the person is fixed and their name and phone are filled in). There are no password fields: the system makes a
 * temporary password and shows it once after saving. Seasonal workers are never offered. `onCreated` runs once the one-time password is acknowledged.
 */
export function UserCreateDialog({ employee, onClose, onCreated }: { employee?: PickableEmployee; onClose(): void; onCreated(account: AccountCredential["account"]): void }) {
  const [values, setValues] = useState({ displayName: employee?.fullName ?? "", username: employee ? suggestUsername(employee.fullName) : "", phoneNumber: employee?.phoneNumber ?? "", email: "", note: "" });
  const [employeeId, setEmployeeId] = useState<string | null>(employee?.id ?? null), [usernameTouched, setUsernameTouched] = useState(false);
  const [rows, setRows] = useState<GrantRow[]>([newGrantRow(1)]), [error, setError] = useState<string>(), [pending, setPending] = useState(false), [blocked, setBlocked] = useState(false);
  const [credential, setCredential] = useState<AccountCredential>();
  const busy = useRef(false), form = useRef<HTMLFormElement>(null), confirmation = useActionDialog();
  const staff = useAccountlessStaff(!employee);
  const zonesRemote = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const zones = useMemo(() => (zonesRemote.data ?? []).filter((zone) => zone.statusId === 101).map((zone) => ({ id: zone.id, name: String(zone.name ?? zone.code ?? "") })), [zonesRemote.data]);
  const set = (key: keyof typeof values, value: string) => setValues((now) => {
    const next = { ...now, [key]: value };
    // The suggestion follows the display name until the Owner types a login name themselves.
    if (key === "displayName" && !usernameTouched) next.username = suggestUsername(value);
    return next;
  });
  function pick(id: string) {
    const person = staff.data?.find((item) => item.id === id);
    setEmployeeId(person?.id ?? null);
    if (!person) return;
    setValues((now) => ({ ...now, displayName: now.displayName.trim() ? now.displayName : person.fullName, phoneNumber: now.phoneNumber || person.phoneNumber || "", username: usernameTouched && now.username ? now.username : suggestUsername(now.displayName.trim() ? now.displayName : person.fullName) }));
  }
  async function save() {
    if (busy.current || blocked) return;
    const checked = checkCreateAccount({ ...values, employeeId }, rows, zones);
    if (!checked.ok) {
      setError(checked.message);
      form.current?.querySelector<HTMLElement>(checked.field === "grants" ? "[data-grant-row]" : `[name="${FOCUS[checked.field]}"]`)?.scrollIntoView?.({ block: "center" });
      form.current?.querySelector<HTMLElement>(checked.field === "grants" ? "[data-grant-row] select, [data-grant-row] button" : `[name="${FOCUS[checked.field]}"]`)?.focus();
      return;
    }
    busy.current = true; setPending(true); setError(undefined);
    try {
      // A second Accountant only warns; the Owner's OK continues.
      const warning = checked.body.grants.some((grant) => grant.role === ACCOUNTANT_ROLE) ? await accountantWarningFromServer() : undefined;
      if (warning && !(await confirmation.confirm(warning))) return;
      const result = await createStaffAccount(checked.body);
      if (result.status === "success") setCredential(result.data);
      else { setError(createAccountError(result)); setBlocked(result.uncertain); }
    } catch { setBlocked(true); setError(createAccountError({ status: "error", httpStatus: 0, uncertain: true })); }
    finally { busy.current = false; setPending(false); }
  }
  const acknowledge = (account: AccountCredential["account"]) => { setCredential(undefined); onClose(); onCreated(account); };
  if (credential) return <UserCredentialDialog title="Đã tạo tài khoản" credential={credential} onClose={() => acknowledge(credential.account)} />;
  const person = employee ?? staff.data?.find((item) => item.id === employeeId);
  // Warn (never block) when a chosen zone is not among the person's working zones.
  const workZoneIds = person?.workingZones?.map((zone) => zone.id);
  const missingZoneNames = workZoneIds ? [...new Set(rows.filter((row) => row.role === ZONE_MANAGER_ROLE && !row.allZones).flatMap((row) => row.zoneIds))]
    .filter((id) => !workZoneIds.includes(id)).map((id) => zones.find((zone) => zone.id === id)?.name ?? "đã chọn") : [];
  const noteField: ReactNode = <details className="rounded-card border border-border px-3 py-2" open={!!values.note}>
    <summary className="cursor-pointer text-sm font-semibold">Ghi chú</summary>
    <textarea name="note" aria-label="Ghi chú" className="omts-control mt-2 min-h-20" maxLength={500} value={values.note} disabled={pending} onChange={(event) => set("note", event.target.value)} />
  </details>;
  // Rendered on <body>: callers sit inside other forms, and a <form> inside a <form> is invalid HTML.
  return createPortal(<Dialog open title="Tạo tài khoản người dùng" size="lg" dismissible={!pending} onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    {confirmation.dialog}
    <form ref={form} className="space-y-4" noValidate onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void save(); }}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Tên hiển thị *" name="displayName" maxLength={200} autoComplete="off" value={values.displayName} disabled={pending || blocked} onChange={(event) => set("displayName", event.target.value)} />
        <Field label="Điện thoại *" name="phoneNumber" {...phoneInputProps} autoComplete="off" value={values.phoneNumber} disabled={pending || blocked} onChange={(event) => set("phoneNumber", phoneInputValue(event.target.value))} />
        <Field label="Email" name="email" type="email" maxLength={254} autoComplete="off" value={values.email} disabled={pending || blocked} onChange={(event) => set("email", event.target.value)} />
        <Field label="Tên đăng nhập *" name="username" maxLength={50} autoComplete="off" value={values.username} disabled={pending || blocked} onChange={(event) => { setUsernameTouched(true); set("username", event.target.value); }} />
      </div>
      <p className="rounded-control bg-surface-subtle p-2 text-sm">Hệ thống tạo mật khẩu tạm, hiện một lần sau khi lưu.</p>
      <div className="space-y-1">
        <p className="text-xs font-medium text-text-muted">Gắn với nhân viên</p>
        {employee ? <p className="flex min-h-9 items-center gap-2 text-sm font-semibold">{employee.fullName}<EmployeeTypeBadge type={employee.employeeType} showLabel /></p>
          : <SelectBox aria-label="Gắn với nhân viên" className="omts-control" value={employeeId ?? ""} disabled={pending || blocked || staff.loading} onChange={(event) => pick(event.target.value)}>
            <option value="">Không gắn nhân viên</option>
            {(staff.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.code}</option>)}
          </SelectBox>}
        {!employee && staff.error ? <p className="text-xs text-danger">Chưa đọc được danh sách nhân viên. Bạn vẫn tạo được tài khoản không gắn nhân viên.</p>
          : <p className="text-xs text-text-muted">{person ? "Tài khoản này sẽ là tài khoản đăng nhập của nhân viên đó." : "Chủ hoặc kế toán không cần gắn nhân viên. Chỉ hiện nhân viên nội bộ chưa có tài khoản."}</p>}
      </div>
      <UserCreateGrantRows rows={rows} zones={zones} disabled={pending || blocked} zonesNote={zonesRemote.loading ? "Đang tải danh sách vùng…" : zonesRemote.error ? "Chưa đọc được danh sách vùng." : undefined} onChange={setRows} />
      {person && <ZoneWorkHint zoneNames={missingZoneNames} employeeId={person.id} employeeName={person.fullName} />}
      {noteField}
      <ErrorNotice error={error} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button className="w-auto" variant="secondary" disabled={pending} onClick={onClose}>Hủy</Button>
        <Button className="w-auto" type="submit" isPending={pending} disabled={blocked}>Lưu</Button>
      </div>
    </form>
  </Dialog>, document.body);
}
