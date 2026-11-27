"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MoneyInput } from "@/components/form/money-input";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { useToast } from "@/components/ui/toast-provider";
import { formatVietnameseDateTime } from "@/shared/format/date-time";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, control, ErrorNotice, Select, Skeleton, useMutation, useRemote } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { dateLabel } from "./employee-editor-model";
import { employeeSalarySchema, type EmployeeSalary } from "./employee-salary-contract";
import { parseSalaryForm, salaryAmountText, salaryFormOf, salaryNotSet, salaryTypeLabel, salaryTypes, HOURLY_AMOUNT_TEXT, type SalaryForm, type SalaryIssues } from "./employee-salary-model";
import { isPermissionDenied } from "./permission-denied-notice";
import styles from "./employee-detail.module.css";

/**
 * Tab "Thiết lập lương": the salary in force (card "Lương chính") with its history, or the empty state while nothing is set.
 * Reading and saving are the pay rules' (the Owner and the Accountant); a refused read tells the detail to drop the tab.
 */
export function EmployeeSalaryTab({ employee, canEdit, onSaved, onDenied }: { employee: Employee; canEdit: boolean; onSaved(): void; onDenied(): void }) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const view = useRemote(useCallback((signal: AbortSignal) => repository.read("salary", { id: employee.id }, employeeSalarySchema, signal), [repository, employee.id]));
  const [editing, setEditing] = useState(false);
  const denied = isPermissionDenied(view.error);
  useEffect(() => { if (denied) onDenied(); }, [denied, onDenied]);
  if (view.loading) return <Skeleton />;
  if (denied) return null;
  if (view.error || !view.data) return <div><ErrorNotice error={view.error} /><Button className="w-auto" variant="secondary" onClick={view.reload}>Thử lại</Button></div>;
  const salary = view.data;
  if (editing) return <SalaryEditor employee={employee} salary={salary} onCancel={() => setEditing(false)} onReload={view.reload}
    onSaved={() => { setEditing(false); view.reload(); onSaved(); }} />;
  const notSet = salaryNotSet(salary);
  return <div className={styles.salary}>
    {notSet
      ? <div className={styles.salaryEmpty}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V4h8v3M12 10.5v6M14 12h-3a1.2 1.2 0 0 0 0 2.4h2a1.2 1.2 0 0 1 0 2.4h-3" /></svg><p>Lương của nhân viên chưa được thiết lập. Vui lòng thiết lập lương cho nhân viên.</p></div>
      : <>
        <section className={managementStyles.section} aria-label="Lương chính">
          <div className={styles.salaryHead}><strong>Lương chính</strong></div>
          <dl className={styles.fields}>
            <div><dt>Loại lương</dt><dd>{salaryTypeLabel(salary.current?.type ?? salary.currentType)}</dd></div>
            <div><dt>Mức lương</dt><dd>{salaryAmountText(salary.current, salary.currentType)}</dd></div>
            <div><dt>Ngày áp dụng</dt><dd>{salary.current ? dateLabel(salary.current.effectiveFrom) : "Theo loại nhân viên"}</dd></div>
          </dl>
        </section>
        {salary.history.length > 0 && <SalaryHistory salary={salary} />}
      </>}
    {canEdit && <footer className={styles.footer}><div /><div><Button type="button" onClick={() => setEditing(true)}>{notSet ? "Thiết lập lương" : "Cập nhật"}</Button></div></footer>}
  </div>;
}

function SalaryHistory({ salary }: { salary: EmployeeSalary }) {
  return <div className={styles.history}>
    <h4>Lịch sử thiết lập lương</h4>
    <table className={styles.historyTable}>
      <thead><tr><th scope="col">Ngày áp dụng</th><th scope="col">Loại lương</th><th scope="col">Mức lương</th><th scope="col">Ngày nhập</th></tr></thead>
      <tbody>{salary.history.map(setup => <tr key={`${setup.effectiveFrom}-${setup.enteredAt}`}>
        <td>{dateLabel(setup.effectiveFrom)}</td><td>{salaryTypeLabel(setup.type)}</td><td>{salaryAmountText(setup, null)}</td><td>{formatVietnameseDateTime(setup.enteredAt)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

/** The form of the card: type, amount (fixed monthly only) and the date it applies from. A save the server judges stale asks for a reload first. */
function SalaryEditor({ employee, salary, onCancel, onSaved, onReload }: { employee: Employee; salary: EmployeeSalary; onCancel(): void; onSaved(): void; onReload(): void }) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const mutation = useMutation(), { notify } = useToast();
  const today = businessToday();
  const [form, setForm] = useState<SalaryForm>(() => salaryFormOf(salary, today)), [issues, setIssues] = useState<SalaryIssues>({});
  async function save() {
    if (mutation.busy() || mutation.blocked) return;
    const parsed = parseSalaryForm(form, salary.rowVersion);
    if (!parsed.ok) { setIssues(parsed.issues); return; }
    setIssues({});
    const saved = await mutation.run(() => repository.write("save-salary", parsed.body, employeeSalarySchema, employee.id));
    if (!saved) return;
    notify({ tone: "success", title: `Đã lưu thiết lập lương của ${employee.code}.` });
    onSaved();
  }
  return <form className={styles.salary} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
    <section className={managementStyles.section} aria-label="Lương chính">
      <div className={styles.salaryHead}><strong>Lương chính</strong></div>
      <fieldset disabled={mutation.pending} className={styles.salaryFields}>
        <Select label="Loại lương *" value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as SalaryForm["type"] }))}>
          {salaryTypes.map(type => <option key={type} value={type}>{salaryTypeLabel(type)}</option>)}
        </Select>
        <div>
          <span className={styles.label}>Mức lương{form.type === "FixedMonthly" ? " *" : ""}</span>
          {form.type === "FixedMonthly"
            ? <MoneyInput label="Mức lương (đồng/tháng)" autoThousands min={1} value={form.amount} invalid={!!issues.amount} onChange={amount => setForm(current => ({ ...current, amount }))} wrapperClassName="mt-1" />
            : <p className={styles.hint}>{HOURLY_AMOUNT_TEXT}</p>}
          {issues.amount && <p role="alert" className={styles.fieldError}>{issues.amount}</p>}
        </div>
        <div>
          <span className={styles.label}>Ngày áp dụng *</span>
          <DatePickerField label="Ngày áp dụng" className={control} value={form.effectiveFrom} invalid={!!issues.effectiveFrom} onChange={effectiveFrom => setForm(current => ({ ...current, effectiveFrom }))} />
          {issues.effectiveFrom && <p role="alert" className={styles.fieldError}>{issues.effectiveFrom}</p>}
        </div>
      </fieldset>
    </section>
    <ErrorNotice error={mutation.error} />
    {mutation.blocked && <div className="my-3"><Button type="button" className="w-auto" variant="secondary" onClick={() => { mutation.reviewed(); onReload(); onCancel(); }}>Tải lại thiết lập lương</Button></div>}
    <footer className={styles.footer}><div /><div>
      <Button key="cancel" type="button" variant="secondary" disabled={mutation.pending} onClick={onCancel}>Bỏ qua</Button>
      <Button key="save" type="submit" isPending={mutation.pending} disabled={mutation.blocked}>Lưu</Button>
    </div></footer>
  </form>;
}
