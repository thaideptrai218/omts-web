"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/state/auth-provider";
import type {
  DashboardAccessSummary,
  DashboardView,
  DashboardWorkforceSummary,
} from "@/features/dashboard/domain/dashboard";
import { dashboardService } from "@/features/dashboard/services/dashboard-service.instance";
import { hasEffectivePermission } from "@/features/access/lib/has-effective-permission";

function DashboardSkeleton() {
  return (
    <div aria-label="Đang tải bảng điều hành" className="space-y-6" role="status">
      <div className="h-24 animate-pulse rounded-card bg-surface-subtle" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-32 animate-pulse rounded-card bg-surface-subtle" key={index} />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-card bg-surface-subtle" />
        <div className="h-80 animate-pulse rounded-card bg-surface-subtle" />
      </div>
    </div>
  );
}

function LoginRequired() {
  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Cần đăng nhập</h1>
      <p className="mt-3 leading-7 text-text-muted">Hãy đăng nhập để mở khu vực làm việc của bạn.</p>
      <Link className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-control bg-primary px-5 py-3 font-semibold text-white transition hover:bg-primary-hover" href="/login">
        Đi đến trang đăng nhập
      </Link>
    </section>
  );
}

function PermissionDenied() {
  return (
    <section className="mx-auto mt-10 w-full max-w-md rounded-card border border-border bg-surface p-6 text-center shadow-card sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-text">Chưa được cấp quyền</h1>
      <p className="mt-3 leading-7 text-text-muted">Tài khoản của bạn chưa có quyền xem bảng điều hành.</p>
    </section>
  );
}

function MetricCard({
  accent,
  detail,
  icon,
  label,
  value,
}: {
  accent: string;
  detail: string;
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <article className="relative overflow-hidden rounded-card border border-border bg-surface p-5 shadow-card">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-text">{value}</p>
        </div>
        <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-primary-soft text-xl text-primary-hover">{icon}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-text-muted">{detail}</p>
    </article>
  );
}

