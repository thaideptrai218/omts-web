"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/management-page";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { createOperationsRepository } from "@/features/operations/repository";
import { businessToday, ErrorNotice, Skeleton, useMutation } from "@/features/operations/ui";
import { employmentChangedSchema, type Employee } from "./contracts";
import { EmployeeDetailTabs } from "./employee-detail-tabs";
import { employmentLabel } from "./employee-editor-model";
import { EmployeeStatusActionDialog, type EmployeeStatusAction } from "./employee-status-action-dialog";
import { useEmployeeDetail, type EmployeeDetailCache } from "./use-employee-detail";
import type { EmployeeLeaveGuard } from "./use-employee-inline-editor";
import styles from "./employee-detail.module.css";

export function EmployeeDetailPanel({ id, cache, onSaved, revision = 0, zones, jobTypes, lookupsReady, onGuardChange }: {
  id: string; cache: EmployeeDetailCache; onOpen?(id: string): void; onSaved(employee: Employee): void; revision?: number;
  zones?: ApiRecord[]; jobTypes?: { id: string; name: string }[]; lookupsReady?: boolean; onGuardChange?(guard: EmployeeLeaveGuard | undefined): void;
}) {
  const detail = useEmployeeDetail(id, cache, revision);
  const repository = useMemo(() => createOperationsRepository("employees"), []);
  const mutation = useMutation();
  const [action, setAction] = useState<EmployeeStatusAction>();
  const [reviewRequested, setReviewRequested] = useState(false);
  const employee = detail.data;
  function reload() { cache.delete(id); detail.reload(); }
  async function confirm() {
    if (!employee || !action || !employee.canMaintain || detail.loading || mutation.busy() || mutation.blocked) return;
    const result = await mutation.run(() => repository.write(action, {
      rowVersion: employee.rowVersion, ...(action === "end-employment" ? { lastWorkingDay: businessToday() } : {}),
    }, employmentChangedSchema, id));
    setAction(undefined);
    if (result) onSaved(result.employee);
  }
  function saved(record: Employee) { cache.set(id, record); onSaved(record); detail.reload(); }
  return <section id={`employee-preview-${id}`} className={styles.detail} aria-label="Chi tiết nhân viên">
    {detail.loading && <Skeleton />}
    <ErrorNotice error={detail.error || mutation.error} />
    {detail.error && <Button variant="secondary" onClick={() => { cache.delete(id); detail.reload(); }}>Thử lại tải hồ sơ</Button>}
    {mutation.blocked && <><p role="alert">Hãy tải lại hồ sơ để đối chiếu trước khi thực hiện thao tác mới.</p><Button variant="secondary" disabled={detail.loading} onClick={() => { reload(); setReviewRequested(true); }}>Tải hồ sơ mới để đối chiếu</Button>
      {reviewRequested && !detail.loading && !detail.error && !mutation.uncertain && <Button variant="secondary" onClick={() => { mutation.reviewed(); setReviewRequested(false); }}>Đã đối chiếu hồ sơ</Button>}
    </>}
    {employee && <>
      <header className={styles.header}>
        <div><h3>{employee.fullName}</h3><StatusPill tone={employee.status === "Employed" ? "success" : "neutral"}>{employmentLabel(employee.status)}</StatusPill></div>
      </header>
      <EmployeeDetailTabs employee={employee} onSaved={saved} onRefresh={reload} busy={detail.loading || mutation.pending || mutation.blocked} zones={zones} jobTypes={jobTypes} lookupsReady={lookupsReady} onGuardChange={onGuardChange} onStatusAction={() => { setAction(employee.status === "Employed" ? "end-employment" : "resume"); }} />
      {action && <EmployeeStatusActionDialog action={action} baseline={employee} pending={mutation.pending} busy={mutation.busy} onCancel={() => setAction(undefined)} onConfirm={() => void confirm()} />}
    </>}
  </section>;
}
