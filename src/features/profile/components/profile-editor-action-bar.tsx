import { Button } from "@/components/ui/button";

type ProfileEditorActionBarProps = Readonly<{
  hasVerifiedChange: boolean;
  isBusy: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  onCancel(): void;
}>;

/** Footer of the profile form: unsaved-change hint, cancel (only when something changed) and submit. */
export function ProfileEditorActionBar({
  hasVerifiedChange,
  isBusy,
  isDirty,
  isSubmitting,
  onCancel,
}: ProfileEditorActionBarProps) {
  const hasChanges = isDirty || hasVerifiedChange;

  return (
    <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-text-muted">
        {hasVerifiedChange
          ? "Giá trị mới đã xác minh nhưng chưa được lưu."
          : "Thông tin chỉ thay đổi sau khi lưu thành công."}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        {hasChanges && (
          <Button disabled={isSubmitting || isBusy} onClick={onCancel} variant="secondary">
            Hủy thay đổi
          </Button>
        )}
        <Button
          className="sm:w-auto sm:min-w-44"
          disabled={isBusy || !hasChanges}
          isPending={isSubmitting}
          pendingLabel="Đang lưu..."
          type="submit"
        >
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}
