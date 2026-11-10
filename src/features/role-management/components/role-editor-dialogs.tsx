import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { RoleImpactAccountList } from "@/features/role-management/components/role-impact-account-list";
import type { RoleStatusActions } from "@/features/role-management/components/use-role-status-actions";
import type { RoleImpactAccount } from "@/features/role-management/domain/role-management";
import { formatMessage } from "@/shared/messages/message-catalog";

type RoleEditorDialogsProps = Readonly<{
  impactAccounts: readonly RoleImpactAccount[];
  isImpactDialogOpen: boolean;
  isPending: boolean;
  onConfirmImpact(): void;
  onImpactDialogOpenChange(open: boolean): void;
  /** Name shown in the confirmations: saved role name, else the draft name. */
  roleName?: string;
  draftName: string;
  statusActions: RoleStatusActions;
}>;

/** Impact confirmation before applying permission changes, plus reactivate/discontinue confirmations. */
export function RoleEditorDialogs({
  draftName,
  impactAccounts,
  isImpactDialogOpen,
  isPending,
  onConfirmImpact,
  onImpactDialogOpenChange,
  roleName,
  statusActions,
}: RoleEditorDialogsProps) {
  return (
    <>
      <Dialog
        description="Quyền mới sẽ áp dụng ngay cho mọi tài khoản đang giữ vai trò này. Hãy kiểm tra danh sách trước khi xác nhận."
        dismissible={!isPending}
        onOpenChange={onImpactDialogOpenChange}
        open={isImpactDialogOpen}
        title="Xác nhận ảnh hưởng quyền truy cập"
      >
        <RoleImpactAccountList accounts={impactAccounts} />
        <p className="mt-4 rounded-control border border-warning/30 bg-warning-soft p-3 text-sm leading-6 text-warning">
          {formatMessage({
            code: "MSG09",
            params: { action: `cập nhật vai trò ${roleName ?? draftName}` },
          })}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            className="sm:w-auto"
            data-dialog-initial-focus
            disabled={isPending}
            onClick={() => onImpactDialogOpenChange(false)}
            variant="secondary"
          >
            Kiểm tra lại
          </Button>
          <Button
            className="sm:w-auto"
            isPending={isPending}
            onClick={onConfirmImpact}
            pendingLabel="Đang áp dụng..."
          >
            Xác nhận và áp dụng
          </Button>
        </div>
      </Dialog>

      <ConfirmDialog
        confirmLabel="Khôi phục sử dụng"
        description="Vai trò sẽ xuất hiện trở lại khi phân quyền mới. Những quyền truy cập đã thu hồi vẫn được giữ nguyên lịch sử."
        isPending={isPending}
        onConfirm={() => void statusActions.reactivateRole()}
        onOpenChange={statusActions.setIsReactivateDialogOpen}
        open={statusActions.isReactivateDialogOpen}
        title={`Khôi phục vai trò ${roleName ?? ""}?`}
      />

      <ConfirmDialog
        confirmLabel="Ngừng sử dụng"
        description="Vai trò sẽ không còn xuất hiện khi cấp quyền mới. Nếu còn tài khoản đang giữ vai trò, hệ thống sẽ chặn thao tác và chỉ ra các tài khoản cần xử lý."
        isPending={isPending}
        onConfirm={() => void statusActions.discontinueRole()}
        onOpenChange={statusActions.setIsDiscontinueDialogOpen}
        open={statusActions.isDiscontinueDialogOpen}
        title={`Ngừng sử dụng vai trò ${roleName ?? ""}?`}
        tone="danger"
      />
    </>
  );
}
