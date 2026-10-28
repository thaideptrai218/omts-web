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
import { EmployeeEditorField } from "./employee-editor-field";
import { EmployeeBankFields } from "./employee-bank-fields";
import { employeeBankFields } from "../schemas/employee-bank-schema";
import { EmployeeWorkingZones } from "./employee-working-zones";
import type { EmployeeZoneOption } from "../domain/employee-working-details";

type EmployeeEditorProps = Readonly<{
  availableAccounts: readonly EmployeeAccountSummary[];
  zones: readonly EmployeeZoneOption[];
  embedded?: boolean;
  employee?: EmployeeProfile;
  service?: Pick<EmployeeManagementService, "save" | "unlinkAccount">;
  onOpenExisting(employeeId: string): boolean | void;
  onPendingChange(pending: boolean): void;
  onSaved(employee: EmployeeProfile, followUp?: AccountFollowUp): void;
  onUnlinked(employee: EmployeeProfile): void;
}>;

const inputStyles =
  "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text placeholder:text-text-muted disabled:bg-surface-subtle disabled:text-text-muted aria-[invalid=true]:border-danger";
const textareaStyles = `${inputStyles} min-h-28 py-3`;

function initialValues(employee?: EmployeeProfile): EmployeeEditorValues {
  return {
    accountId: employee?.account?.id ?? "",
    address: employee?.address ?? "",
    area: employee?.area ?? "",
    birthday: employee?.birthday ?? "",
    fullName: employee?.fullName ?? "",
    notes: employee?.notes ?? "",
    otherInformation: employee?.otherInformation ?? "",
    phone: employee?.phone ?? "",
    status: employee?.status ?? "employed",
    wardCommune: employee?.wardCommune ?? "",
    workingZoneIds: [...(employee?.workingZoneIds ?? [])],
    bankAccount: employeeBankFields(employee?.bankAccount ?? null),
  };
}

