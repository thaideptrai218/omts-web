import type { AccountEditorFeedback } from "@/features/account-management/components/account-editor-model";

type AccountEditorFeedbackBannerProps = Readonly<{
  /** Set when a save hit a duplicate contact; offers a jump to that account. */
  duplicateAccountId?: string;
  feedback: AccountEditorFeedback;
  onOpenExisting(accountId: string): void;
}>;

export function AccountEditorFeedbackBanner({
  duplicateAccountId,
  feedback,
  onOpenExisting,
}: AccountEditorFeedbackBannerProps) {
  return (
    <div
      aria-live="polite"
      className={`mt-5 rounded-control border p-3 text-sm font-medium ${feedback.tone === "success" ? "border-emerald-200 bg-emerald-50 text-success" : "border-rose-200 bg-rose-50 text-danger"}`}
      role={feedback.tone === "danger" ? "alert" : "status"}
    >
      <p>{feedback.text}</p>
      {duplicateAccountId && (
        <button
          className="mt-2 min-h-11 rounded-control px-3 font-semibold underline underline-offset-4 hover:bg-white/60"
          onClick={() => onOpenExisting(duplicateAccountId)}
          type="button"
        >
          Mở tài khoản hiện có
        </button>
      )}
    </div>
  );
}
