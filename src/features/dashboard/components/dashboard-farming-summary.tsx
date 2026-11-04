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
      className="relative overflow-hidden rounded-card border border-[#173d4c] bg-[linear-gradient(125deg,#10243a_0%,#153e50_65%,#0b6267_100%)] p-5 text-white shadow-[0_16px_38px_rgb(16_36_58_/_0.14)] sm:p-7"
    >
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-28 size-72 rounded-full border border-white/10" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[.68rem] font-bold uppercase tracking-[.16em] text-[#9ed8d3]">Vận hành nuôi trồng</p>
        <Link
          href="/farming/rafts"
          className="inline-flex min-h-10 items-center gap-2 rounded-control px-2 text-sm font-semibold text-[#d9fffa] hover:bg-white/10"
        >
          Xem bè nuôi
          <InterfaceIcon name="arrow" className="size-4" />
        </Link>
      </div>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">Tình hình bè nuôi</h2>
      <p className="mt-1 text-sm leading-6 text-[#bbd0d7]">Tình trạng sử dụng và chu kỳ nuôi hiện tại.</p>
      <dl className="mt-6 grid items-end gap-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <dt className="text-sm text-[#c5dce1]">Bè đang sử dụng</dt>
          <dd className="mt-1 font-mono text-5xl font-semibold tabular-nums tracking-[-.06em] sm:text-6xl">{summary.activeRaftCount}<span className="ml-2 text-base font-normal tracking-normal text-[#c5dce1]">/ {total} bè</span></dd>
        </div>
        <div className="grid grid-cols-2 gap-3 border-t border-white/20 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div><dt className="text-xs leading-5 text-[#c5dce1]">Bè đã ngừng</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{summary.discontinuedRaftCount}</dd></div>
          <div><dt className="text-xs leading-5 text-[#c5dce1]">Chu kỳ đang mở</dt><dd className="mt-1 font-mono text-xl font-semibold tabular-nums">{summary.openCycleCount}</dd></div>
        </div>
      </dl>
      {total > 0 && (
        <div className="mt-6 border-t border-white/20 pt-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#c5dce1]"><span>Phân bố bè theo tình trạng</span><span>{Math.round(summary.activeRaftCount / total * 100)}% đang sử dụng</span></div>
          <div
            role="img"
            aria-label={`${summary.activeRaftCount} bè đang sử dụng, ${summary.discontinuedRaftCount} bè đã ngừng`}
            className="flex h-2.5 overflow-hidden rounded-full bg-white/20"
          >
            <span
              className="bg-[#87d8d0]"
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
