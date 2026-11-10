import type { RoleDetails } from "@/features/role-management/domain/role-management";

/** Explains why a discontinued role is read-only; fixed roles can be reactivated instead. */
export function RoleReadOnlyNotice({ fixedName }: Readonly<{ fixedName: boolean }>) {
  return (
    <div className="rounded-control border border-border bg-surface-subtle p-4 text-sm leading-6 text-text-muted">
      {fixedName
        ? "Vai trò đã ngừng dùng. Khôi phục sử dụng để tiếp tục cấu hình và cấp quyền mới; các quyền đã thu hồi không tự được cấp lại."
        : "Vai trò này đã ngừng dùng nên chỉ có thể xem hoặc sao chép. Hệ thống giữ lại vai trò để bảo toàn lịch sử cấp quyền."}
    </div>
  );
}

/** How many accounts and zones a permission change will affect. */
export function RoleUsageSummary({ role }: Readonly<{ role: RoleDetails }>) {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 rounded-control border border-info/20 bg-info-soft p-4 text-sm text-info">
      <span>
        <strong>{role.activeAccountCount}</strong> tài khoản đang giữ vai
        trò
      </span>
      <span>
        <strong>{role.activeZoneCount}</strong> khu vực bị ảnh hưởng
      </span>
    </div>
  );
}
