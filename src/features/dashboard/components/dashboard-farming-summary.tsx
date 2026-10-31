import type { DashboardFarmingSummary } from "../domain/dashboard";
import Link from "next/link";
import { InterfaceIcon } from "@/components/ui/interface-icon";

export function DashboardFarmingSummaryPanel({
  summary,
}: {
  summary: DashboardFarmingSummary;
}) {
  const total = summary.activeRaftCount + summary.discontinuedRaftCount;
  return (
    <section
      aria-label="Tình hình bè nuôi"
      className="rounded-card border border-border bg-surface p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <InterfaceIcon name="raft" className="size-5 text-primary" />
          Tình hình bè nuôi
        </h2>
        <Link
          href="/farming/rafts"
          className="inline-flex min-h-11 items-center gap-2 rounded-control px-2 text-sm font-medium text-primary hover:bg-primary-soft"
        >
          Xem danh sách bè
          <InterfaceIcon name="arrow" className="size-4" />
        </Link>
      </div>
      <p className="mt-1 text-sm leading-6 text-text-muted">
        Tình trạng sử dụng bè và chu kỳ nuôi trong hợp tác xã.
      </p>
      <dl className="mt-6 grid grid-cols-3 divide-x divide-border">
        {[
          ["Bè đang sử dụng", summary.activeRaftCount],
          ["Bè đã ngừng", summary.discontinuedRaftCount],
          ["Chu kỳ đang mở", summary.openCycleCount],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 px-3 first:pl-0">
            <dt className="min-h-10 text-xs leading-5 text-text-muted sm:min-h-0 sm:text-sm">
              {label}
            </dt>
            <dd className="mt-2 text-3xl font-semibold tabular-nums text-text">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {total > 0 && (
        <div className="mt-6">
          <div
            role="img"
            aria-label={`${summary.activeRaftCount} bè đang sử dụng, ${summary.discontinuedRaftCount} bè đã ngừng`}
            className="flex h-2.5 overflow-hidden rounded-full bg-border"
          >
            <span
              className="bg-primary"
              style={{
                flexBasis: `${(summary.activeRaftCount / total) * 100}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {summary.activeRaftCount} trong {total} bè đang được sử dụng
          </p>
        </div>
      )}
    </section>
  );
}
