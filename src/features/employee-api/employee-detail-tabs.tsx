"use client";
import { useId, useState } from "react";
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
import { EmployeeInlinePersonalFields, personalFields } from "./employee-inline-fields";
import { ProfileComparison } from "./employee-profile-comparison";
import { EmployeeTabs, type EmployeeTabKey } from "./employee-tabs";
import { useEmployeeInlineEditor, type EmployeeLeaveGuard } from "./use-employee-inline-editor";
import styles from "./employee-detail.module.css";

function Details({ fields }: { fields: [string, string | null | undefined][] }) {
  return <dl className={styles.fields}>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Chưa cập nhật"}</dd></div>)}</dl>;
}
export function EmployeeDetailTabs({ employee, onSaved, onRefresh, busy = false, zones = [], jobTypes = [], lookupsReady = true, onGuardChange, onStatusAction }: {
  employee: Employee; onSaved(employee: Employee): void; onRefresh(): void; busy?: boolean; zones?: ApiRecord[]; jobTypes?: { id: string; name: string }[]; lookupsReady?: boolean;
  onGuardChange?(guard: EmployeeLeaveGuard | undefined): void; onStatusAction?(): void;
}) {
  const [active, setActive] = useState<EmployeeTabKey>("information"), prefix = useId(), confirmation = useActionDialog();
  // The hook hands back DOM refs next to plain values; splitting the refs off keeps `editor` ref-free so render may read it.
  const { formRef, editButton, ...editor } = useEmployeeInlineEditor({ employee, active, setActive, zones, lookupsReady, onSaved, onGuardChange });
  const { mutation, editing, baseline, values, setValues, errorProps, fieldError } = editor;
  const denied = <p role="alert">Bạn không có quyền xem thông tin cá nhân và ngân hàng của nhân viên này.</p>;
  const fieldsProps = { values, setValues, errorProps, baseline, availableZones: editor.availableZones, zoneOptions: editor.zoneOptions, jobTypes };
  const personal = { ...employee, phone: employee.phoneNumber, wardCommune: employee.ward };
  const content = {
    information: !employee.canMaintain ? denied : editing === "information" ? <EmployeeInlinePersonalFields {...fieldsProps} errors={fieldError} /> : <Details fields={personalFields.map(([key, label]) => [label, key === "birthday" ? personal.birthday ? dateLabel(personal.birthday) : null : personal[key]])} />,
    work: <>{editing === "work" ? <div className={styles.editFields}><EmployeeEditorWorkFields {...fieldsProps} fieldError={fieldError} /></div> : <Details fields={[
      ["Loại nhân viên", employeeTypeLabel(employee.employeeType)], ["Loại công việc", employee.jobTypes.map(job => job.name).join(", ")],
      ["Vùng làm việc", employee.workingZones.map(zone => `${zone.code} · ${zone.name}`).join(", ")], ["Tình trạng làm việc", employmentLabel(employee.status)],
      ["Ngày làm cuối", employee.lastWorkingDay ? dateLabel(employee.lastWorkingDay) : null],
    ]} />}<div className={styles.history}><h4>Lịch sử loại nhân viên</h4>{employee.typeHistory.length ? <ul>{employee.typeHistory.map(period => <li key={`${period.type}-${period.effectiveFrom}`}>{employeeTypeLabel(period.type)} · Từ {dateLabel(period.effectiveFrom)}</li>)}</ul> : <p>Chưa có lịch sử loại nhân viên.</p>}</div></>,
    bank: !employee.canMaintain ? denied : editing === "bank" ? <EmployeeEditorBankFields {...fieldsProps} fieldError={fieldError} /> : employee.bankAccount ? <Details fields={[["Ngân hàng", employee.bankAccount.bankName], ["Số tài khoản", employee.bankAccount.accountNumber], ["Chủ tài khoản", employee.bankAccount.accountHolderName]]} /> : <p>Chưa có thông tin ngân hàng</p>,
    account: <fieldset disabled={busy}><EmployeeAccountTab employee={employee} onSaved={onSaved} onRefresh={onRefresh} /></fieldset>,
  };
  return <>
    <EmployeeTabs idPrefix={prefix} active={active} onChange={editor.changeTab} />
    <div role="tabpanel" id={`${prefix}-panel-${active}`} aria-labelledby={`${prefix}-tab-${active}`} tabIndex={0} className={styles.body}>
      <form ref={formRef} noValidate onSubmit={event => { event.preventDefault(); void editor.save(); }}>
        <fieldset disabled={busy || mutation.pending || mutation.blocked}>{content[active]}</fieldset>
        <ErrorNotice error={mutation.error} />
        {editor.problem && editor.problem.kind !== "invalid-fields" && <Button className="w-auto" variant="secondary" isPending={mutation.pending} onClick={() => void editor.compareDuplicate()}>Đối chiếu hồ sơ hiện có</Button>}
        {editor.compared && <ProfileComparison employee={editor.compared} />}
        {(mutation.blocked || mutation.failure?.code === "MSG-GEN-09") && <EmployeeConflictPanel repository={editor.repository} mutation={mutation} baseline={baseline} searchName={values.fullName} latest={editor.latest} reconciledRows={undefined} onLatestLoaded={editor.setLatest} onRowsLoaded={() => undefined} onCompared={() => undefined} onKeepDraft={editor.keepDraft} onAdopt={editor.adopt} />}
        {active !== "account" && employee.canMaintain && <footer className={styles.footer}>
          <div>{active === "bank" && employee.bankAccount && !editing && <Button variant="ghost" disabled={busy || mutation.pending || mutation.blocked} onClick={async () => { if (await confirmation.confirm("Xóa thông tin ngân hàng của nhân viên?")) await editor.save(true); }}><InterfaceIcon name="trash" className="size-4" />Xóa thông tin ngân hàng</Button>}</div>
          <div>{editing ? <><Button variant="secondary" disabled={mutation.pending} onClick={editor.cancel}>Bỏ qua</Button><Button type="submit" disabled={busy || mutation.blocked || !lookupsReady} isPending={mutation.pending}>Lưu</Button></> : <>
            {active === "work" && <Button variant="secondary" disabled={busy || mutation.pending} onClick={onStatusAction}>{employee.status === "Employed" ? "Ngừng làm việc" : "Cho làm việc lại"}</Button>}
            <Button ref={editButton} disabled={busy || !lookupsReady} onClick={editor.begin}><InterfaceIcon name="pencil" className="size-4" />Chỉnh sửa</Button>
          </>}</div>
        </footer>}
      </form>
      {editor.dirty && <div className={styles.notice} role="status"><p>Có thay đổi chưa lưu</p>{editor.leave && <div><Button variant="secondary" onClick={editor.stay}>Ở lại</Button><Button onClick={editor.discard}>Bỏ thay đổi</Button></div>}</div>}
    </div>
    {confirmation.dialog}
  </>;
}
