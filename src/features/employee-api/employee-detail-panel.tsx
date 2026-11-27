"use client";
import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, ErrorNotice, Skeleton, useMutation } from "@/features/operations/ui";
import { employmentChangedSchema, type Employee } from "./contracts";
import { accountNoteText, type EndEmploymentChoice } from "./employee-end-employment-dialog";
import { EmployeeInfoTab } from "./employee-info-tab";
import { EmployeePayrollTabs } from "./employee-payroll-tabs";
import { EmployeeSalaryTab } from "./employee-salary-tab";
import { EmployeeStatusActionDialog, type EmployeeStatusAction } from "./employee-status-action-dialog";
import { EmployeeTabs, isPayrollTab, type AnyTabKey } from "./employee-tabs";
import { isPermissionDenied } from "./permission-denied-notice";
import { useEmployeeDetail, type EmployeeDetailCache } from "./use-employee-detail";
import type { EmployeeViewerAccess } from "./employee-viewer-access";
import styles from "./employee-detail.module.css";

/**
 * The open row of the list: tabs Thông tin, Thiết lập lương, Phiếu lương and Nợ và tạm ứng (each only for who may read it).
 * Editing the profile is the "Cập nhật" dialog the directory owns (`onEdit`); ending or resuming work is confirmed here.
 */
export function EmployeeDetailPanel({ id, cache, revision = 0, access, onEdit, onChanged, onSalarySaved }: {
  id: string; cache: EmployeeDetailCache; revision?: number; access: EmployeeViewerAccess;
  onEdit(employee: Employee): void;
  /** Employment ended or resumed; `note` says what happened to the linked account. */
  onChanged(employee: Employee, note?: string): void;
  /** A salary setup was saved: the employee version and the list's salary type moved on. */
  onSalarySaved(): void;
}) {
  const detail = useEmployeeDetail(id, cache, revision);
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const mutation = useMutation(), prefix = useId();
  const [tab, setTab] = useState<AnyTabKey>("information");
  const [action, setAction] = useState<EmployeeStatusAction>();
  const [salaryDenied, setSalaryDenied] = useState(false);
  const employee = detail.data;
  const tabs = { payroll: access.payroll, salary: access.salary && !salaryDenied };
  const active: AnyTabKey = tab === "salary" && !tabs.salary ? "information" : tab;
  function reload() { cache.delete(id); detail.reload(); }
  async function confirm(choice?: EndEmploymentChoice) {
    if (!employee || !action || !access.manage || !employee.canMaintain || detail.loading || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.write(action, {
      rowVersion: employee.rowVersion, ...(action === "end-employment" ? { lastWorkingDay: choice?.lastWorkingDay ?? businessToday(), ...(choice?.lockAccount ? { lockAccount: true } : {}) } : {}),
    }, employmentChangedSchema, id));
    setAction(undefined);
    if (result) onChanged(result.employee, action === "end-employment" ? accountNoteText(result) : undefined);
  }
  return <section id={`employee-preview-${id}`} className={styles.detail} aria-label="Chi tiết nhân viên">
    {detail.loading && <Skeleton />}
    <ErrorNotice error={detail.error || mutation.error} />
    {detail.error && !isPermissionDenied(detail.error) && <Button variant="secondary" onClick={reload}>Thử lại tải hồ sơ</Button>}
    {mutation.blocked && <><p role="alert">Hãy tải lại hồ sơ để đối chiếu trước khi thực hiện thao tác mới.</p><Button variant="secondary" disabled={detail.loading} onClick={() => { reload(); mutation.reviewed(); }}>Tải hồ sơ mới để đối chiếu</Button></>}
    {employee && <>
      <EmployeeTabs idPrefix={prefix} active={active} onChange={setTab} access={tabs} />
      <div role="tabpanel" id={`${prefix}-panel-${active}`} aria-labelledby={`${prefix}-tab-${active}`} tabIndex={0} className={styles.body}>
        {active === "information" && <EmployeeInfoTab employee={employee} manage={access.manage} busy={detail.loading || mutation.pending || mutation.blocked} onEdit={() => onEdit(employee)} onStatusAction={() => setAction(employee.status === "Employed" ? "end-employment" : "resume")} />}
        {active === "salary" && <EmployeeSalaryTab employee={employee} canEdit={access.salaryEdit} onSaved={() => { reload(); onSalarySaved(); }} onDenied={() => setSalaryDenied(true)} />}
        {isPayrollTab(active) && <EmployeePayrollTabs employee={employee} tab={active} />}
      </div>
      {action && <EmployeeStatusActionDialog action={action} baseline={employee} pending={mutation.pending} busy={mutation.busy} onCancel={() => setAction(undefined)} onConfirm={choice => void confirm(choice)} />}
    </>}
  </section>;
}
