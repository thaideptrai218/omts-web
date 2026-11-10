"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { VietnameseDateInput } from "@/components/form/vietnamese-date-input";
import { businessToday, control, ErrorNotice } from "@/features/operations/ui";
import type { Employee } from "./contracts";

export type EmployeeStatusAction = "end-employment" | "resume";

/** Confirms the employee's last working day or resumption. */
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
  const title = action === "end-employment" ? "Nghỉ việc?" : "Cho làm việc lại?";
  const message = `${baseline.fullName} sẽ chuyển sang ${action === "end-employment" ? "Đã nghỉ việc" : "Đang làm việc"}.`;

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
            Xác nhận {action === "end-employment" ? "nghỉ việc" : "cho làm việc lại"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