export function EmployeeEditor({
  availableAccounts,
  zones,
  embedded = false,
  employee,
  service = employeeManagementService,
  onOpenExisting,
  onPendingChange,
  onSaved,
  onUnlinked,
}: EmployeeEditorProps) {
  const isCreate = !employee;
  const fieldPrefix = useId();
  const options = employee?.account
    ? [employee.account, ...availableAccounts]
    : [...availableAccounts];
  const accountOptions = options.filter(
    (account, index) =>
      options.findIndex((candidate) => candidate.id === account.id) === index,
  );
  const form = useForm<EmployeeEditorValues>({
    defaultValues: initialValues(employee),
    resolver: zodResolver(employeeEditorSchema),
  });
  const { formState: { errors, isDirty }, register } = form;
  const { feedback, feedbackRef, bankGroupRef, zoneGroupRef, pending, confirmUnlink, setConfirmUnlink, saveEmployee, unlinkAccount } =
    useEmployeeEditorActions({ employee, form, service, onPendingChange, onSaved, onUnlinked });
  const [unavailableFeedback, setUnavailableFeedback] = useState<typeof feedback>();
  function controlProps(field: keyof EmployeeEditorValues) {
    const id = `${fieldPrefix}-${field}`;
    return {
      id,
      "aria-invalid": Boolean(errors[field]),
      "aria-describedby": errors[field] ? `${id}-error` : undefined,
    };
  }

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
            Hồ sơ nhân sự và tài khoản đăng nhập là hai dữ liệu riêng. Có thể lưu nhân viên mà chưa liên kết tài khoản.
          </p>
        </div>
      )}

      {feedback && (
        <div
          ref={feedbackRef}
          tabIndex={-1}
          aria-live="polite"
          className={`mt-5 rounded-control border p-3 text-sm font-medium ${
            feedback.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-success"
              : "border-rose-200 bg-rose-50 text-danger"
          }`}
          role={feedback.tone === "danger" ? "alert" : "status"}
        >
          <p>{feedback.text}</p>
          {feedback.existingEmployeeId && (
            <button
              className="mt-2 min-h-11 rounded-control px-3 font-semibold underline underline-offset-4 hover:bg-white/60"
              disabled={pending !== null || confirmUnlink}
              onClick={() => {
                const id = feedback.existingEmployeeId;
                if (id && onOpenExisting(id) === false) setUnavailableFeedback(feedback);
              }}
              type="button"
            >
              Mở hồ sơ hiện có
            </button>
          )}
          {feedback.existingEmployeeId && unavailableFeedback === feedback && (
            <p className="mt-2">Chưa mở được hồ sơ này. Các thay đổi đang nhập vẫn được giữ.</p>
          )}
        </div>
      )}

      <form className={embedded ? "" : "mt-6"} onSubmit={(event) => void saveEmployee(event)}>
        <fieldset className="min-w-0 space-y-7" disabled={pending !== null || confirmUnlink}>
        <fieldset className="min-w-0">
          <legend className="text-lg font-semibold text-text">Thông tin nhận diện</legend>
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
            <EmployeeEditorField id={controlProps("fullName").id} label="Họ và tên" required error={errors.fullName?.message}>
              <input
                {...controlProps("fullName")}
                aria-required="true"
                autoComplete="name"
                className={inputStyles}
                {...register("fullName")}
              />
            </EmployeeEditorField>
            <EmployeeEditorField id={controlProps("phone").id} label="Số điện thoại" required error={errors.phone?.message}>
              <input
                {...controlProps("phone")}
                aria-required="true"
                autoComplete="tel"
                className={inputStyles}
                inputMode="tel"
                {...register("phone")}
              />
            </EmployeeEditorField>
            <EmployeeEditorField id={controlProps("birthday").id} label="Ngày sinh" optional error={errors.birthday?.message}>
              <input {...controlProps("birthday")} className={inputStyles} type="date" {...register("birthday")} />
            </EmployeeEditorField>
            <EmployeeEditorField id={controlProps("status").id} label="Trạng thái" required error={errors.status?.message}>
              {isCreate ? (
                <>
                  <input type="hidden" value="employed" {...register("status")} />
                  <output {...controlProps("status")} className="mt-2 flex min-h-12 items-center rounded-control border border-border bg-surface-subtle px-3 text-text">
                    Đang làm việc
                  </output>
                </>
              ) : (
                <select {...controlProps("status")} className={inputStyles} {...register("status")}>
                  <option value="employed">Đang làm việc</option>
                  <option value="left">Đã nghỉ</option>
                </select>
              )}
            </EmployeeEditorField>
          </div>
        </fieldset>

        <EmployeeWorkingZones form={form} zones={zones} prefix={fieldPrefix} groupRef={zoneGroupRef} />
        <EmployeeBankFields form={form} prefix={fieldPrefix} groupRef={bankGroupRef} />

        <fieldset className="min-w-0 border-t border-border pt-6">
          <legend className="text-lg font-semibold text-text">Tài khoản đăng nhập</legend>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            Chọn tài khoản nội bộ chưa liên kết với nhân viên khác. Liên kết tài khoản không tự cấp vai trò hoặc quyền truy cập.
          </p>
          <div className="mt-4">
          <EmployeeEditorField id={controlProps("accountId").id} label="Tài khoản hệ thống" optional error={errors.accountId?.message}>
            <select
              {...controlProps("accountId")}
              className={inputStyles}
              {...register("accountId")}
            >
              <option value="">{employee?.account ? "Giữ tài khoản hiện tại" : "Chưa liên kết tài khoản"}</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName} · @{account.username}
                  {account.status === "locked" ? " · Đã khóa" : ""}
                </option>
              ))}
            </select>
          </EmployeeEditorField>
          </div>
          {employee?.account && (
            <div className="mt-4 flex flex-col items-start gap-3 rounded-control border border-border bg-surface-subtle p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm leading-6">
                <p className="font-semibold text-text">Đang liên kết: <span className="break-all">@{employee.account.username}</span></p>
                <p className="text-text-muted">Bỏ liên kết không xóa hay khóa tài khoản đăng nhập.</p>
              </div>
              <Button className="shrink-0 sm:w-auto" onClick={() => setConfirmUnlink(true)} variant="secondary">
                Bỏ liên kết tài khoản
              </Button>
            </div>
          )}
        </fieldset>

        <fieldset className="min-w-0 border-t border-border pt-6">
          <legend className="text-lg font-semibold text-text">Thông tin bổ sung</legend>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            Các trường dưới đây không bắt buộc và có thể cập nhật sau.
          </p>
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
            <EmployeeEditorField id={controlProps("address").id} label="Địa chỉ" error={errors.address?.message}>
              <input {...controlProps("address")} className={inputStyles} {...register("address")} />
            </EmployeeEditorField>
            <EmployeeEditorField id={controlProps("area").id} label="Khu vực" error={errors.area?.message}>
              <input {...controlProps("area")} className={inputStyles} {...register("area")} />
            </EmployeeEditorField>
            <EmployeeEditorField id={controlProps("wardCommune").id} label="Phường/Xã" error={errors.wardCommune?.message}>
              <input {...controlProps("wardCommune")} className={inputStyles} {...register("wardCommune")} />
            </EmployeeEditorField>
          </div>
          <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
            <EmployeeEditorField id={controlProps("otherInformation").id} label="Thông tin khác" error={errors.otherInformation?.message}>
              <textarea {...controlProps("otherInformation")} className={textareaStyles} {...register("otherInformation")} />
            </EmployeeEditorField>
            <EmployeeEditorField id={controlProps("notes").id} label="Ghi chú" error={errors.notes?.message}>
              <textarea {...controlProps("notes")} className={textareaStyles} {...register("notes")} />
            </EmployeeEditorField>
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
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
        description={`${formatMessage({ code: "MSG09", params: { action: `bỏ liên kết tài khoản @${employee?.account?.username ?? ""} khỏi hồ sơ nhân viên` } })} Tài khoản vẫn được giữ lại. Các thay đổi khác đang nhập chưa được lưu.`}
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