function WorkforceChart({ summary }: { summary: DashboardWorkforceSummary }) {
  const total = summary.employedCount + summary.leftCount;
  const employedPercentage = total === 0 ? 0 : Math.round((summary.employedCount / total) * 100);

  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6" aria-labelledby="workforce-chart-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-text" id="workforce-chart-title">Cơ cấu nhân sự</h2>
          <p className="mt-1 text-sm leading-6 text-text-muted">Tình trạng hồ sơ nhân viên hiện có.</p>
        </div>
        <Link className="shrink-0 text-sm font-semibold text-primary hover:text-primary-hover hover:underline" href="/employees">Xem danh sách</Link>
      </div>

      <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-center">
        <div
          aria-label={`${employedPercentage}% nhân viên đang làm việc`}
          className="relative grid size-44 shrink-0 place-items-center rounded-full"
          role="img"
          style={{ background: `conic-gradient(#0f766e ${employedPercentage}%, #e2e8f0 0)` }}
        >
          <div className="grid size-32 place-items-center rounded-full bg-surface text-center shadow-inner">
            <div>
              <p className="text-3xl font-semibold text-text">{total}</p>
              <p className="text-xs font-medium text-text-muted">hồ sơ</p>
            </div>
          </div>
        </div>
        <dl className="w-full max-w-xs space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-xl bg-primary-soft/70 px-4 py-3">
            <dt className="flex items-center gap-2 text-sm font-medium text-text"><span className="size-2.5 rounded-full bg-primary" />Đang làm việc</dt>
            <dd className="font-semibold text-text">{summary.employedCount}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-subtle px-4 py-3">
            <dt className="flex items-center gap-2 text-sm font-medium text-text"><span className="size-2.5 rounded-full bg-slate-300" />Đã nghỉ</dt>
            <dd className="font-semibold text-text">{summary.leftCount}</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

const pendingOperationalMetrics = [
  { label: "Thu tháng này", unit: "VNĐ" },
  { label: "Chi tháng này", unit: "VNĐ" },
  { label: "Bè đang hoạt động", unit: "bè" },
  { label: "Sản lượng thu hoạch", unit: "kg" },
] as const;

function OperationsDataPending() {
  return (
    <section className="rounded-card border border-border bg-surface p-5 shadow-card sm:p-6" aria-labelledby="operations-title">
      <div>
        <h2 className="text-xl font-semibold text-text" id="operations-title">Vận hành hợp tác xã</h2>
        <p className="mt-1 text-sm leading-6 text-text-muted">Thu, chi, bè nuôi và sản lượng sẽ hiển thị khi hợp tác xã bắt đầu ghi nhận dữ liệu.</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {pendingOperationalMetrics.map((metric) => (
          <div className="rounded-xl border border-dashed border-border-strong bg-canvas/60 p-4" key={metric.label}>
            <p className="text-sm font-medium text-text-muted">{metric.label}</p>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-2xl font-semibold text-text">—</span>
              <span className="pb-1 text-xs font-medium text-text-muted">{metric.unit}</span>
            </div>
            <p className="mt-3 text-xs font-medium text-warning">Chưa có dữ liệu</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function PersonalAccessSummary({
  roleLabel,
  scopeLabel,
}: {
  roleLabel: string;
  scopeLabel: string;
}) {
  return (
    <section className="rounded-card border border-border bg-gradient-to-br from-primary-hover to-primary p-6 text-white shadow-card">
      <p className="text-sm font-semibold text-teal-50/75">Phạm vi làm việc của bạn</p>
      <h2 className="mt-3 text-2xl font-semibold">{roleLabel}</h2>
      <p className="mt-2 text-sm leading-6 text-teal-50/85">{scopeLabel}</p>
      <p className="mt-8 border-t border-white/15 pt-4 text-sm leading-6 text-teal-50/80">
        Thanh điều hướng chỉ hiển thị những chức năng tài khoản được phép sử dụng.
      </p>
    </section>
  );
}

function AccessMetrics({ summary }: { summary: DashboardAccessSummary }) {
  return (
    <>
      <MetricCard accent="bg-sky-500" detail={`${summary.lockedInternalAccountCount} tài khoản đang bị khóa`} icon="◎" label="Tài khoản hoạt động" value={summary.activeInternalAccountCount} />
      <MetricCard accent="bg-violet-500" detail="Các vai trò còn hiệu lực để phân quyền" icon="◇" label="Vai trò đang dùng" value={summary.roleInUseCount} />
      <MetricCard accent="bg-amber-500" detail="Phạm vi nuôi đang được sử dụng" icon="⌖" label="Vùng đang hoạt động" value={summary.zoneInUseCount} />
    </>
  );
}

function DashboardContent({
  displayName,
  roleLabel,
  scopeLabel,
  view,
}: {
  displayName: string;
  roleLabel: string;
  scopeLabel: string;
  view: DashboardView;
}) {
  const firstName = displayName.trim().split(/\s+/).at(-1) ?? displayName;
  const hasManagementData = Boolean(view.access || view.workforce);
  const totalEmployees = view.workforce
    ? view.workforce.employedCount + view.workforce.leftCount
    : 0;

  return (
    <div className="space-y-6">
      <header>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-text sm:text-4xl">Hoạt động hợp tác xã</h1>
          <p className="mt-2 text-base leading-7 text-text-muted">Chào {firstName}, đây là những thông tin cần chú ý hôm nay.</p>
        </div>
      </header>

      {hasManagementData ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {view.workforce && <MetricCard accent="bg-primary" detail={`${view.workforce.leftCount} hồ sơ đã nghỉ được lưu lịch sử`} icon="◉" label="Tổng nhân viên" value={totalEmployees} />}
          {view.access && <AccessMetrics summary={view.access} />}
        </div>
      ) : (
        <section className="rounded-card border border-info/20 bg-sky-50 p-5 text-info">
          <h2 className="font-semibold">Chưa có số liệu quản lý phù hợp với quyền hiện tại</h2>
          <p className="mt-2 text-sm leading-6">Bạn vẫn có thể mở các chức năng được cấp trong thanh điều hướng.</p>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {view.workforce ? (
          <WorkforceChart summary={view.workforce} />
        ) : (
          <PersonalAccessSummary roleLabel={roleLabel} scopeLabel={scopeLabel} />
        )}
        <OperationsDataPending />
      </div>
    </div>
  );
}

export function DashboardExperience() {
  const { state } = useAuth();
  const [view, setView] = useState<DashboardView>();
  const [hasLoadError, setHasLoadError] = useState(false);
  const account = state.status === "authenticated" ? state.account : null;

  useEffect(() => {
    let isActive = true;
    if (!account) return () => { isActive = false; };

    dashboardService
      .load(account.access)
      .then((result) => {
        if (isActive) setView(result);
      })
      .catch(() => {
        if (isActive) setHasLoadError(true);
      });

    return () => { isActive = false; };
  }, [account]);

  if (state.status === "loading") return <DashboardSkeleton />;
  if (state.status === "anonymous") return <LoginRequired />;
  if (!hasEffectivePermission(state.account.access, "workspace.overview.view")) return <PermissionDenied />;
  if (!view && !hasLoadError) return <DashboardSkeleton />;

  if (hasLoadError || !view) {
    return (
      <section className="rounded-card border border-danger/20 bg-rose-50 p-6 text-danger">
        <h1 className="text-xl font-semibold">Chưa tải được bảng điều hành</h1>
        <p className="mt-2 text-sm leading-6">Kết nối có thể đang gián đoạn. Hãy tải lại trang để thử lại.</p>
      </section>
    );
  }

  return (
    <DashboardContent
      displayName={state.account.displayName}
      roleLabel={state.account.primaryRoleLabel}
      scopeLabel={state.account.scopeLabel}
      view={view}
    />
  );
}
