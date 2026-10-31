export function RoleManagementPageSkeleton() {
  return (
    <div aria-label="Đang tải danh sách vai trò" className="animate-pulse space-y-6" role="status">
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-10 w-72 max-w-full rounded bg-slate-200" />
        <div className="h-5 w-full max-w-xl rounded bg-slate-100" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="h-80 rounded-card border border-border bg-surface" />
        <div className="h-[38rem] rounded-card border border-border bg-surface" />
      </div>
      <span className="sr-only">Đang tải...</span>
    </div>
  );
}
