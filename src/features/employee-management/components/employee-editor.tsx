"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useEmployeeEditorActions } from "@/features/employee-management/components/use-employee-editor-actions";
import type {
  AccountFollowUp,
  EmployeeAccountSummary,
  EmployeeProfile,
} from "@/features/employee-management/domain/employee-management";
import {
  employeeEditorSchema,
  type EmployeeEditorValues,
} from "@/features/employee-management/schemas/employee-editor-schema";
import { employeeManagementService } from "@/features/employee-management/services/employee-management-service.instance";
import type { EmployeeManagementService } from "@/features/employee-management/services/employee-management-service";
import { formatMessage } from "@/shared/messages/message-catalog";
import { EmployeeAccountLinkSection } from "./employee-account-link-section";
import { EmployeeBankFields } from "./employee-bank-fields";
import { EmployeeEditorFeedback, type EmployeeEditorFeedbackMessage } from "./employee-editor-feedback";
import {
  buildEmployeeAccountOptions,
  buildEmployeeControlProps,
  createEmployeeEditorValues,
} from "./employee-editor-form-model";
import { EmployeeAdditionalInfoSection, EmployeeIdentitySection } from "./employee-editor-sections";
import { EmployeeWorkingZones } from "./employee-working-zones";
import type { EmployeeZoneOption } from "../domain/employee-working-details";
import { EmployeeEmploymentActions } from "./employee-employment-actions";

type EmployeeEditorProps = Readonly<{
  availableAccounts: readonly EmployeeAccountSummary[];
  zones: readonly EmployeeZoneOption[];
  embedded?: boolean;
  accountCreationOpen?: boolean;
  onRequestCreateAccount?(): void;
  employee?: EmployeeProfile;
  service?: Pick<EmployeeManagementService, "save" | "unlinkAccount" | "endEmployment" | "reinstate">;
  onOpenExisting(employeeId: string): boolean | void;
  onPendingChange(pending: boolean): void;
  onSaved(employee: EmployeeProfile, followUp?: AccountFollowUp): void;
  onUnlinked(employee: EmployeeProfile): void;
}>;

export function EmployeeEditor({
  availableAccounts,
  zones,
  embedded = false,
  accountCreationOpen = false,
  onRequestCreateAccount,
  employee,
  service = employeeManagementService,
  onOpenExisting,
  onPendingChange,
  onSaved,
  onUnlinked,
}: EmployeeEditorProps) {
  const isCreate = !employee;
  const fieldPrefix = useId();
  const accountOptions = buildEmployeeAccountOptions(employee, availableAccounts);
  const form = useForm<EmployeeEditorValues>({
    defaultValues: createEmployeeEditorValues(employee),
    resolver: zodResolver(employeeEditorSchema),
  });
  const { formState: { errors, isDirty }, register } = form;
  const [employmentOpen, setEmploymentOpen] = useState(false);
  const {
    feedback,
    feedbackRef,
    bankGroupRef,
    zoneGroupRef,
    pending,
    confirmUnlink,
    setConfirmUnlink,
    saveEmployee,
    unlinkAccount,
    clearFeedback,
  } = useEmployeeEditorActions({
    employee,
    form,
    service,
    onPendingChange,
    onSaved,
    onUnlinked,
    blocked: employmentOpen || accountCreationOpen,
  });
  const [unavailableFeedback, setUnavailableFeedback] = useState<EmployeeEditorFeedbackMessage>();
  const isActionLocked = pending !== null || confirmUnlink || accountCreationOpen;
  const controlProps = (field: keyof EmployeeEditorValues) =>
    buildEmployeeControlProps(fieldPrefix, field, errors);
  const unlinkDescription = `${formatMessage({
    code: "MSG09",
    params: {
      action: `bỏ liên kết tài khoản @${employee?.account?.username ?? ""} khỏi hồ sơ nhân viên`,
    },
  })} Tài khoản vẫn được giữ lại. Các thay đổi khác đang nhập chưa được lưu.`;

  return (
    <section
      className={
        embedded
          ? "min-w-0"
          : "min-w-0 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
      }
    >
      {!embedded && (
        <div className="border-b border-border pb-5">
          <p className="text-sm font-semibold text-primary">
            {isCreate ? "Hồ sơ mới" : "Chi tiết nhân viên"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {isCreate ? "Thêm nhân viên" : employee.fullName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Hồ sơ nhân sự và tài khoản đăng nhập là hai dữ liệu riêng.
            Có thể lưu nhân viên mà chưa liên kết tài khoản.
          </p>
        </div>
      )}

      {feedback && (
        <EmployeeEditorFeedback
          feedback={feedback}
          feedbackRef={feedbackRef}
          isOpenExistingDisabled={isActionLocked}
          isOpenExistingUnavailable={unavailableFeedback === feedback}
          onOpenExisting={(id) => {
            if (onOpenExisting(id) === false) setUnavailableFeedback(feedback);
          }}
        />
      )}

      {employee && (
        <EmployeeEmploymentActions
          employee={employee}
          service={service}
          hasDraft={isDirty}
          disabled={isActionLocked}
          onOpenChange={setEmploymentOpen}
          onPendingChange={onPendingChange}
          onChanged={onSaved}
        />
      )}
      <form className={embedded ? "" : "mt-6"} noValidate onSubmit={(event) => void saveEmployee(event)}>
        <input type="hidden" {...register("status")} />
        <fieldset className="min-w-0 space-y-7" disabled={isActionLocked || employmentOpen}>
          <EmployeeIdentitySection controlProps={controlProps} form={form} isCreate={isCreate} />
          <EmployeeWorkingZones form={form} zones={zones} prefix={fieldPrefix} groupRef={zoneGroupRef} />
          <EmployeeBankFields form={form} prefix={fieldPrefix} groupRef={bankGroupRef} />
          <EmployeeAccountLinkSection
            accountOptions={accountOptions}
            controlProps={controlProps}
            employee={employee}
            form={form}
            onRequestCreateAccount={onRequestCreateAccount}
            onRequestUnlink={() => setConfirmUnlink(true)}
          />
          <EmployeeAdditionalInfoSection controlProps={controlProps} form={form} />

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            {!isCreate && isDirty && (
              <Button variant="secondary" className="sm:w-auto" onClick={() => {
                form.reset(createEmployeeEditorValues(employee));
                clearFeedback();
                setUnavailableFeedback(undefined);
              }}>
                Hủy thay đổi
              </Button>
            )}
            <Button
              className="sm:w-auto"
              disabled={!isCreate && !isDirty}
              isPending={pending === "save"}
              pendingLabel="Đang lưu hồ sơ..."
              type="submit"
            >
              {isCreate ? "Thêm nhân viên" : "Lưu thay đổi"}
            </Button>
          </div>
        </fieldset>
      </form>
      <ConfirmDialog
        confirmLabel="Bỏ liên kết"
        description={unlinkDescription}
        isPending={pending === "unlink"}
        onConfirm={() => void unlinkAccount()}
        onOpenChange={setConfirmUnlink}
        open={confirmUnlink}
        title="Bỏ liên kết tài khoản?"
        tone="danger"
      />
    </section>
  );
}
