export function StaffRoleSummary() {
  return <aside aria-label="Nhân viên thông thường" className="my-4 grid gap-3 rounded-card border border-border bg-surface-subtle p-4 md:grid-cols-[220px_1fr]">
    <div><p className="text-xs font-medium uppercase tracking-wide text-text-muted">Tài khoản nội bộ</p><h2 className="mt-1 font-semibold">Nhân viên thông thường</h2></div>
    <div className="space-y-1 text-sm"><p>Nhân viên có tài khoản nội bộ; quyền quản lý vùng và kế toán được cấp riêng theo nhiệm vụ.</p><p className="text-text-muted">Chưa được cấp vai trò quản lý không đồng nghĩa với có quyền quản lý. Công việc cá nhân được hiển thị theo quyền hiệu lực của tài khoản.</p></div>
  </aside>;
}
