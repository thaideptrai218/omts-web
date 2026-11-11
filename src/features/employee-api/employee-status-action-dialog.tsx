"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toDisplayDate } from "@/components/ui/management-screen/time-range-model";
import { businessToday } from "@/features/operations/ui";
import type { Employee } from "./contracts";

export type EmployeeStatusAction = "end-employment" | "resume";

/**
 * One-step confirmation for ending or resuming employment (DESIGN_GUIDELINES 1.6: status changes are confirmed).
 * There is no date to pick: ending employment records today as the last working day, resuming takes effect today.
 */
export function EmployeeStatusActionDialog({
  action,
  baseline,
  pending,
  busy,
  onCancel,
  onConfirm,
}: {
  action: EmployeeStatusAction;
  baseline: Employee;
  pending: boolean;
  /** Reads whether a mutation is in flight at the moment the dialog is dismissed. */
  busy(): boolean;
  onCancel(): void;
  onConfirm(): void;
}) {
  const ending = action === "end-employment";
  const today = toDisplayDate(businessToday());

  return (
    <Dialog
      open
      title={ending ? "Nghỉ việc?" : "Cho làm việc lại?"}
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
          {ending
            ? <><strong>{baseline.fullName}</strong> nghỉ việc từ hôm nay ({today}).</>
            : <><strong>{baseline.fullName}</strong> được cho làm việc lại từ hôm nay ({today}).</>}
        </p>
        <p className="mt-2 text-xs text-text-muted">
          {ending
            ? "Ngày làm cuối là hôm nay. Hồ sơ chuyển sang Đã nghỉ việc khi hết ngày. Có thể cho làm việc lại sau."
            : "Hồ sơ chuyển sang Đang làm việc."}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button className="w-auto" variant="secondary" disabled={pending} onClick={onCancel}>
            Bỏ qua
          </Button>
          <Button className="w-auto" type="submit" isPending={pending}>
            {ending ? "Xác nhận nghỉ việc" : "Xác nhận cho làm việc lại"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
