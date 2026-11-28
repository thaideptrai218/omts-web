"use client";
import { digitsOnly } from "@/components/form/phone-input-rules";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { AddressFields } from "@/features/address-invoice/address-fields";
import { businessToday, control, Field, Note, Select } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import type { LinkableAccount } from "./employee-account-contract";
import { EmployeeAccountGrantChoice } from "./employee-account-grant-choice";
import { accountLabel } from "./employee-editor-model";
import { FieldMessage, type EmployeeFormFieldProps } from "./employee-form-identity";
import { NEW_ACCOUNT } from "./employee-form-model";
import { suggestUsername } from "./employee-account-username-suggestion";
import styles from "./employee-form.module.css";

/** The fields of "Thông tin công việc": start date, login account (Owner), notes. */
export function WorkFields({ state, setState, error, errorProps, locked, account }: EmployeeFormFieldProps & {
  account: { offered: boolean; existing: Employee["account"]; linkable: LinkableAccount[] | undefined; failed: boolean; onZones(names: Map<string, string>): void };
}) {
  const patch = (next: Partial<EmployeeFormFieldProps["state"]>) => setState(current => ({ ...current, ...next }));
  return <>
    <div>
      <span className={styles.fieldLabel}>Ngày bắt đầu làm việc</span>
      <DatePickerField allowClear label="Ngày bắt đầu làm việc" name="startDate" disabled={locked} value={state.startDate} max={businessToday()} className={control} invalid={!!error("startDate")} describedBy={error("startDate") ? "employee-form-error-startDate" : undefined} onChange={startDate => patch({ startDate })} />
      <FieldMessage path="startDate" error={error} />
    </div>
    {account.existing && <div>
      <span className={styles.fieldLabel}>Tài khoản đăng nhập</span>
      <p className="mt-1.5 text-sm">@{account.existing.username} · {accountLabel(account.existing.status)}</p>
      <p className={styles.hint}>Vai trò, mật khẩu và khóa tài khoản quản lý ở màn Tài khoản người dùng.</p>
    </div>}
    {account.offered && <div className={styles.wide}>
      <Select label="Tài khoản đăng nhập" searchable searchLabel="Tìm tài khoản" {...errorProps("accountChoice")} value={state.accountChoice}
        onChange={event => { const accountChoice = event.target.value; patch({ accountChoice, ...(accountChoice === NEW_ACCOUNT && !state.username ? { username: suggestUsername(state.fullName) } : {}) }); }}>
        <option value="">Chọn tài khoản</option>
        {account.linkable?.map(item => <option key={item.id} value={item.id}>{item.displayName} (@{item.username})</option>)}
        <option value={NEW_ACCOUNT}>+ Thêm tài khoản</option>
      </Select>
      {account.failed && <p className={styles.error}>Chưa tải được danh sách tài khoản có sẵn. Vẫn có thể thêm tài khoản mới.</p>}
      {!!state.accountChoice && state.accountChoice !== NEW_ACCOUNT && <p className={styles.hint}>Gắn tài khoản có sẵn cho nhân viên này; quyền của tài khoản giữ nguyên.</p>}
      <FieldMessage path="accountChoice" error={error} />
    </div>}
    {account.offered && state.accountChoice === NEW_ACCOUNT && <>
      <div className={styles.wide}>
        <Field label="Tên đăng nhập *" required minLength={3} maxLength={50} autoComplete="off" {...errorProps("username")} value={state.username} onChange={event => patch({ username: event.target.value })} />
        <p className={styles.hint}>3–50 ký tự: chữ, số, dấu chấm, gạch ngang hoặc gạch dưới. Tên hiển thị và số điện thoại lấy từ hồ sơ; mật khẩu tạm chỉ hiện một lần sau khi lưu.</p>
        <FieldMessage path="username" error={error} />
      </div>
      {state.employeeType === "SeasonalWorker"
        ? <p className={`${styles.hint} ${styles.wide}`}>Tài khoản của nhân viên thời vụ có vai trò Nhân viên, dùng để đăng nhập ứng dụng.</p>
        : <div className={styles.wide}><EmployeeAccountGrantChoice selection={state.grants} onZones={account.onZones} onChange={grants => patch({ grants })} /><FieldMessage path="grants" error={error} /></div>}
    </>}
    <div className={styles.wide}>
      <Note label="Ghi chú" maxLength={1000} {...errorProps("notes")} value={state.notes} onChange={event => patch({ notes: event.target.value })} />
      <FieldMessage path="notes" error={error} />
    </div>
  </>;
}

