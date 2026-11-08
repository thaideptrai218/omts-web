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
      className="h-full rounded-card border border-border bg-[#f6f8f3] p-5 text-text sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-text-muted">Vận hành nuôi trồng</p>
        <Link
          href="/farming/rafts"
          className="inline-flex min-h-8 items-center gap-2 rounded-control px-1 text-xs font-medium text-primary hover:underline underline-offset-4"
        >
          Xem bè nuôi
          <InterfaceIcon name="arrow" className="size-4" />
        </Link>
      </div>
      <h2 className="mt-1 text-base font-semibold tracking-tight">Tình hình bè nuôi</h2>
      <p className="mt-1 text-xs leading-5 text-text-muted">Tình trạng sử dụng và chu kỳ nuôi hiện tại.</p>
      <dl className="mt-4 grid items-end gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <dt className="text-xs text-text-muted">Bè đang sử dụng</dt>
          <dd className="mt-1 text-[2.5rem] leading-none font-semibold tabular-nums tracking-[-.055em]">{summary.activeRaftCount}<span className="ml-2 text-sm font-normal tracking-normal text-text-muted">/ {total} bè</span></dd>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div><dt className="text-xs leading-5 text-text-muted">Bè đã ngừng</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{summary.discontinuedRaftCount}</dd></div>
          <div><dt className="text-xs leading-5 text-text-muted">Chu kỳ đang mở</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{summary.openCycleCount}</dd></div>
        </div>
      </dl>
      {total > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-text-muted"><span>Phân bố bè theo tình trạng</span><span>{Math.round(summary.activeRaftCount / total * 100)}% đang sử dụng</span></div>
          <div
            role="img"
            aria-label={`${summary.activeRaftCount} bè đang sử dụng, ${summary.discontinuedRaftCount} bè đã ngừng`}
            className="flex h-1.5 overflow-hidden rounded-full bg-[#dce3dc]"
          >
            <span
              className="bg-[#61927b]"
              style={{
                flexBasis: `${(summary.activeRaftCount / total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}
