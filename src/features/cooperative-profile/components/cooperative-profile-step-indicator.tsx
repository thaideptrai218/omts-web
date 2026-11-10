export type CooperativeProfileEditorStep = "details" | "preview";

const STEPS = [
  { id: "details", label: "Thông tin hồ sơ" },
  { id: "preview", label: "Xem trước công khai" },
] as const;

function getStepClassName(isCurrent: boolean, isComplete: boolean) {
  if (isCurrent) return "border-primary bg-primary-soft text-primary-hover";
  if (isComplete) return "border-success/30 bg-emerald-50 text-success";
  return "border-border bg-surface text-text-muted";
}

export function CooperativeProfileStepIndicator({
  currentStep,
}: Readonly<{ currentStep: CooperativeProfileEditorStep }>) {
  return (
    <ol aria-label="Tiến trình cập nhật hồ sơ" className="grid grid-cols-2 gap-2">
      {STEPS.map((step, index) => {
        const isCurrent = currentStep === step.id;
        const isComplete = currentStep === "preview" && step.id === "details";

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
