import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonConfirmDialog } from "@/features/account-management/components/reason-confirm-dialog";
import type { AccountLifecycleActions } from "@/features/account-management/components/use-account-lifecycle-actions";
import { formatMessage } from "@/shared/messages/message-catalog";

/** Confirmation dialogs for lock/unlock (with reason), revoke grant (with reason) and reset password. */
export function AccountLifecycleDialogs({
  lifecycle,
}: Readonly<{ lifecycle: AccountLifecycleActions }>) {
  const {
    action,
    confirmRevoke,
    confirmStatusChange,
    grantToRevoke,
    isActionPending,
    resetDialogOpen,
    resetPassword,
    setAction,
    setGrantToRevoke,
    setResetDialogOpen,
  } = lifecycle;

  return (
    <>
      {action && (
        <ReasonConfirmDialog
          confirmLabel={action === "lock" ? "Khóa tài khoản" : "Mở khóa"}
          description={formatMessage({
            code: "MSG09",
            params: {
              action:
                action === "lock" ? "khóa tài khoản" : "mở khóa tài khoản",
            },
          })}
          isPending={isActionPending}
          onConfirm={(reason) => void confirmStatusChange(reason)}
          onOpenChange={(open) => {
            if (!open) setAction(undefined);
          }}
          open
          title={action === "lock" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
          tone={action === "lock" ? "danger" : "primary"}
        />
      )}
      {grantToRevoke && (
        <ReasonConfirmDialog
          confirmLabel="Thu hồi quyền"
          description={formatMessage({
            code: "MSG09",
            params: { action: "thu hồi quyền truy cập này" },
          })}
          isPending={isActionPending}
          onConfirm={(reason) => void confirmRevoke(reason)}
          onOpenChange={(open) => {
            if (!open) setGrantToRevoke(undefined);
          }}
          open
          title="Thu hồi quyền truy cập"
          tone="danger"
        />
      )}
      <ConfirmDialog
        confirmLabel="Đặt lại mật khẩu"
        description={formatMessage({
          code: "MSG09",
          params: { action: "đặt lại mật khẩu tài khoản" },
        })}
        isPending={isActionPending}
        onConfirm={() => void resetPassword()}
        onOpenChange={setResetDialogOpen}
        open={resetDialogOpen}
        title="Tạo mật khẩu tạm thời mới"
      />
    </>
  );
}
