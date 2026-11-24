"use client";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { InterfaceIcon } from "@/components/ui/interface-icon";
import { useActionDialog } from "@/components/ui/use-action-dialog";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { ErrorNotice } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { EmployeeAccountTab } from "./employee-account-tab";
import { EmployeeConflictPanel } from "./employee-conflict-panel";
import { EmployeeEditorBankFields } from "./employee-editor-bank-fields";
import { EmployeeEditorWorkFields } from "./employee-editor-work-fields";
import { dateLabel, employeeTypeLabel, employmentLabel } from "./employee-editor-model";
import { EmployeeInlinePersonalFields, leftEditablePersonalKeys, LEFT_EDIT_HINT, personalDisplayRows } from "./employee-inline-fields";
import { ProfileComparison } from "./employee-profile-comparison";
import { EmployeePayrollTabs } from "./employee-payroll-tabs";
import { EmployeeTabs, isPayrollTab, type AnyTabKey } from "./employee-tabs";
import { useEmployeeInlineEditor, type EmployeeLeaveGuard } from "./use-employee-inline-editor";
import styles from "./employee-detail.module.css";

/**
 * `keep` set: only fields with a value (and the labels in `keep`, shown as a muted "—" when empty) fill the grid; the other empty
 * ones are gathered in one quiet line, so a sparse profile does not bury the real data under "Chưa cập nhật".
 */
