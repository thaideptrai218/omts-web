"use client";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { toDisplayDate } from "@/components/ui/management-screen/time-range-model";
import { businessToday } from "@/features/operations/ui";
import type { Employee } from "./contracts";
import { EmployeeEndEmploymentDialog, type EndEmploymentChoice } from "./employee-end-employment-dialog";

export type EmployeeStatusAction = "end-employment" | "resume";

/**
 * Confirmation for the two status changes (DESIGN_GUIDELINES 1.6: status changes are confirmed).
 * "Nghỉ việc" lets the Owner pick the last working day and shows its consequences first (EmployeeEndEmploymentDialog);
 * "Làm việc lại" is one step that takes effect today.
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
  /** Ending passes the chosen last working day and whether to lock the linked account; resuming passes nothing. */
  onConfirm(choice?: EndEmploymentChoice): void;
}) {
  if (action === "end-employment") return <EmployeeEndEmploymentDialog baseline={baseline} pending={pending} busy={busy} onCancel={onCancel} onConfirm={onConfirm} />;
  const today = toDisplayDate(businessToday());
  return (
    <Dialog
      open
      title="Làm việc lại?"
      mobileLayout="compact"
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
        <p className="text-sm text-text"><strong>{baseline.fullName}</strong> được cho làm việc lại từ hôm nay ({today}).</p>
        <p className="mt-2 text-xs text-text-muted">Hồ sơ chuyển sang Đang làm việc.</p>
        <div className="mt-5 flex justify-end gap-3">
          <Button className="w-auto" variant="secondary" disabled={pending} onClick={onCancel}>
            Bỏ qua
          </Button>
          <Button className="w-auto" type="submit" isPending={pending}>
            Xác nhận làm việc lại
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
