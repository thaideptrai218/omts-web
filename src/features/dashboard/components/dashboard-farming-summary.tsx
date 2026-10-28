import type { DashboardFarmingSummary } from "../domain/dashboard";

export function DashboardFarmingSummaryPanel({
  summary,
}: {
  summary: DashboardFarmingSummary;
}) {
  return (
    <section
      aria-label="Tình hình bè nuôi"
      className="rounded-card border border-border bg-surface p-5 sm:p-6"
    >
      <h2 className="text-lg font-semibold">Tình hình bè nuôi</h2>
      <dl className="mt-5 grid grid-cols-3 divide-x divide-border">
        {[
          ["Bè đang sử dụng", summary.activeRaftCount],
          ["Bè đã ngừng", summary.discontinuedRaftCount],
          ["Chu kỳ đang mở", summary.openCycleCount],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 px-3 first:pl-0">
            <dt className="min-h-10 text-xs leading-5 text-text-muted sm:min-h-0 sm:text-sm">
              {label}
            </dt>
            <dd className="mt-2 text-2xl font-semibold tabular-nums">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
