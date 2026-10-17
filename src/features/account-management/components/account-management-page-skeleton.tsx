export function AccountManagementPageSkeleton() {
  return (
    <div aria-label="Đang tải danh sách tài khoản" className="animate-pulse space-y-6" role="status">
      <div className="space-y-3">
        <div className="h-4 w-36 rounded bg-slate-200" />
        <div className="h-10 w-80 max-w-full rounded bg-slate-200" />
        <div className="h-5 w-full max-w-2xl rounded bg-slate-100" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="h-96 rounded-card border border-border bg-surface" />
        <div className="h-[42rem] rounded-card border border-border bg-surface" />
      </div>
      <span className="sr-only">Đang tải...</span>
    </div>
  );
}
