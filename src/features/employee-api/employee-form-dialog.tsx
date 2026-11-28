"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { CollapsibleSection, managementStyles, Subtabs } from "@/components/ui/management-screen/management-table";
import { ErrorNotice, Skeleton } from "@/features/operations/ui";
import { EmployeeConflictPanel } from "./employee-conflict-panel";
import { EmployeeCredentialDialog } from "./employee-credential-dialog";
import { IdentityFields } from "./employee-form-identity";
import { BankFields, PersonalFields, WorkFields } from "./employee-form-sections";
import { formFieldLabel, LEFT_EDIT_HINT } from "./employee-form-model";
import { ProfileComparison } from "./employee-profile-comparison";
import { SalaryFields } from "./employee-salary-editor";
import styles from "./employee-form.module.css";
import { useEmployeeForm, type EmployeeFormProps, type EmployeeFormTab } from "./use-employee-form";

/**
 * "Thêm mới nhân viên" / "Cập nhật nhân viên": tabs "Thông tin" (folded cards, the identity card with the photo first) and "Thiết lập lương" (only for the pay rules' holders).
 * One "Lưu" saves the profile, then the salary setup when it changed.
 */
export function EmployeeFormDialog(props: EmployeeFormProps) {
  const { formRef, ...form } = useEmployeeForm(props);
  const { mutation, state, setState, error, errorProps, baseline, left } = form;
  const shared = { state, setState, error, errorProps, locked: left };
  const locked = mutation.pending || mutation.blocked;
  const errorText = mutation.failure?.code === "MSG-ACCOUNT-09" ? "Tên đăng nhập hoặc số điện thoại đã được sử dụng. Vui lòng chọn tên khác." : mutation.error;
  const bankUsed = Object.values(state.bankAccount).some(value => value.trim());
  const personalUsed = !!(state.idNumber || state.birthday || state.gender || state.otherInformation || state.address.provinceName || state.address.street);
  const salaryTabs: { key: EmployeeFormTab; label: string }[] = [{ key: "info", label: "Thông tin" }, ...(form.salary.shown ? [{ key: "salary" as const, label: "Thiết lập lương" }] : [])];
  const tabErrors: EmployeeFormTab[] = [...(form.issues.length ? ["info" as const] : []), ...(Object.keys(form.salary.issues).length ? ["salary" as const] : [])];
  const title = props.record ? "Cập nhật nhân viên" : "Thêm mới nhân viên";

  if (form.credential) return <EmployeeCredentialDialog {...form.credential} onClose={form.acknowledgeCredential} grantNotice={form.grantNotice?.text} grantFailed={form.grantNotice?.failed} />;
  return <Dialog open title={title} size="lg" dismissible={!mutation.pending} onOpenChange={open => { if (!open) void form.close(); }}>
    {form.confirmation.dialog}
    <div className={managementStyles.theme}>
      <form noValidate ref={formRef} onSubmit={event => { event.preventDefault(); void form.save(); }}>
        {salaryTabs.length > 1 && <Subtabs label="Nhóm thông tin nhân viên" tabs={salaryTabs} value={form.tab} onChange={key => form.setTab(key)} errors={tabErrors} />}
        <div className="mt-3" />
        <ErrorNotice error={errorText ?? form.photo.error} />
        {form.issues.length > 0 && <p role="alert" className={styles.summary}>Các mục cần kiểm tra: {[...new Set(form.issues.map(issue => formFieldLabel(issue.path.startsWith("bankAccount") ? "bankAccount" : issue.path)))].join(", ")}.</p>}
        {left && <p className={styles.hint}>{LEFT_EDIT_HINT}</p>}
        {(form.problem && form.problem.kind !== "invalid-fields") && <div className="my-3"><Button type="button" className="w-auto" variant="secondary" isPending={mutation.pending} onClick={() => void form.compareDuplicate()}>Đối chiếu hồ sơ hiện có</Button></div>}
        {form.compared && <div className={styles.panel}><ProfileComparison employee={form.compared} /><Button type="button" className="mt-3 w-auto" variant="secondary" onClick={() => form.adopt(form.compared!)}>Mở hồ sơ này và bỏ nháp hiện tại</Button></div>}
        <fieldset disabled={locked || !form.profileEditable} hidden={form.tab !== "info"} className="min-w-0">
          <CollapsibleSection title="Thông tin khởi tạo" description="Tên, mã, số điện thoại, loại nhân viên, vùng làm việc và ảnh.">
            <IdentityFields {...shared} zones={props.zones} baseline={baseline} photo={form.photo} />
          </CollapsibleSection>
          <CollapsibleSection title="Thông tin công việc" description="Ngày bắt đầu, tài khoản đăng nhập và ghi chú." defaultOpen={form.open.has("work") || !!state.startDate || !!state.notes} onToggle={on => form.setCard("work", on)}>
            <WorkFields {...shared} account={{ offered: form.accountOffered, existing: baseline?.account ?? null, linkable: form.linkable.data?.items, failed: !!form.linkable.error, onZones: form.onZones }} />
          </CollapsibleSection>
          <CollapsibleSection title="Thông tin ngân hàng" description="Tài khoản nhận lương." defaultOpen={form.open.has("bank") || bankUsed} onToggle={on => form.setCard("bank", on)}>
            <BankFields {...shared} />
          </CollapsibleSection>
          <CollapsibleSection title="Thông tin cá nhân" description="CMND/CCCD, ngày sinh, giới tính, địa chỉ." defaultOpen={form.open.has("personal") || personalUsed} onToggle={on => form.setCard("personal", on)}>
            <PersonalFields {...shared} />
          </CollapsibleSection>
        </fieldset>
        {form.tab === "salary" && <SalaryTab salary={form.salary} locked={locked} />}
        {mutation.blocked && <EmployeeConflictPanel repository={form.repository} mutation={mutation} baseline={baseline} searchName={state.fullName} latest={form.latest}
          reconciledRows={form.reconciledRows} onLatestLoaded={form.setLatest} onRowsLoaded={form.setReconciledRows} onCompared={form.setCompared} onKeepDraft={form.keepDraft} onAdopt={form.adopt} />}
        <div className={styles.footer}>
          <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={() => void form.close()}>Bỏ qua</Button>
          <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || !props.lookupsReady}>Lưu</Button>
        </div>
      </form>
    </div>
  </Dialog>;
}

/** The "Thiết lập lương" tab: loads what applies now for an existing employee; a viewer without PAY_RULES Edit sees it read-only. */
function SalaryTab({ salary, locked }: { salary: ReturnType<typeof useEmployeeForm>["salary"]; locked: boolean }) {
  if (salary.loading) return <Skeleton />;
  if (salary.error || !salary.form) return <div><ErrorNotice error={salary.error ?? "Không tải được thiết lập lương."} /><Button type="button" className="w-auto" variant="secondary" onClick={salary.reload}>Thử lại</Button></div>;
  return <>
    {!salary.canEdit && <p className={styles.hint}>Bạn chỉ có quyền xem thiết lập lương.</p>}
    <SalaryFields form={salary.form} issues={salary.issues} readOnly={locked || !salary.canEdit} onChange={salary.onChange} />
    <p className={styles.hint}>Thiết lập lương là tùy chọn: lương cố định tháng mà để trống mức lương thì chưa lưu thiết lập nào.</p>
  </>;
}
