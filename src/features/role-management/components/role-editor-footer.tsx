import { Button } from "@/components/ui/button";

type RoleEditorFooterProps = Readonly<{
  canDiscontinue: boolean;
  canReactivate: boolean;
  hasChanges: boolean;
  isExistingRole: boolean;
  isPending: boolean;
  isReadOnly: boolean;
  onDiscontinue(): void;
  onReactivate(): void;
  onReset(): void;
  onSave(): void;
}>;

/** Sticky action bar: status actions on the left, reset/save on the right. */
export function RoleEditorFooter({
  canDiscontinue,
  canReactivate,
  hasChanges,
  isExistingRole,
  isPending,
  isReadOnly,
  onDiscontinue,
  onReactivate,
  onReset,
  onSave,
}: RoleEditorFooterProps) {
  return (
    <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-border bg-surface py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {canDiscontinue && (
          <Button
            className="sm:w-auto"
            disabled={isPending}
            onClick={onDiscontinue}
            variant="danger"
          >
            Ngừng sử dụng
          </Button>
        )}
        {canReactivate && (
          <Button className="sm:w-auto" disabled={isPending} onClick={onReactivate}>
            Khôi phục sử dụng
          </Button>
        )}
      </div>
      {!isReadOnly && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <Button
            className="sm:w-auto"
            disabled={!hasChanges || isPending}
            onClick={onReset}
            variant="secondary"
          >
            Hủy thay đổi
          </Button>
          <Button
            className="sm:w-auto sm:min-w-40"
            disabled={isExistingRole && !hasChanges}
            isPending={isPending}
            onClick={onSave}
            pendingLabel="Đang lưu..."
          >
            Lưu vai trò
          </Button>
        </div>
      )}
    </div>
  );
}
