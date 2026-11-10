"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, ErrorNotice, Skeleton, useMutation } from "@/features/operations/ui";
import { createEmployeeEndDateSchema } from "@/features/employee-management/schemas/employee-employment-schema";
import { employmentChangedSchema, type Employee } from "./contracts";
import { EmployeeDetailTabs } from "./employee-detail-tabs";
import { employmentLabel } from "./employee-editor-model";
import { EmployeeStatusActionDialog, type EmployeeStatusAction } from "./employee-status-action-dialog";
import { useEmployeeDetail, type EmployeeDetailCache } from "./use-employee-detail";
import styles from "./employee-screen.module.css";

export function EmployeeDetailPanel({ id, cache, onOpen, onSaved, revision = 0 }: {
  id: string; cache: EmployeeDetailCache; onOpen(id: string): void; onSaved(employee: Employee): void; revision?: number;
}) {
  const detail = useEmployeeDetail(id, cache, revision);
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const mutation = useMutation();
  const [action, setAction] = useState<EmployeeStatusAction>();
  const [endDate, setEndDate] = useState(businessToday);
  const [actionError, setActionError] = useState<string>();
  const [reviewRequested, setReviewRequested] = useState(false);
  const employee = detail.data;
  function reload() { cache.delete(id); detail.reload(); }
  async function confirm() {
    if (!employee || !action || !employee.canMaintain || detail.loading || mutation.busy() || mutation.blocked) return;
    if (action === "end-employment" && !createEmployeeEndDateSchema().safeParse({ endDate }).success) {
      setActionError("Ngày nghỉ việc phải hợp lệ và không sau hôm nay."); return;
    }
    const result = await mutation.run(() => repository.write(action, {
      rowVersion: employee.rowVersion, ...(action === "end-employment" ? { lastWorkingDay: endDate } : {}),
    }, employmentChangedSchema, id));
    setAction(undefined);
    if (result) onSaved(result.employee);
  }
  return <section id={`employee-preview-${id}`} className={styles.preview} aria-label="Chi tiết nhân viên">
    {detail.loading && <Skeleton />}
    <ErrorNotice error={detail.error || mutation.error} />
    {detail.error && <Button variant="secondary" onClick={() => { cache.delete(id); detail.reload(); }}>Thử lại tải hồ sơ</Button>}
    {mutation.blocked && <><p role="alert">Hãy tải lại hồ sơ để đối chiếu trước khi thực hiện thao tác mới.</p><Button variant="secondary" disabled={detail.loading} onClick={() => { reload(); setReviewRequested(true); }}>Tải hồ sơ mới để đối chiếu</Button>
      {reviewRequested && !detail.loading && !detail.error && !mutation.uncertain && <Button variant="secondary" onClick={() => { mutation.reviewed(); setReviewRequested(false); }}>Đã đối chiếu hồ sơ</Button>}
    </>}
    {employee && <>
      <header className={styles.previewHeader}>
        <div><h3>{employee.fullName}</h3><StatusPill tone={employee.status === "Employed" ? "success" : "neutral"}>{employmentLabel(employee.status)}</StatusPill></div>
        <div className={styles.previewActions}>
          <Button variant="secondary" className="w-auto" disabled={!employee.canMaintain || mutation.pending || detail.loading} onClick={() => onOpen(id)}>Cập nhật hồ sơ</Button>
          <Button variant="secondary" className="w-auto" disabled={!employee.canMaintain || mutation.pending || mutation.blocked || detail.loading} onClick={() => { setEndDate(businessToday()); setAction(employee.status === "Employed" ? "end-employment" : "resume"); }}>{employee.status === "Employed" ? "Ngừng làm việc" : "Cho làm việc lại"}</Button>
        </div>
      </header>
      <EmployeeDetailTabs employee={employee} onSaved={onSaved} onRefresh={reload} busy={detail.loading || mutation.pending || mutation.blocked} />
      {action && <EmployeeStatusActionDialog action={action} baseline={employee} pending={mutation.pending} busy={mutation.busy} endDate={endDate} actionError={actionError} onEndDateChange={value => { setEndDate(value); setActionError(undefined); }} onCancel={() => setAction(undefined)} onConfirm={() => void confirm()} />}
    </>}
  </section>;
}
