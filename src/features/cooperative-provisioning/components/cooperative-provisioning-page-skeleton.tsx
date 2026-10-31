export function CooperativeProvisioningPageSkeleton() {
  return (
    <div
      aria-label="Đang tải màn hình khởi tạo hợp tác xã"
      className="space-y-6 motion-safe:animate-pulse"
      role="status"
    >
      <div className="space-y-3">
        <div className="h-4 w-32 rounded bg-slate-200" />
        <div className="h-10 w-72 max-w-full rounded bg-slate-200" />
        <div className="h-5 w-full max-w-2xl rounded bg-slate-200" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="h-[38rem] rounded-card border border-border bg-surface" />
        <div className="h-72 rounded-card border border-border bg-surface" />
      </div>
      <span className="sr-only">Đang tải...</span>
    </div>
  );
}
