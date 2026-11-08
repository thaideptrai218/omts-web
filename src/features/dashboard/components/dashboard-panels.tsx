import type { DashboardView } from "../domain/dashboard";
import Link from "next/link";

function DistributionBar({ first, second, label }: { first: number; second: number; label: string }) {
  const total = first + second;
  if (!total) return null;
  return <div role="img" aria-label={label} className="mt-4 flex h-1.5 overflow-hidden rounded-full bg-[#c5d8dd]">
    <span className="bg-[#61927b]" style={{ width: `${first / total * 100}%` }} />
    <span className="bg-[#c1cbc5]" style={{ width: `${second / total * 100}%` }} />
  </div>;
}

function Metric({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="min-w-0 border-l border-border pl-4 first:border-l-0 first:pl-0">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight text-text">
        {value}
      </dd>
      <dd className="mt-1 text-[11px] leading-4 text-text-muted">{description}</dd>
    </div>
  );
}

function Workforce({ employed, left }: { employed: number; left: number }) {
  return (
    <section
      className="rounded-card border border-border bg-white p-5"
      aria-labelledby="workforce-title"
    >
      <p className="text-[11px] font-medium text-text-muted">Nhân sự</p>
      <h2 id="workforce-title" className="mt-1 text-base font-semibold text-text">
        Nhân sự hợp tác xã
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Tình trạng làm việc trong hồ sơ nhân viên.
      </p>
      <DistributionBar first={employed} second={left} label={`${employed} nhân viên đang làm việc, ${left} đã nghỉ`} />
      <dl role="group" aria-label={`${employed} nhân viên đang làm việc, ${left} đã nghỉ`} className="mt-3 grid grid-cols-2 gap-4 border-t border-border pt-3">
        <div className="flex items-baseline justify-between gap-3"><dt className="text-xs text-text-muted">Đang làm việc</dt><dd className="text-lg font-semibold tabular-nums text-text">{employed}</dd></div>
        <div className="flex items-baseline justify-between gap-3"><dt className="text-xs text-text-muted">Đã nghỉ</dt><dd className="text-lg font-semibold tabular-nums text-text">{left}</dd></div>
      </dl>
    </section>
  );
}

function AccountStatus({ active, locked }: { active: number; locked: number }) {
  const total = active + locked;
  return (
    <section
      className="rounded-card border border-border bg-surface p-5"
      aria-labelledby="account-status-title"
    >
      <p className="text-[11px] font-medium text-text-muted">Truy cập</p>
      <h2 id="account-status-title" className="mt-1 text-base font-semibold text-text">
        Tình trạng tài khoản nội bộ
      </h2>
      <p className="mt-1 text-xs text-text-muted">
        Theo dõi khả năng truy cập của nhân viên.
      </p>
      <DistributionBar first={active} second={locked} label={`${active} tài khoản hoạt động, ${locked} tài khoản đã khóa`} />
      <dl role="group" aria-label={`${active} tài khoản hoạt động, ${locked} tài khoản đã khóa`} className="mt-3 grid grid-cols-2 gap-4 border-t border-border pt-3">
        <div className="flex items-baseline justify-between gap-3"><dt className="text-xs text-text-muted">Hoạt động</dt><dd className="text-lg font-semibold tabular-nums text-text">{active}</dd></div>
        <div className="flex items-baseline justify-between gap-3"><dt className="text-xs text-text-muted">Đã khóa</dt><dd className={`text-lg font-semibold tabular-nums ${locked > 0 ? "text-danger" : "text-text"}`}>{locked}</dd></div>
      </dl>
      <p className="mt-1 text-xs text-text-muted">{total} tài khoản nội bộ</p>
    </section>
  );
}

export function DashboardPanels({ view }: { view: DashboardView }) {
  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,140px),1fr))] gap-y-4 border-y border-border py-4">
        {view.workforce && (
          <Metric
            label="Tổng nhân viên"
            value={view.workforce.employedCount + view.workforce.leftCount}
            description={`${view.workforce.employedCount} người đang làm việc`}
          />
        )}
        {view.access && (
          <>
            <Metric
              label="Tài khoản hoạt động"
              value={view.access.activeInternalAccountCount}
              description={`${view.access.lockedInternalAccountCount} tài khoản đang khóa`}
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
        <div className="grid gap-4 lg:grid-cols-2">
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
      <div className="grid overflow-hidden rounded-[14px] border border-[#d7e5e9] bg-[#fafbf9] sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className={`min-h-32 p-5 ${item === 1 ? "bg-[#f0f3ee]" : "border-t border-[#d7e5e9] sm:border-l sm:border-t-0"}`}
          >
            <div className={`h-3 w-2/3 rounded motion-safe:animate-pulse ${item === 1 ? "bg-[#d7e5e9]" : "bg-[#d7e5e9]"}`} />
            <div className={`mt-7 h-9 w-16 rounded motion-safe:animate-pulse ${item === 1 ? "bg-[#d7e5e9]" : "bg-[#d7e5e9]"}`} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-40 rounded-[14px] border border-[#d7e5e9] bg-[#f6f8f4] motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
