import { Field, Note, businessToday } from "@/features/operations/ui";
import type { EmployeeEditorFieldsProps } from "./employee-editor-fields";
import styles from "./employee-detail.module.css";

export const personalFields = [
  ["fullName", "Họ và tên", 100], ["phone", "Số điện thoại", undefined], ["birthday", "Ngày sinh", undefined],
  ["address", "Địa chỉ", 500], ["area", "Khu vực", 100], ["wardCommune", "Phường/Xã", 100],
  ["otherInformation", "Thông tin khác", 1000], ["notes", "Ghi chú", 1000],
] as const;

/** The read and edit states share the same field order and grid. */
export function EmployeeInlinePersonalFields({ values, setValues, errorProps, errors }: EmployeeEditorFieldsProps & { errors(path: string): string | undefined }) {
  return <div className={styles.fields}>{personalFields.map(([key, label, max]) => <div key={key}>
    {key === "notes" || key === "otherInformation" ? <Note label={label} maxLength={max} {...errorProps(key)} value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />
      : <Field label={key === "fullName" ? `${label} *` : label} required={key === "fullName"} type={key === "birthday" ? "date" : key === "phone" ? "tel" : "text"} max={key === "birthday" ? businessToday() : undefined} maxLength={max} {...errorProps(key)} value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />}
    {errors(key) && <p id={`employee-inline-error-${key}`} role="alert" className={styles.fieldError}>{errors(key)}</p>}
  </div>)}</div>;
}
