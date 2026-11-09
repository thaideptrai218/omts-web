import { Button } from "@/components/ui/button";
import type { ManagedAccount } from "@/features/account-management/domain/account-management";

type AccountEditorHeaderProps = Readonly<{
  /** Undefined while creating a new account. */
  account?: ManagedAccount;
  embedded: boolean;
  onResetPassword(): void;
  onToggleLock(): void;
}>;

/** Title block plus reset-password and lock/unlock actions for an existing account. */
export function AccountEditorHeader({
  account,
  embedded,
  onResetPassword,
  onToggleLock,
}: AccountEditorHeaderProps) {
  const isActive = account?.status === "active";

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-start sm:justify-between">
      {!embedded && (
        <div>
          <p className="text-sm font-semibold text-primary">
            {account ? "Chi tiết tài khoản" : "Tài khoản mới"}
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-text">
            {account ? account.displayName : "Thêm tài khoản nội bộ"}
          </h2>
          {account && (
            <p className="mt-2 text-sm text-text-muted">
              @{account.username} ·{" "}
              {isActive ? "Đang hoạt động" : "Đã khóa"}
            </p>
          )}
        </div>
      )}
      {account && (
        <div className="grid w-full gap-2 sm:ml-auto sm:w-auto sm:grid-cols-2">
          <Button onClick={onResetPassword} variant="secondary">
            Đặt lại mật khẩu
          </Button>
          <Button
            onClick={onToggleLock}
            variant={isActive ? "danger" : "secondary"}
          >
            {isActive ? "Khóa" : "Mở khóa"}
          </Button>
        </div>
      )}
    </div>
  );
}
