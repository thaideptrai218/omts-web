"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import { businessToday, control, ErrorNotice } from "@/features/operations/ui";
import type { Employee } from "./contracts";

export type EmployeeStatusAction = "unlink" | "end-employment" | "reinstate";

/** Confirmation for unlinking the account, ending employment (with end date) or reinstating. */
export function EmployeeStatusActionDialog({
  action,
  baseline,
  pending,
  busy,
  endDate,
  actionError,
  onEndDateChange,
  onCancel,
  onConfirm,
}: {
  action: EmployeeStatusAction;
  baseline: Employee;
  pending: boolean;
  /** Reads whether a mutation is in flight at the moment the dialog is dismissed. */
  busy(): boolean;
  endDate: string;
  actionError: string | undefined;
  onEndDateChange(value: string): void;
  onCancel(): void;
  onConfirm(): void;
}) {
  const title =
    action === "unlink" ? "Bỏ liên kết tài khoản?" : action === "end-employment" ? "Nghỉ việc?" : "Đi làm lại?";
  const message =
    action === "unlink"
      ? `Bỏ liên kết @${baseline.account?.username} khỏi ${baseline.fullName}? Các thay đổi khác đang nhập vẫn được giữ.`
      : `${baseline.fullName} sẽ chuyển sang ${action === "end-employment" ? "Đã nghỉ việc" : "Đang làm việc"}. Tài khoản và quyền truy cập được kiểm tra riêng.`;

  return (
    <Dialog
      open
      title={title}
      dismissible={!pending}
      onOpenChange={(open) => {
        if (!open && !busy()) onCancel();
      }}
    >
      <p>{message}</p>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        {action === "end-employment" && (
          <label className="block text-sm font-semibold">
            Ngày nghỉ việc *
            <VietnameseDateInput
              className={control}
              required
              max={businessToday()}
              value={endDate}
              disabled={pending}
              onValueChange={onEndDateChange}
              calendarLabel="Chọn ngày nghỉ việc"
            />
          </label>
        )}
        <ErrorNotice error={actionError} />
        <div className="flex flex-wrap gap-3">
          <Button className="w-auto" variant="secondary" disabled={pending} onClick={onCancel}>
            Hủy
          </Button>
          <Button className="w-auto" type="submit" isPending={pending}>
            Xác nhận {action === "unlink" ? "bỏ liên kết" : action === "end-employment" ? "nghỉ việc" : "đi làm lại"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
