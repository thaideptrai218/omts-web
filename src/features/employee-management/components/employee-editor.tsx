"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { formatMessage } from "@/shared/messages/message-catalog";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";

type EmployeeEditorProps = Readonly<{
  availableAccounts: readonly EmployeeAccountSummary[];
  employee?: EmployeeProfile;
  onOpenExisting(employeeId: string): void;
  onSaved(employee: EmployeeProfile, followUp?: AccountFollowUp): void;
}>;

const inputStyles =
  "mt-2 min-h-12 w-full rounded-control border border-border-strong bg-surface px-3 text-text placeholder:text-text-muted disabled:bg-surface-subtle disabled:text-text-muted";
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
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-2 block font-normal text-danger">{message}</span>;
}

export function EmployeeEditor({
  availableAccounts,
  employee,
  onOpenExisting,
  onSaved,
}: EmployeeEditorProps) {
  const [feedback, setFeedback] = useState<
    Readonly<{
      existingEmployeeId?: string;
      text: string;
      tone: "danger" | "success";
    }> | undefined
  >();
  const [isSaving, setIsSaving] = useState(false);
  const isCreate = !employee;
  const options = employee?.account
    ? [employee.account, ...availableAccounts]
    : [...availableAccounts];
  const accountOptions = options.filter(
    (account, index) =>
      options.findIndex((candidate) => candidate.id === account.id) === index,
  );
  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    setError,
    setFocus,
  } = useForm<EmployeeEditorValues>({
    defaultValues: initialValues(employee),
    resolver: zodResolver(employeeEditorSchema),
  });

  const saveEmployee = handleSubmit(async (values) => {
    setFeedback(undefined);
    setIsSaving(true);

    try {
      const result = await employeeManagementService.save({
        ...values,
        accountId: values.accountId || null,
        id: employee?.id ?? null,
        recordVersion: employee?.recordVersion ?? null,
      });

      if (result.status === "session-expired") {
        sessionExpiryChannel.publish(result.message);
        return;
      }
      if (result.status === "forbidden") {
        setFeedback({ text: formatMessage(result.message), tone: "danger" });
        return;
      }
      if (result.status === "invalid-input") {
        const field = result.field;
        setError(field, { message: formatMessage(result.message) });
        requestAnimationFrame(() => setFocus(field));
        return;
      }
      if (
        result.status === "duplicate" ||
        result.status === "account-already-linked"
      ) {
        const field =
          result.status === "duplicate" ? "fullName" : "accountId";
        setError(field, { message: formatMessage(result.message) });
        setFeedback({
          existingEmployeeId: result.existingEmployeeId,
          text: formatMessage(result.message),
          tone: "danger",
        });
        requestAnimationFrame(() => setFocus(field));
        return;
      }

      setFeedback({ text: formatMessage(result.message), tone: "success" });
      onSaved(result.employee, result.followUp);
    } catch {
      setFeedback({
        text: "Chưa thể lưu hồ sơ. Dữ liệu hiện tại chưa bị thay đổi; hãy thử lại.",
        tone: "danger",
      });
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <section className="min-w-0 rounded-card border border-border bg-surface p-5 shadow-card sm:p-6">
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

      {feedback && (
        <div
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
              onClick={() => onOpenExisting(feedback.existingEmployeeId!)}
              type="button"
            >
              Mở hồ sơ hiện có
            </button>
          )}
        </div>
      )}

      <form className="mt-6 space-y-7" onSubmit={(event) => void saveEmployee(event)}>
        <fieldset className="min-w-0">
          <legend className="text-lg font-semibold text-text">Thông tin nhận diện</legend>
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold text-text">
              Họ và tên <span className="text-danger">*</span>
              <input
                aria-invalid={Boolean(errors.fullName)}
                autoComplete="name"
                className={inputStyles}
                {...register("fullName")}
              />
              <FieldError message={errors.fullName?.message} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Số điện thoại <span className="text-danger">*</span>
              <input
                aria-invalid={Boolean(errors.phone)}
                autoComplete="tel"
                className={inputStyles}
                inputMode="tel"
                {...register("phone")}
              />
              <FieldError message={errors.phone?.message} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Ngày sinh <span className="font-normal text-text-muted">(không bắt buộc)</span>
              <input className={inputStyles} type="date" {...register("birthday")} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Trạng thái <span className="text-danger">*</span>
              {isCreate ? (
                <>
                  <input type="hidden" value="employed" {...register("status")} />
                  <span className="mt-2 flex min-h-12 items-center rounded-control border border-border bg-surface-subtle px-3 text-text">
                    Đang làm việc
                  </span>
                </>
              ) : (
                <select className={inputStyles} {...register("status")}>
                  <option value="employed">Đang làm việc</option>
                  <option value="left">Đã nghỉ</option>
                </select>
              )}
              <FieldError message={errors.status?.message} />
            </label>
          </div>
        </fieldset>

        <fieldset className="min-w-0 border-t border-border pt-6">
          <legend className="text-lg font-semibold text-text">Tài khoản đăng nhập</legend>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            Chỉ hiển thị tài khoản nội bộ chưa liên kết với nhân viên khác. Liên kết account không tự cấp vai trò hoặc quyền truy cập.
          </p>
          <label className="mt-4 block min-w-0 text-sm font-semibold text-text">
            Tài khoản hệ thống <span className="font-normal text-text-muted">(không bắt buộc)</span>
            <select
              aria-invalid={Boolean(errors.accountId)}
              className={inputStyles}
              {...register("accountId")}
            >
              <option value="">Chưa liên kết tài khoản</option>
              {accountOptions.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.displayName} · @{account.username}
                  {account.status === "locked" ? " · Đã khóa" : ""}
                </option>
              ))}
            </select>
            <FieldError message={errors.accountId?.message} />
          </label>
        </fieldset>

        <fieldset className="min-w-0 border-t border-border pt-6">
          <legend className="text-lg font-semibold text-text">Thông tin bổ sung</legend>
          <p className="mt-1 text-sm leading-6 text-text-muted">
            Các trường dưới đây không bắt buộc và có thể cập nhật sau.
          </p>
          <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold text-text">
              Địa chỉ
              <input className={inputStyles} {...register("address")} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Khu vực
              <input className={inputStyles} {...register("area")} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Phường/Xã
              <input className={inputStyles} {...register("wardCommune")} />
            </label>
          </div>
          <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold text-text">
              Thông tin khác
              <textarea className={textareaStyles} {...register("otherInformation")} />
            </label>
            <label className="min-w-0 text-sm font-semibold text-text">
              Ghi chú
              <textarea className={textareaStyles} {...register("notes")} />
            </label>
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
          <Button
            className="sm:w-auto"
            disabled={!isCreate && !isDirty}
            isPending={isSaving}
            pendingLabel="Đang lưu hồ sơ..."
            type="submit"
          >
            {isCreate ? "Thêm nhân viên" : "Lưu thay đổi"}
          </Button>
        </div>
      </form>
    </section>
  );
}
