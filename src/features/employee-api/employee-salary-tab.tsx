"use client";
import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { formatVietnameseDateTime } from "@/shared/format/date-time";
import { createOperationsRepository } from "@/features/operations/repository";
import { ErrorNotice, Skeleton, useRemote } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { dateLabel } from "./employee-editor-model";
import { employeeSalarySchema, type EmployeeSalary } from "./employee-salary-contract";
import { PAY_FIELD_SHIFTS_LABEL, salaryAmountText, salaryNotSet, salaryTypeLabel } from "./employee-salary-model";
import { isPermissionDenied } from "./permission-denied-notice";
import styles from "./employee-detail.module.css";

/**
 * Tab "Thiết lập lương": the salary in force (card "Lương chính") with its history, or the empty state while nothing is set. Read-only: the button opens
 * the employee dialog on its salary tab. Reading and saving are the pay rules' (the Owner and the Accountant); a refused read tells the detail to drop the tab.
 */
export function EmployeeSalaryTab({ employee, canEdit, onEdit, onDenied }: { employee: Employee; canEdit: boolean; onEdit(): void; onDenied(): void }) {
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const view = useRemote(useCallback((signal: AbortSignal) => repository.read("salary", { id: employee.id }, employeeSalarySchema, signal), [repository, employee.id]));
  const denied = isPermissionDenied(view.error);
  useEffect(() => { if (denied) onDenied(); }, [denied, onDenied]);
  if (view.loading) return <Skeleton />;
  if (denied) return null;
  if (view.error || !view.data) return <div><ErrorNotice error={view.error} /><Button className="w-auto" variant="secondary" onClick={view.reload}>Thử lại</Button></div>;
  const salary = view.data;
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
            {salary.current?.type === "FixedMonthly" && <div><dt>{PAY_FIELD_SHIFTS_LABEL}</dt><dd>{salary.current.payFieldShifts === false ? "Không" : "Có"}</dd></div>}
            <div><dt>Ngày áp dụng</dt><dd>{salary.current ? dateLabel(salary.current.effectiveFrom) : "Theo loại nhân viên"}</dd></div>
          </dl>
        </section>
        {salary.history.length > 0 && <SalaryHistory salary={salary} />}
      </>}
    {canEdit && <footer className={styles.footer}><div /><div><Button type="button" onClick={onEdit}>{notSet ? "Thiết lập lương" : "Cập nhật"}</Button></div></footer>}
  </div>;
}

function SalaryHistory({ salary }: { salary: EmployeeSalary }) {
  return <div className={styles.history}>
    <h4>Lịch sử thiết lập lương</h4>
    <table className={styles.historyTable}>
      <thead><tr><th scope="col">Ngày áp dụng</th><th scope="col">Loại lương</th><th scope="col">Mức lương</th><th scope="col">Tiền ca</th><th scope="col">Ngày nhập</th></tr></thead>
      <tbody>{salary.history.map(setup => <tr key={`${setup.effectiveFrom}-${setup.enteredAt}`}>
        <td>{dateLabel(setup.effectiveFrom)}</td><td>{salaryTypeLabel(setup.type)}</td><td>{salaryAmountText(setup, null)}</td><td>{setup.type === "FixedMonthly" ? (setup.payFieldShifts === false ? "Không" : "Có") : "—"}</td><td>{formatVietnameseDateTime(setup.enteredAt)}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
