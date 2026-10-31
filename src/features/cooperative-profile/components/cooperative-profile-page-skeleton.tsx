export function CooperativeProfilePageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải hồ sơ hợp tác xã" className="space-y-6">
      <div className="space-y-3">
        <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-72 max-w-full animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-slate-200" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-6 rounded-card border border-border bg-surface p-5 shadow-card sm:p-7">
          {[0, 1, 2].map((section) => (
            <div className="space-y-4" key={section}>
              <div className="h-6 w-44 animate-pulse rounded bg-slate-200" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-20 animate-pulse rounded-control bg-slate-100" />
                <div className="h-20 animate-pulse rounded-control bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-card border border-border bg-slate-100" />
      </div>
    </div>
  );
}
