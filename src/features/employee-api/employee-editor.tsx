"use client";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ErrorNotice } from "@/features/operations/ui";
import { EmployeeConflictPanel } from "./employee-conflict-panel";
import { EmployeeCreateAccountFields } from "./employee-create-account-fields";
import { EmployeeCreateBankFields, EmployeeCreateBasicFields, EmployeeCreatePersonalFields, EmployeeCreateWorkFields } from "./employee-create-fields";
import { createFieldLabels } from "./employee-create-model";
import { EmployeeCreateSection } from "./employee-create-section";
import { EmployeeCredentialDialog } from "./employee-credential-dialog";
import { employeeCreateGroups, type EmployeeCreateGroup } from "./employee-editor-validation";
import { ProfileComparison } from "./employee-profile-comparison";
import styles from "./employee-create-form.module.css";
import { useEmployeeEditor, type EmployeeEditorProps } from "./use-employee-editor";

/** "Thêm nhân viên" dialog: collapsible groups, one Lưu action, optional login account. */
export function EmployeeApiEditor(props: EmployeeEditorProps) {
  const idPrefix = useId();
  const { repository, mutation, values, setValues, issues, open, errorGroups, toggleGroup, compared, setCompared, comparisonTarget, reconciledRows, setReconciledRows, discard, setDiscard, credential, formRef, problem, fieldError, errorProps, close, save, acknowledgeCredential, openComparison } = useEmployeeEditor(props);
  const shared = { values, setValues, errorProps, fieldError };
  const body: Record<EmployeeCreateGroup, React.ReactNode> = {
    basic: <EmployeeCreateBasicFields {...shared} />,
    work: <EmployeeCreateWorkFields {...shared} zones={props.zones} jobTypes={props.jobTypes} />,
    personal: <EmployeeCreatePersonalFields {...shared} />,
    bank: <EmployeeCreateBankFields {...shared} />,
    account: <EmployeeCreateAccountFields {...shared} />,
  };
  const locked = mutation.pending || mutation.blocked;
  const errorText = mutation.failure?.code === "MSG-ACCOUNT-09"
    ? "Tên đăng nhập hoặc email đã được sử dụng. Vui lòng chọn tên khác."
    : mutation.error;

  // The one-time password replaces the form until the user confirms the handover.
  if (credential) {
    return <EmployeeCredentialDialog username={credential.username} password={credential.password} expiresAt={credential.expiresAt} onClose={acknowledgeCredential} />;
  }
  return (
    <Dialog open title="Thêm nhân viên" size="lg" dismissible={!mutation.pending} onOpenChange={isOpen => { if (!isOpen) close(); }}>
      <ErrorNotice error={errorText} />
      {issues.length > 0 && (
        <p id="employee-create-errors" role="alert" className={styles.summary}>
          Các mục cần kiểm tra: {[...new Set(issues.map(issue => issue.path.startsWith("bankAccount") ? "Thông tin ngân hàng" : createFieldLabels[issue.path] ?? issue.path))].join(", ")}.
        </p>
      )}
      {(comparisonTarget || problem?.kind === "duplicate-employee") && (
        <div className="my-3">
          <Button className="w-auto" variant="secondary" isPending={mutation.pending} onClick={() => void openComparison()}>Đối chiếu hồ sơ hiện có</Button>
        </div>
      )}
      {compared && (
        <div className={`${styles.panel} my-3`}>
          <ProfileComparison employee={compared} />
          <Button className="mt-3 w-auto" variant="secondary" onClick={() => props.onAdopt(compared)}>Mở hồ sơ này và bỏ nháp hiện tại</Button>
        </div>
      )}
      <form noValidate ref={formRef} className={styles.form} onSubmit={event => { event.preventDefault(); void save(); }}>
        <p className={styles.required}>Các mục có dấu * là bắt buộc.</p>
        {employeeCreateGroups.map(({ key, title }) => (
          <EmployeeCreateSection key={key} id={`${idPrefix}-${key}`} title={title} open={open.has(key)} hasError={errorGroups.has(key)} disabled={locked} onToggle={() => toggleGroup(key)}>
            {body[key]}
          </EmployeeCreateSection>
        ))}
        {mutation.blocked && (
          <EmployeeConflictPanel repository={repository} mutation={mutation} baseline={null} searchName={values.fullName} latest={undefined}
            reconciledRows={reconciledRows} onLatestLoaded={() => {}} onRowsLoaded={setReconciledRows} onCompared={setCompared}
            onKeepDraft={() => {}} onAdopt={props.onAdopt} />
        )}
        {discard && (
          <div className={styles.panel}>
            <p>Bỏ các thay đổi chưa lưu?</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button className="w-auto" variant="secondary" onClick={() => setDiscard(false)}>Tiếp tục nhập</Button>
              <Button className="w-auto" onClick={props.onClose}>Bỏ bản nháp</Button>
            </div>
          </div>
        )}
        <div className={styles.footer}>
          <Button className="w-auto" variant="secondary" disabled={mutation.pending} onClick={close}>Bỏ qua</Button>
          <Button className="w-auto" type="submit" isPending={mutation.pending} disabled={mutation.blocked || !props.lookupsReady}>Lưu</Button>
        </div>
      </form>
    </Dialog>
  );
}
