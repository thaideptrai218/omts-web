import type { RefObject } from "react";
import type { useEmployeeEditorActions } from "./use-employee-editor-actions";

export type EmployeeEditorFeedbackMessage = NonNullable<
  ReturnType<typeof useEmployeeEditorActions>["feedback"]
>;

type EmployeeEditorFeedbackProps = Readonly<{
  feedback: EmployeeEditorFeedbackMessage;
  feedbackRef: RefObject<HTMLDivElement | null>;
  isOpenExistingDisabled: boolean;
  isOpenExistingUnavailable: boolean;
  onOpenExisting(employeeId: string): void;
}>;

/** Save/unlink outcome banner; duplicate-phone errors can link to the existing employee record. */
export function EmployeeEditorFeedback({
  feedback,
  feedbackRef,
  isOpenExistingDisabled,
  isOpenExistingUnavailable,
  onOpenExisting,
}: EmployeeEditorFeedbackProps) {
  const toneClassName = feedback.tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-success"
    : "border-rose-200 bg-rose-50 text-danger";

  return (
    <div
      ref={feedbackRef}
      tabIndex={-1}
      aria-live="polite"
      className={`mt-5 rounded-control border p-3 text-sm font-medium ${toneClassName}`}
      role={feedback.tone === "danger" ? "alert" : "status"}
    >
      <p>{feedback.text}</p>
      {feedback.existingEmployeeId && (
        <button
          className="mt-2 min-h-11 rounded-control px-3 font-semibold underline underline-offset-4 hover:bg-white/60"
          disabled={isOpenExistingDisabled}
          onClick={() => {
            const id = feedback.existingEmployeeId;
            if (id) onOpenExisting(id);
          }}
          type="button"
        >
          Mở hồ sơ hiện có
        </button>
      )}
      {feedback.existingEmployeeId && isOpenExistingUnavailable && (
        <p className="mt-2">Chưa mở được hồ sơ này. Các thay đổi đang nhập vẫn được giữ.</p>
      )}
    </div>
  );
}
