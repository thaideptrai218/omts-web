"use client";
import { MoneyInput } from "@/components/form/money-input";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { control, Select } from "@/features/operations/ui";
import { HOURLY_AMOUNT_TEXT, PAY_FIELD_SHIFTS_LABEL, PER_SHIFT_AMOUNT_TEXT, salaryTypeLabel, salaryTypes, type SalaryForm, type SalaryIssues } from "./employee-salary-model";
import styles from "./employee-form.module.css";

/**
 * The fields of the "Thiết lập lương" tab of the employee dialog: type, amount (fixed monthly only, with the choice to pay the shifts of field work
 * on top) and the date it applies from. The dialog owns the values and saves them after the profile.
 */
export function SalaryFields({ form, issues, readOnly, onChange }: { form: SalaryForm; issues: SalaryIssues; readOnly: boolean; onChange(patch: Partial<SalaryForm>): void }) {
  return <fieldset disabled={readOnly} className={styles.salaryFields} aria-label="Thiết lập lương">
    <Select label="Loại lương *" value={form.type} onChange={event => onChange({ type: event.target.value as SalaryForm["type"] })}>
      {salaryTypes.map(type => <option key={type} value={type}>{salaryTypeLabel(type)}</option>)}
    </Select>
    <div>
      <span className={styles.fieldLabel}>Mức lương{form.type === "FixedMonthly" ? " *" : ""}</span>
      {form.type === "FixedMonthly"
        ? <MoneyInput label="Mức lương (đồng/tháng)" autoThousands min={1} value={form.amount} invalid={!!issues.amount} onChange={amount => onChange({ amount })} wrapperClassName="mt-1" />
        : <p className={styles.hint}>{form.type === "PerShift" ? PER_SHIFT_AMOUNT_TEXT : HOURLY_AMOUNT_TEXT}</p>}
      {issues.amount && <p role="alert" className={styles.error}>{issues.amount}</p>}
    </div>
    <div>
      <span className={styles.fieldLabel}>Ngày áp dụng *</span>
      <DatePickerField label="Ngày áp dụng" className={control} value={form.effectiveFrom} invalid={!!issues.effectiveFrom} onChange={effectiveFrom => onChange({ effectiveFrom })} />
      {issues.effectiveFrom && <p role="alert" className={styles.error}>{issues.effectiveFrom}</p>}
    </div>
    {form.type === "FixedMonthly" && <label className="flex items-center gap-2 text-sm [grid-column:1/-1]">
      <input type="checkbox" className="omts-check" checked={form.payFieldShifts} onChange={event => onChange({ payFieldShifts: event.target.checked })} />{PAY_FIELD_SHIFTS_LABEL}
      <span className={styles.hint}>Ca làm ngoài hiện trường (thu hoạch, ươm, thả giống) được trả thêm theo đơn giá ca.</span>
    </label>}
  </fieldset>;
}
