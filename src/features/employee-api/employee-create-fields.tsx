"use client";
import type { Dispatch, SetStateAction } from "react";
import { digitsOnly, phoneInputProps, phoneInputValue } from "@/components/form/phone-input-rules";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { businessToday, control, Field, Note, Select } from "@/features/operations/ui";
import type { EmployeeCreateValues } from "./employee-create-model";
import styles from "./employee-create-form.module.css";

/** Builds name / aria-invalid / aria-describedby props for a field path. */
export type EmployeeCreateErrorProps = (name: string) => {
  name: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

export type EmployeeCreateFieldsProps = {
  values: EmployeeCreateValues;
  setValues: Dispatch<SetStateAction<EmployeeCreateValues>>;
  errorProps: EmployeeCreateErrorProps;
  fieldError(path: string): string | undefined;
};

export function FieldError({ path, fieldError }: { path: string; fieldError: EmployeeCreateFieldsProps["fieldError"] }) {
  const message = fieldError(path);
  return message ? <p id={`employee-create-error-${path}`} className={styles.error}>{message}</p> : null;
}

export function EmployeeCreateBasicFields({ values, setValues, errorProps, fieldError }: EmployeeCreateFieldsProps) {
  const set = (patch: Partial<EmployeeCreateValues>) => setValues(current => ({ ...current, ...patch }));
  return <>
    <div className={styles.grid}>
      <div>
        <Field label="Mã nhân viên" maxLength={20} pattern="[A-Za-z0-9-]{1,20}" autoComplete="off" placeholder="Tự động" {...errorProps("code")} value={values.code} onChange={event => set({ code: event.target.value.toUpperCase() })} />
        <p className={styles.hint}>Để trống để hệ thống tự sinh.</p>
        <FieldError path="code" fieldError={fieldError} />
      </div>
      <div>
        <Field label="Họ và tên *" required maxLength={100} autoComplete="off" {...errorProps("fullName")} value={values.fullName} onChange={event => set({ fullName: event.target.value })} />
        <FieldError path="fullName" fieldError={fieldError} />
      </div>
      <div>
        <Field label={values.createAccount ? "Số điện thoại *" : "Số điện thoại"} required={values.createAccount} {...phoneInputProps} autoComplete="off" {...errorProps("phone")} value={values.phone} onChange={event => set({ phone: phoneInputValue(event.target.value) })} />
        <FieldError path="phone" fieldError={fieldError} />
      </div>
      <div>
        <div className="block text-xs font-medium text-text-muted">
          <span>Ngày sinh</span>
          <DatePickerField allowClear label="Ngày sinh" name="birthday" value={values.birthday} max={businessToday()} className={control} invalid={fieldError("birthday") !== undefined} describedBy={fieldError("birthday") ? "employee-create-error-birthday" : undefined} onChange={birthday => set({ birthday })} />
        </div>
        <FieldError path="birthday" fieldError={fieldError} />
      </div>
      <div>
        <Select label="Giới tính" {...errorProps("gender")} value={values.gender} onChange={event => set({ gender: event.target.value as EmployeeCreateValues["gender"] })}>
          <option value="">Chưa chọn</option>
          <option value="Male">Nam</option>
          <option value="Female">Nữ</option>
          <option value="Other">Khác</option>
        </Select>
        <FieldError path="gender" fieldError={fieldError} />
      </div>
      <div>
        <Select label="Loại nhân viên *" required {...errorProps("employeeType")} value={values.employeeType} onChange={event => set({ employeeType: event.target.value })}>
          <option value="">Chọn loại nhân viên</option>
          <option value="SeasonalWorker">Thời vụ</option>
          <option value="Staff">Nhân viên</option>
        </Select>
        <FieldError path="employeeType" fieldError={fieldError} />
      </div>
    </div>
  </>;
}

/** Zones missing from the catalogue or stopped can only be unticked; active zones are offered. */
export function EmployeeCreateWorkFields({ values, setValues, errorProps, fieldError, zones, jobTypes }: EmployeeCreateFieldsProps & {
  zones: ApiRecord[]; jobTypes: { id: string; name: string }[];
}) {
  const toggle = (key: "workingZoneIds" | "jobTypeIds", id: string, checked: boolean) =>
    setValues(current => ({ ...current, [key]: checked ? [...current[key], id] : current[key].filter(entry => entry !== id) }));
  const offered = zones.filter(zone => zone.statusId === 101 || values.workingZoneIds.includes(zone.id));
  const missing = values.workingZoneIds.filter(id => !zones.some(zone => zone.id === id));
  return <>
    <div className={styles.grid}>
      <div>
        <div className="block text-xs font-medium text-text-muted">
          <span>Ngày bắt đầu làm việc</span>
          <DatePickerField allowClear label="Ngày bắt đầu làm việc" name="startDate" value={values.startDate} max={businessToday()} className={control} invalid={fieldError("startDate") !== undefined} describedBy={fieldError("startDate") ? "employee-create-error-startDate" : undefined} onChange={startDate => setValues(current => ({ ...current, startDate }))} />
        </div>
        <FieldError path="startDate" fieldError={fieldError} />
      </div>
    </div>
    <fieldset className={styles.choices} tabIndex={-1} {...errorProps("workingZoneIds")}>
      <legend>Vùng làm việc *</legend>
      {offered.map(zone => (
        <label key={zone.id} className={styles.choice}>
          <input type="checkbox" checked={values.workingZoneIds.includes(zone.id)} onChange={event => toggle("workingZoneIds", zone.id, event.target.checked)} />
          {String(zone.code)} · {String(zone.name)}{zone.statusId !== 101 ? " (đã ngừng — cần bỏ chọn)" : ""}
        </label>
      ))}
      {missing.map(id => (
        <label key={id} className={styles.choice}>
          <input type="checkbox" checked onChange={event => toggle("workingZoneIds", id, event.target.checked)} />Vùng chưa có trong danh mục
        </label>
      ))}
      {!offered.length && !missing.length && <p className={styles.hint}>Chưa có vùng đang hoạt động.</p>}
    </fieldset>
    <FieldError path="workingZoneIds" fieldError={fieldError} />
    <fieldset className={styles.choices} tabIndex={-1} {...errorProps("jobTypeIds")}>
      <legend>Loại công việc</legend>
      {jobTypes.map(job => (
        <label key={job.id} className={styles.choice}>
          <input type="checkbox" checked={values.jobTypeIds.includes(job.id)} onChange={event => toggle("jobTypeIds", job.id, event.target.checked)} />{job.name}
        </label>
      ))}
      {!jobTypes.length && <p className={styles.hint}>Chưa có loại công việc nào.</p>}
    </fieldset>
    <FieldError path="jobTypeIds" fieldError={fieldError} />
  </>;
}

const personalFields = [["address", "Địa chỉ", 500], ["area", "Khu vực", 100], ["wardCommune", "Phường/Xã", 100]] as const;

export function EmployeeCreatePersonalFields({ values, setValues, errorProps, fieldError }: EmployeeCreateFieldsProps) {
  return <>
    <div className={styles.grid}>
      <div>
        <Field label="CCCD/CMND" maxLength={12} inputMode="numeric" pattern="([0-9]{9}|[0-9]{12})" autoComplete="off" {...errorProps("idNumber")} value={values.idNumber} onChange={event => setValues(current => ({ ...current, idNumber: digitsOnly(event.target.value, 12) }))} />
        <p className={styles.hint}>9 hoặc 12 chữ số.</p>
        <FieldError path="idNumber" fieldError={fieldError} />
      </div>
      {personalFields.map(([key, label, max]) => (
        <div key={key}>
          <Field label={label} maxLength={max} autoComplete="off" {...errorProps(key)} value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />
          <FieldError path={key} fieldError={fieldError} />
        </div>
      ))}
    </div>
    {([["otherInformation", "Thông tin khác"], ["notes", "Ghi chú"]] as const).map(([key, label]) => (
      <div key={key}>
        <Note label={label} maxLength={1000} {...errorProps(key)} value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />
        <FieldError path={key} fieldError={fieldError} />
      </div>
    ))}
  </>;
}

const bankFields = [["bankName", "Ngân hàng"], ["accountNumber", "Số tài khoản"], ["accountHolderName", "Chủ tài khoản"]] as const;

export function EmployeeCreateBankFields({ values, setValues, errorProps, fieldError }: EmployeeCreateFieldsProps) {
  return <>
    <p id="employee-create-bank-help" className={styles.hint}>
      Có thể để trống cả nhóm. Nếu nhập, cần đủ ngân hàng, số tài khoản và chủ tài khoản. Số tài khoản gồm 6–20 chữ số,
      giữ số 0 ở đầu; tên ngân hàng và chủ tài khoản tối đa 100 ký tự.
    </p>
    <div className={styles.grid}>
      {bankFields.map(([key, label]) => (
        <div key={key}>
          <Field label={label + (Object.values(values.bankAccount).some(value => value.trim()) ? " *" : "")} required={Object.values(values.bankAccount).some(value => value.trim())} maxLength={key === "accountNumber" ? 20 : 100} inputMode={key === "accountNumber" ? "numeric" : undefined} pattern={key === "accountNumber" ? "[0-9]{6,20}" : undefined} autoComplete="off" {...errorProps(`bankAccount.${key}`)} value={values.bankAccount[key]}
            // The account holder name is upper-cased as it is typed.
            onChange={event => setValues(current => ({ ...current, bankAccount: { ...current.bankAccount, [key]: key === "accountHolderName" ? event.target.value.toUpperCase() : key === "accountNumber" ? digitsOnly(event.target.value, 20) : event.target.value } }))} />
          <FieldError path={`bankAccount.${key}`} fieldError={fieldError} />
        </div>
      ))}
    </div>
  </>;
}
