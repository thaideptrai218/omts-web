import type { StaffOnboardingRequired } from "@/features/auth/domain/auth-types";

function StepMarker({ completed, number }: Readonly<{ completed: boolean; number: number }>) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-colors ${
        completed
          ? "border-success bg-success text-white"
          : "border-primary bg-primary-soft text-primary"
      }`}
    >
      {completed ? "✓" : number}
    </span>
  );
}

/** Two-step checklist (new password, contact verification) of the staff onboarding gate. */
export function StaffOnboardingProgress({
  checklist,
}: Readonly<{ checklist: StaffOnboardingRequired["checklist"] }>) {
  const passwordChanged = checklist.passwordChanged;

  return (
    <ol aria-label="Tiến trình thiết lập tài khoản" className="mt-5 grid gap-3 sm:grid-cols-2">
      <li className="flex items-start gap-3 rounded-control border border-border bg-surface p-4">
        <StepMarker completed={passwordChanged} number={1} />
        <div>
          <p className="font-semibold text-text">Đặt mật khẩu mới</p>
          <p className="mt-1 text-sm leading-5 text-text-muted">
            {passwordChanged ? "Đã hoàn tất" : "Đang thực hiện"}
          </p>
        </div>
      </li>
      <li
        aria-current={passwordChanged ? "step" : undefined}
        className="flex items-start gap-3 rounded-control border border-border bg-surface p-4"
      >
        <StepMarker completed={checklist.contactVerified} number={2} />
        <div>
          <p className="font-semibold text-text">Xác minh liên hệ</p>
          <p className="mt-1 text-sm leading-5 text-text-muted">
            {checklist.contactVerified ? "Đã xác minh" : passwordChanged ? "Sẵn sàng thực hiện" : "Mở sau bước 1"}
          </p>
        </div>
      </li>
    </ol>
  );
}