const bankFields = [["accountNumber", "Số tài khoản"], ["bankName", "Ngân hàng"], ["accountHolderName", "Chủ tài khoản"]] as const;

/** Bank account: all three fields or none; the account number keeps its leading zeros as text. */
export function BankFields({ state, setState, error, errorProps }: EmployeeFormFieldProps) {
  const used = Object.values(state.bankAccount).some(value => value.trim());
  return <>
    <p className={`${styles.hint} ${styles.wide}`}>Có thể để trống cả nhóm. Nếu nhập, cần đủ số tài khoản (6–20 chữ số), ngân hàng và chủ tài khoản.</p>
    {bankFields.map(([key, label]) => <div key={key}>
      <Field label={label + (used ? " *" : "")} required={used} maxLength={key === "accountNumber" ? 20 : 100} inputMode={key === "accountNumber" ? "numeric" : undefined} pattern={key === "accountNumber" ? "[0-9]{6,20}" : undefined} autoComplete="off" {...errorProps(`bankAccount.${key}`)} value={state.bankAccount[key]}
        onChange={event => setState(current => ({ ...current, bankAccount: { ...current.bankAccount, [key]: key === "accountHolderName" ? event.target.value.toUpperCase() : key === "accountNumber" ? digitsOnly(event.target.value, 20) : event.target.value } }))} />
      <FieldMessage path={`bankAccount.${key}`} error={error} />
    </div>)}
  </>;
}

/** ID number, birth date, gender, the address picked from the administrative units, and other information. */
export function PersonalFields({ state, setState, error, errorProps, locked }: EmployeeFormFieldProps) {
  const patch = (next: Partial<EmployeeFormFieldProps["state"]>) => setState(current => ({ ...current, ...next }));
  return <>
    <div>
      <Field label="Số CMND/CCCD" maxLength={12} inputMode="numeric" pattern="([0-9]{9}|[0-9]{12})" autoComplete="off" disabled={locked} {...errorProps("idNumber")} value={state.idNumber} onChange={event => patch({ idNumber: digitsOnly(event.target.value, 12) })} />
      <p className={styles.hint}>9 hoặc 12 chữ số.</p>
      <FieldMessage path="idNumber" error={error} />
    </div>
    <div>
      <span className={styles.fieldLabel}>Ngày sinh</span>
      <DatePickerField allowClear label="Ngày sinh" name="birthday" disabled={locked} value={state.birthday} max={businessToday()} className={control} invalid={!!error("birthday")} describedBy={error("birthday") ? "employee-form-error-birthday" : undefined} onChange={birthday => patch({ birthday })} />
      <FieldMessage path="birthday" error={error} />
    </div>
    <div>
      <span className={styles.fieldLabel}>Giới tính</span>
      <div className={styles.radios} role="radiogroup" aria-label="Giới tính">
        {([["Male", "Nam"], ["Female", "Nữ"]] as const).map(([value, label]) => <label key={value}>
          <input type="radio" name="employee-gender" disabled={locked} checked={state.gender === value} onChange={() => patch({ gender: value })} />{label}
        </label>)}
      </div>
      <FieldMessage path="gender" error={error} />
    </div>
    <AddressFields value={state.address} onChange={address => patch({ address })} />
    <div className={styles.wide}><FieldMessage path="address" error={error} /></div>
    <div className={styles.wide}>
      <Note label="Thông tin khác" maxLength={1000} {...errorProps("otherInformation")} value={state.otherInformation} onChange={event => patch({ otherInformation: event.target.value })} />
      <FieldMessage path="otherInformation" error={error} />
    </div>
  </>;
}
