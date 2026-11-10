import type { AccountEditorStep } from "@/features/account-management/components/account-editor-model";

type AccountEditorStepIndicatorProps = Readonly<{
  isCreate: boolean;
  step: AccountEditorStep;
}>;

function stepClassName(isCurrent: boolean): string {
  return `rounded-control border px-3 py-2 text-sm font-semibold ${isCurrent ? "border-primary bg-primary-soft text-primary-hover" : "border-border text-text-muted"}`;
}

/** Two-step progress: edit details/grants, then preview effective permissions. */
export function AccountEditorStepIndicator({
  isCreate,
  step,
}: AccountEditorStepIndicatorProps) {
  return (
    <ol
      aria-label={isCreate ? "Các bước tạo tài khoản" : "Các bước cập nhật tài khoản"}
      className="mt-5 grid gap-2 sm:grid-cols-2"
    >
      <li className={stepClassName(step === "edit")}>1. Thông tin và quyền</li>
      <li className={stepClassName(step === "preview")}>
        2. Xem trước và xác nhận
      </li>
    </ol>
  );
}
