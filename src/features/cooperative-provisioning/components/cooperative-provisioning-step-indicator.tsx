export type CooperativeProvisioningStep = "details" | "review";

const STEPS = [
  { id: "details", label: "Thông tin" },
  { id: "review", label: "Xác nhận" },
] as const;

function getStepClassName(isCurrent: boolean, isComplete: boolean) {
  if (isCurrent) return "border-primary bg-primary-soft text-primary-hover";
  if (isComplete) return "border-success/30 bg-emerald-50 text-success";
  return "border-border bg-surface text-text-muted";
}

export function CooperativeProvisioningStepIndicator({
  currentStep,
}: {
  currentStep: CooperativeProvisioningStep;
}) {
  return (
    <ol aria-label="Tiến trình khởi tạo hợp tác xã" className="grid grid-cols-2 gap-2">
      {STEPS.map((step, index) => {
        const isCurrent = currentStep === step.id;
        const isComplete = currentStep === "review" && step.id === "details";

        return (
          <li
            aria-current={isCurrent ? "step" : undefined}
            className={`flex min-h-11 items-center gap-2 rounded-control border px-3 text-sm font-semibold ${getStepClassName(
              isCurrent,
              isComplete,
            )}`}
            key={step.id}
          >
            <span
              aria-hidden="true"
              className="grid size-6 shrink-0 place-items-center rounded-full border border-current text-xs"
            >
              {isComplete ? "✓" : index + 1}
            </span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
