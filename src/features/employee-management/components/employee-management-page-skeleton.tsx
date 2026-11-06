export function EmployeeManagementPageSkeleton() {
  return (
    <div aria-label="Đang tải danh sách nhân viên" className="space-y-6" role="status">
      <div className="h-28 animate-pulse rounded-card bg-surface-subtle" />
      <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="h-[32rem] animate-pulse rounded-card bg-surface-subtle" />
        <div className="h-[46rem] animate-pulse rounded-card bg-surface-subtle" />
      </div>
      <span className="sr-only">Đang tải...</span>
    </div>
  );
}
