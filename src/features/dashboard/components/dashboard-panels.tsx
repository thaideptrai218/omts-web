import type { DashboardView } from "../domain/dashboard";
import Link from "next/link";

function DistributionBar({ first, second, label }: { first: number; second: number; label: string }) {
  const total = first + second;
  if (!total) return null;
  return <div role="img" aria-label={label} className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-[#c5d8dd]">
    <span className="bg-[#087f78]" style={{ width: `${first / total * 100}%` }} />
    <span className="bg-[#91aab4]" style={{ width: `${second / total * 100}%` }} />
  </div>;
}

function Metric({
  label,
  value,
  description,
  featured = false,
}: {
  label: string;
  value: number;
  description: string;
  featured?: boolean;
}) {
  return (
    <div className={`min-w-0 px-4 py-4 sm:px-5 ${featured ? "bg-[#086f78]" : ""}`}>
      <dt className={`text-sm font-medium ${featured ? "text-[#d2f2ef]" : "text-text-muted"}`}>{label}</dt>
      <dd className={`mt-2 text-3xl font-semibold tabular-nums tracking-tight ${featured ? "text-white" : "text-text"}`}>
        {value}
      </dd>
      <dd className={`mt-1 text-xs leading-5 ${featured ? "text-[#d2f2ef]" : "text-text-muted"}`}>{description}</dd>
    </div>
  );
}

function Workforce({ employed, left }: { employed: number; left: number }) {
  return (
    <section
      className="rounded-card bg-[#e8f2f3] p-5 sm:p-6"
      aria-labelledby="workforce-title"
    >
      <p className="text-[.7rem] font-bold uppercase tracking-[.14em] text-primary">Nhân sự</p>
      <h2 id="workforce-title" className="mt-1 text-lg font-semibold text-text">
        Nhân sự hợp tác xã
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Tình trạng làm việc trong hồ sơ nhân viên.
      </p>
      <DistributionBar first={employed} second={left} label={`${employed} nhân viên đang làm việc, ${left} đã nghỉ`} />
      <dl role="group" aria-label={`${employed} nhân viên đang làm việc, ${left} đã nghỉ`} className="mt-5 divide-y divide-border border-t border-border">
        <div className="flex items-baseline justify-between gap-4 py-3"><dt className="text-sm text-text-muted">Đang làm việc</dt><dd className="font-mono text-xl font-semibold tabular-nums text-primary">{employed}</dd></div>
        <div className="flex items-baseline justify-between gap-4 py-3"><dt className="text-sm text-text-muted">Đã nghỉ</dt><dd className="font-mono text-xl font-semibold tabular-nums text-text">{left}</dd></div>
      </dl>
    </section>
  );
}

function AccountStatus({ active, locked }: { active: number; locked: number }) {
  const total = active + locked;
  return (
    <section
      className="rounded-card border border-border bg-surface p-5 sm:p-6"
      aria-labelledby="account-status-title"
    >
      <p className="text-[.7rem] font-bold uppercase tracking-[.14em] text-primary">Truy cập</p>
      <h2 id="account-status-title" className="mt-1 text-lg font-semibold text-text">
        Tình trạng tài khoản nội bộ
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Theo dõi khả năng truy cập của nhân viên.
      </p>
      <DistributionBar first={active} second={locked} label={`${active} tài khoản hoạt động, ${locked} tài khoản đã khóa`} />
      <dl role="group" aria-label={`${active} tài khoản hoạt động, ${locked} tài khoản đã khóa`} className="mt-5 divide-y divide-border border-t border-border">
        <div className="flex items-baseline justify-between gap-4 py-3"><dt className="text-sm text-text-muted">Hoạt động</dt><dd className="font-mono text-xl font-semibold tabular-nums text-primary">{active}</dd></div>
        <div className="flex items-baseline justify-between gap-4 py-3"><dt className="text-sm text-text-muted">Đã khóa</dt><dd className="font-mono text-xl font-semibold tabular-nums text-danger">{locked}</dd></div>
      </dl>
      <p className="mt-1 text-xs text-text-muted">{total} tài khoản nội bộ</p>
    </section>
  );
}

export function DashboardPanels({ view }: { view: DashboardView }) {
  return (
    <div className="space-y-5">
      <dl className="grid divide-y divide-border overflow-hidden rounded-card border border-border border-t-2 border-t-text bg-surface sm:grid-cols-2 sm:divide-y-0 sm:[&>*:nth-child(2n)]:border-l sm:[&>*:nth-child(n+3)]:border-t xl:grid-cols-4 xl:[&>*:nth-child(n+3)]:border-t-0 xl:[&>*:nth-child(2n)]:border-l-0 xl:[&>*:not(:first-child)]:border-l">
        {view.workforce && (
          <Metric
            label="Tổng nhân viên"
            value={view.workforce.employedCount + view.workforce.leftCount}
            description={`${view.workforce.employedCount} người đang làm việc`}
            featured
          />
        )}
        {view.access && (
          <>
            <Metric
              label="Tài khoản hoạt động"
              value={view.access.activeInternalAccountCount}
              description={`${view.access.lockedInternalAccountCount} tài khoản đang khóa`}
              featured={!view.workforce}
            />
            <Metric
              label="Vai trò đang dùng"
              value={view.access.roleInUseCount}
              description="Có thể chọn khi phân quyền"
            />
            <Metric
              label="Vùng đang hoạt động"
              value={view.access.zoneInUseCount}
              description="Phạm vi nuôi của hợp tác xã"
            />
          </>
        )}
      </dl>
      {view.access?.lockedInternalAccountCount ? <section className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-[#fff5e6] px-5 py-4" aria-label="Tài khoản cần đối chiếu">
        <p className="text-sm text-[#6b440b]"><strong className="font-semibold">{view.access.lockedInternalAccountCount} tài khoản đã khóa.</strong> Kiểm tra trạng thái và lý do khóa trong danh sách tài khoản.</p>
        <Link href="/access/accounts" className="text-sm font-semibold text-[#6b440b] underline underline-offset-4">Xem tài khoản</Link>
      </section> : null}
      {view.workforce || view.access ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {view.workforce && (
            <Workforce
              employed={view.workforce.employedCount}
              left={view.workforce.leftCount}
            />
          )}
          {view.access && (
            <AccountStatus
              active={view.access.activeInternalAccountCount}
              locked={view.access.lockedInternalAccountCount}
            />
          )}
        </div>
      ) : (
        <div className="rounded-card border border-border bg-surface p-6">
          <h2 className="font-semibold text-text">
            Chưa có số liệu phù hợp với quyền hiện tại
          </h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">
            Các chức năng được cấp vẫn có trong thanh điều hướng. Bạn có thể
            quản lý hồ sơ và bảo mật cá nhân.
          </p>
        </div>
      )}
    </div>
  );
}

export function DashboardDataSkeleton() {
  return (
    <div
      role="status"
      aria-label="Đang tải số liệu bảng điều hành"
      className="space-y-5"
    >
      <span className="sr-only">
        Đang tải số liệu, bạn vẫn có thể sử dụng các lối tắt.
      </span>
      <div className="grid overflow-hidden rounded-[14px] border border-[#d7e5e9] bg-[#eff6f6] sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className={`min-h-32 p-5 ${item === 1 ? "bg-[#10243a]" : "border-t border-[#d7e5e9] sm:border-l sm:border-t-0"}`}
          >
            <div className={`h-3 w-2/3 rounded motion-safe:animate-pulse ${item === 1 ? "bg-white/20" : "bg-[#d7e5e9]"}`} />
            <div className={`mt-7 h-9 w-16 rounded motion-safe:animate-pulse ${item === 1 ? "bg-white/20" : "bg-[#d7e5e9]"}`} />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-52 rounded-[14px] border border-[#d7e5e9] bg-[#e7f2f1] motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