function Details({ fields, keep, hints = {} }: { fields: [string, string | null | undefined][]; keep?: readonly string[]; hints?: Record<string, string> }) {
  const shown = keep ? fields.filter(([label, value]) => value || keep.includes(label)) : fields;
  const missing = keep ? fields.filter(([label, value]) => !value && !keep.includes(label)).map(([label]) => label) : [];
  return <>
    <dl className={styles.fields}>{shown.map(([label, value]) => <div key={label}><dt>{label}</dt>
      <dd className={value ? undefined : keep ? styles.empty : undefined}>{value || (keep ? "—" : "Chưa cập nhật")}{!value && hints[label] && <small className={styles.emptyHint}>{hints[label]}</small>}</dd></div>)}</dl>
    {missing.length > 0 && <p className={styles.missing}>Chưa cập nhật: {missing.join(", ")}</p>}
  </>;
}
/** Identity and contact fields stay visible even when empty. */
const identityLabels = ["Mã nhân viên", "Họ và tên", "Số điện thoại"] as const;
export function EmployeeDetailTabs({ employee, onSaved, onRefresh, busy = false, zones = [], jobTypes = [], lookupsReady = true, onGuardChange, onStatusAction, payroll = false, manage = true, initialTab }: {
  /** Tab to open first (the account chip in the list opens "account"); read once on mount. */
  initialTab?: AnyTabKey;
  employee: Employee; onSaved(employee: Employee): void; onRefresh(): void; busy?: boolean; zones?: ApiRecord[]; jobTypes?: { id: string; name: string }[]; lookupsReady?: boolean;
  /** `manage` false (Zone Manager, Accountant): working information only, read-only; no personal, bank or account tab and no edit buttons. */
  onGuardChange?(guard: EmployeeLeaveGuard | undefined): void; onStatusAction?(): void; payroll?: boolean; manage?: boolean;
}) {
  const [active, setActive] = useState<AnyTabKey>(initialTab ?? (manage ? "information" : "work")), prefix = useId(), confirmation = useActionDialog();
  // The hook hands back DOM refs next to plain values; splitting the refs off keeps `editor` ref-free so render may read it.
  const { formRef, editButton, ...editor } = useEmployeeInlineEditor({ employee, active, setActive, zones, lookupsReady, onSaved, onGuardChange });
  const { mutation, editing, baseline, values, setValues, errorProps, fieldError } = editor;
  const denied = <p role="alert">Bạn không có quyền xem thông tin cá nhân và ngân hàng của nhân viên này.</p>;
  // A Left employee may still get a new phone, address or bank account (to be paid what is owed); everything else is closed.
  const left = employee.status === "Left";
  const fieldsProps = { values, setValues, errorProps, baseline, availableZones: editor.availableZones, zoneOptions: editor.zoneOptions, jobTypes };
  const content: Record<Exclude<AnyTabKey, "payslips" | "debt">, ReactNode> = {
    information: !employee.canMaintain ? denied : editing === "information" ? <>{left && <p className={styles.hint}>{LEFT_EDIT_HINT}</p>}<EmployeeInlinePersonalFields {...fieldsProps} errors={fieldError} only={left ? leftEditablePersonalKeys : undefined} /></> : <Details fields={personalDisplayRows(employee)} keep={identityLabels} hints={employee.account || employee.phoneNumber ? undefined : { "Số điện thoại": "Chưa có số điện thoại để cấp tài khoản" }} />,
    work: <>{left && manage && <p className={styles.hint}>Nhân viên đã nghỉ việc nên không sửa được loại công việc và vùng làm việc. Bấm &ldquo;Làm việc lại&rdquo; nếu cần.</p>}{editing === "work" ? <div className={styles.editFields}><EmployeeEditorWorkFields {...fieldsProps} fieldError={fieldError} /></div> : <Details fields={[
      ["Loại nhân viên", employeeTypeLabel(employee.employeeType)], ["Loại công việc", employee.jobTypes.map(job => job.name).join(", ")],
      ["Vùng làm việc", employee.workingZones.map(zone => `${zone.code} · ${zone.name}`).join(", ")], ["Tình trạng làm việc", employmentLabel(employee.status)],
      ["Ngày làm cuối", employee.lastWorkingDay ? dateLabel(employee.lastWorkingDay) : null],
    ]} />}<div className={styles.history}><h4>Lịch sử loại nhân viên</h4>{employee.typeHistory.length ? <ul>{employee.typeHistory.map(period => <li key={`${period.type}-${period.effectiveFrom}`}>{employeeTypeLabel(period.type)} · Từ {dateLabel(period.effectiveFrom)}</li>)}</ul> : <p>Chưa có lịch sử loại nhân viên.</p>}</div></>,
    bank: !employee.canMaintain ? denied : editing === "bank" ? <EmployeeEditorBankFields {...fieldsProps} fieldError={fieldError} /> : employee.bankAccount ? <Details fields={[["Ngân hàng", employee.bankAccount.bankName], ["Số tài khoản", employee.bankAccount.accountNumber], ["Chủ tài khoản", employee.bankAccount.accountHolderName]]} /> : <p>Chưa có thông tin ngân hàng</p>,
    account: !employee.canMaintain ? <p role="alert">Bạn không có quyền xem tài khoản đăng nhập của nhân viên này.</p> : <fieldset disabled={busy}><EmployeeAccountTab employee={employee} onSaved={onSaved} onRefresh={onRefresh} canReset={manage} /></fieldset>,
  };
  return <>
    <EmployeeTabs idPrefix={prefix} active={active} onChange={editor.changeTab} payroll={payroll} manage={manage} />
    <div role="tabpanel" id={`${prefix}-panel-${active}`} aria-labelledby={`${prefix}-tab-${active}`} tabIndex={0} className={styles.body}>
      {payroll && isPayrollTab(active) ? <EmployeePayrollTabs employee={employee} tab={active} /> : <form ref={formRef} noValidate onSubmit={event => { event.preventDefault(); void editor.save(); }}>
        <fieldset disabled={busy || mutation.pending || mutation.blocked}>{!isPayrollTab(active) && content[active]}</fieldset>
        <ErrorNotice error={mutation.error} />
        {editor.problem && editor.problem.kind !== "invalid-fields" && <Button className="w-auto" variant="secondary" isPending={mutation.pending} onClick={() => void editor.compareDuplicate()}>Đối chiếu hồ sơ hiện có</Button>}
        {editor.compared && <ProfileComparison employee={editor.compared} />}
        {(mutation.blocked || mutation.failure?.code === "MSG-GEN-09") && <EmployeeConflictPanel repository={editor.repository} mutation={mutation} baseline={baseline} searchName={values.fullName} latest={editor.latest} reconciledRows={undefined} onLatestLoaded={editor.setLatest} onRowsLoaded={() => undefined} onCompared={() => undefined} onKeepDraft={editor.keepDraft} onAdopt={editor.adopt} />}
        {active !== "account" && !isPayrollTab(active) && employee.canMaintain && manage && <footer className={styles.footer}>
          <div>{active === "bank" && employee.bankAccount && !editing && <Button variant="ghost" disabled={busy || mutation.pending || mutation.blocked} onClick={async () => { if (await confirmation.confirm("Xóa thông tin ngân hàng của nhân viên?")) await editor.save(true); }}><InterfaceIcon name="trash" className="size-4" />Xóa thông tin ngân hàng</Button>}</div>
          {/* Distinct keys matter: without them React reuses the clicked "Chỉnh sửa" <button> as the submit "Lưu" button
              during the click, the browser then submits the form and the edit is saved and closed at once. */}
          <div>{editing ? <><Button key="cancel" variant="secondary" disabled={mutation.pending} onClick={editor.cancel}>Bỏ qua</Button><Button key="save" type="submit" disabled={busy || mutation.blocked || !lookupsReady} isPending={mutation.pending}>Lưu</Button></> : <>
            {(active === "information" || active === "work") && onStatusAction && <Button key="status" variant="secondary" disabled={busy || mutation.pending} onClick={onStatusAction}>{employee.status === "Employed" ? "Nghỉ việc" : "Làm việc lại"}</Button>}
            {!(left && active === "work") && <Button key="edit" ref={editButton} type="button" disabled={busy || !lookupsReady} onClick={editor.begin}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>}
          </>}</div>
        </footer>}
      </form>}
      {editor.dirty && <div className={styles.notice} role="status"><p>Có thay đổi chưa lưu</p>{editor.leave && <div><Button variant="secondary" onClick={editor.stay}>Ở lại</Button><Button onClick={editor.discard}>Bỏ thay đổi</Button></div>}</div>}
    </div>
    {confirmation.dialog}
  </>;
}
