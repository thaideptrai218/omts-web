import type { ManagedAccount } from "@/features/account-management/domain/account-management";

type ProtectedOwnerAccountSummaryProps = Readonly<{
  account: ManagedAccount;
  embedded: boolean;
}>;

/** Read-only view for the Cooperative Owner account: it cannot be edited or locked here. */
export function ProtectedOwnerAccountSummary({
  account,
  embedded,
}: ProtectedOwnerAccountSummaryProps) {
  return (
    <section
      className={
        embedded
          ? "min-w-0"
          : "rounded-card border border-border bg-surface p-5 shadow-card sm:p-6"
      }
    >
      <p className="text-sm font-semibold text-primary">
        Tài khoản Chủ nhiệm HTX
      </p>
      {!embedded && (
        <h2 className="mt-2 text-2xl font-semibold text-text">
          {account.displayName}
        </h2>
      )}
      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-text-muted">Tên đăng nhập</dt>
          <dd className="mt-1 font-semibold">@{account.username}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Loại tài khoản</dt>
          <dd className="mt-1 font-semibold">Chủ nhiệm HTX</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Số điện thoại</dt>
          <dd className="mt-1 font-semibold">{account.phone}</dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Trạng thái</dt>
          <dd className="mt-1 font-semibold">Hoạt động</dd>
        </div>
      </dl>
      <p className="mt-6 rounded-card border border-info/20 bg-sky-50 p-4 leading-7 text-info">
        Tài khoản này được bảo vệ và không thể chỉnh sửa hoặc khóa tại màn
        quản lý tài khoản nội bộ. Chủ nhiệm HTX tự cập nhật thông tin liên hệ
        trong hồ sơ cá nhân.
      </p>
    </section>
  );
}
