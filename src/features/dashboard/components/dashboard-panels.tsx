import type { DashboardView } from "../domain/dashboard";
import {
  InterfaceIcon,
  type InterfaceIconName,
} from "@/components/ui/interface-icon";

function Metric({
  label,
  value,
  description,
  icon,
}: {
  label: string;
  value: number;
  description: string;
  icon: InterfaceIconName;
}) {
  return (
    <article className="min-w-0 rounded-card border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text-muted">{label}</p>
        <InterfaceIcon name={icon} className="size-5 shrink-0 text-primary" />
      </div>
      <p className="mt-5 text-4xl font-semibold tabular-nums tracking-tight text-text">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-text-muted">{description}</p>
    </article>
  );
}

function Workforce({ employed, left }: { employed: number; left: number }) {
  const total = employed + left;
  const percentage = total ? Math.round((employed / total) * 100) : 0;
  return (
    <section
      className="rounded-card border border-border bg-surface p-5 sm:p-6"
      aria-labelledby="workforce-title"
    >
      <h2 id="workforce-title" className="text-lg font-semibold text-text">
        Nhân sự hợp tác xã
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Tình trạng làm việc trong hồ sơ nhân viên.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-6">
        <div
          role="img"
          aria-label={`${employed} nhân viên đang làm việc, ${left} đã nghỉ`}
          className="grid size-36 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--omts-color-primary) ${percentage}%, var(--omts-color-border) 0)`,
          }}
        >
          <div className="grid size-28 place-items-center rounded-full bg-surface text-center">
            <div>
              <p className="text-4xl font-semibold tabular-nums text-text">
                {total}
              </p>
              <p className="mt-1 text-xs text-text-muted">hồ sơ nhân viên</p>
            </div>
          </div>
        </div>
        <dl className="min-w-32 flex-1 space-y-4 sm:max-w-52">
          <div className="border-l-4 border-primary pl-3">
            <dt className="text-sm text-text-muted">Đang làm việc</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-text">
              {employed}
            </dd>
          </div>
          <div className="border-l-4 border-border pl-3">
            <dt className="text-sm text-text-muted">Đã nghỉ</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums text-text">
              {left}
            </dd>
          </div>
        </dl>
      </div>
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
      <h2 id="account-status-title" className="text-lg font-semibold text-text">
        Tình trạng tài khoản nội bộ
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Theo dõi khả năng truy cập của nhân viên.
      </p>
      <p className="mt-7 text-4xl font-semibold tabular-nums text-text">
        {total}
        <span className="ml-2 text-sm font-normal text-text-muted">
          tài khoản
        </span>
      </p>
      <div
        role="img"
        aria-label={`${active} tài khoản hoạt động, ${locked} tài khoản đã khóa`}
        className="mt-5 flex h-4 overflow-hidden rounded-full bg-border"
      >
        <span
          className="bg-primary"
          style={{ flexBasis: `${total ? (active / total) * 100 : 0}%` }}
        />
        <span
          className="bg-danger"
          style={{ flexBasis: `${total ? (locked / total) * 100 : 0}%` }}
        />
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <dt className="text-sm text-text-muted">Hoạt động</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums text-primary">
            {active}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-text-muted">Đã khóa</dt>
          <dd className="mt-2 text-2xl font-semibold tabular-nums text-danger">
            {locked}
          </dd>
        </div>
      </dl>
    </section>
  );
}

export function DashboardPanels({ view }: { view: DashboardView }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {view.workforce && (
          <Metric
            label="Tổng nhân viên"
            value={view.workforce.employedCount + view.workforce.leftCount}
            description={`${view.workforce.employedCount} người đang làm việc`}
            icon="users"
          />
        )}
        {view.access && (
          <>
            <Metric
              label="Tài khoản hoạt động"
              value={view.access.activeInternalAccountCount}
              description={`${view.access.lockedInternalAccountCount} tài khoản đang khóa`}
              icon="account"
            />
            <Metric
              label="Vai trò đang dùng"
              value={view.access.roleInUseCount}
              description="Có thể chọn khi phân quyền"
              icon="roles"
            />
            <Metric
              label="Vùng đang hoạt động"
              value={view.access.zoneInUseCount}
              description="Phạm vi nuôi của hợp tác xã"
              icon="zone"
            />
          </>
        )}
      </div>
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-40 rounded-card border border-border bg-surface p-5"
          >
            <div className="h-4 w-2/3 rounded bg-surface-subtle motion-safe:animate-pulse" />
            <div className="mt-6 h-10 w-14 rounded bg-surface-subtle motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {[1, 2].map((item) => (
          <div
            key={item}
            className="h-72 rounded-card border border-border bg-surface-subtle motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
