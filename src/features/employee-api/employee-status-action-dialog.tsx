"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { DateCalendar } from "@/components/ui/management-screen/date-picker-field";
import { toDisplayDate } from "@/components/ui/management-screen/time-range-model";
import { businessToday, ErrorNotice } from "@/features/operations/ui";
import type { Employee } from "./contracts";

export type EmployeeStatusAction = "end-employment" | "resume";

/**
 * Confirms ending or resuming employment. A confirmation pop-up is kept on purpose (DESIGN_GUIDELINES 1.6: status changes
 * are confirmed): compact, one date field using the kit's calendar, actions on the right like the other dialogs.
 */
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
  const ending = action === "end-employment";
  const title = ending ? "Nghỉ việc?" : "Cho làm việc lại?";

  return (
    <Dialog
      open
      title={title}
      dismissible={!pending}
      onOpenChange={(open) => {
        if (!open && !busy()) onCancel();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm();
        }}
      >
        <p className="text-sm text-text">
          <strong>{baseline.fullName}</strong> sẽ chuyển sang {ending ? "Đã nghỉ việc" : "Đang làm việc"}.
        </p>
        {ending && (
          <div className="mt-4">
            <p className="text-xs font-medium text-text-muted">Ngày nghỉ việc *</p>
            <p className="mt-1 text-sm font-semibold" aria-live="polite">{endDate ? toDisplayDate(endDate) : "Chưa chọn"}</p>
            {/* Inline on purpose: a calendar popup inside this short dialog would be clipped by the dialog box. */}
            <div className="mt-2">
              <DateCalendar value={endDate} max={businessToday()} disabled={pending} onChange={onEndDateChange} />
            </div>
            <p className="mt-2 text-xs text-text-muted">Không sau hôm nay. Có thể cho làm việc lại sau.</p>
          </div>
        )}
        <ErrorNotice error={actionError} />
        <div className="mt-5 flex justify-end gap-3">
          <Button className="w-auto" variant="secondary" disabled={pending} onClick={onCancel}>
            Bỏ qua
          </Button>
          <Button className="w-auto" type="submit" isPending={pending}>
            Xác nhận {ending ? "nghỉ việc" : "cho làm việc lại"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
