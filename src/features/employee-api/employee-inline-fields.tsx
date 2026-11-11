import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { Field, Note, Select, businessToday, control } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { dateLabel, genderLabel } from "./employee-editor-model";
import type { EmployeeEditorFieldsProps } from "./employee-editor-fields";
import styles from "./employee-detail.module.css";

export const personalFields = [
  ["code", "Mã nhân viên", 20], ["fullName", "Họ và tên", 100], ["phone", "Số điện thoại", undefined], ["birthday", "Ngày sinh", undefined],
  ["gender", "Giới tính", undefined], ["startDate", "Ngày bắt đầu làm việc", undefined], ["idNumber", "CCCD", 12],
  ["address", "Địa chỉ", 500], ["area", "Khu vực", 100], ["wardCommune", "Phường/Xã", 100],
  ["otherInformation", "Thông tin khác", 1000], ["notes", "Ghi chú", 1000],
] as const;
type PersonalKey = typeof personalFields[number][0];

/** Read-only value of one personal field, in the order of `personalFields`. */
export function personalDisplayRows(employee: Employee): [string, string | null][] {
  const read = (key: PersonalKey): string | null => {
    switch (key) {
      case "phone": return employee.phoneNumber;
      case "wardCommune": return employee.ward ?? null;
      case "birthday": return employee.birthday ? dateLabel(employee.birthday) : null;
      case "startDate": return employee.startDate ? dateLabel(employee.startDate) : null;
      case "gender": return genderLabel(employee.gender) || null;
      default: return employee[key] ?? null;
    }
  };
  return personalFields.map(([key, label]) => [label, read(key)]);
}

/** The read and edit states share the same field order and grid. */
export function EmployeeInlinePersonalFields({ values, setValues, errorProps, errors }: EmployeeEditorFieldsProps & { errors(path: string): string | undefined }) {
  const set = (key: PersonalKey, value: string) => setValues(current => ({ ...current, [key]: value }));
  const control_ = (key: PersonalKey, label: string, max: number | undefined) => {
    if (key === "notes" || key === "otherInformation") return <Note label={label} maxLength={max} {...errorProps(key)} value={values[key]} onChange={event => set(key, event.target.value)} />;
    if (key === "gender") return <Select label={label} {...errorProps(key)} value={values.gender} onChange={event => set(key, event.target.value)}>
      <option value="">Chưa chọn</option><option value="Male">Nam</option><option value="Female">Nữ</option><option value="Other">Khác</option>
    </Select>;
    if (key === "startDate") return <div className="block text-xs font-medium text-text-muted"><span>{label}</span>
      <DatePickerField label={label} name={key} value={values.startDate} max={businessToday()} className={control} invalid={!!errors(key)} describedBy={errors(key) ? `employee-inline-error-${key}` : undefined} onChange={value => set(key, value)} /></div>;
    return <Field label={key === "fullName" ? `${label} *` : label} required={key === "fullName"} type={key === "birthday" ? "date" : key === "phone" ? "tel" : "text"} max={key === "birthday" ? businessToday() : undefined}
      maxLength={max} inputMode={key === "idNumber" ? "numeric" : undefined} autoComplete="off" {...errorProps(key)} value={values[key]} onChange={event => set(key, key === "code" ? event.target.value.toUpperCase() : event.target.value)} />;
  };
  return <div className={styles.fields}>{personalFields.map(([key, label, max]) => <div key={key}>
    {control_(key, label, max)}
    {key === "code" && !errors(key) && <p className={styles.hint}>Chữ, số và dấu gạch ngang, tối đa 20 ký tự. Không trùng mã khác.</p>}
    {errors(key) && <p id={`employee-inline-error-${key}`} role="alert" className={styles.fieldError}>{errors(key)}</p>}
  </div>)}</div>;
}
