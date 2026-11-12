"use client";
import type { z } from "zod";
import { planPercent } from "@/features/farming-management/plan-bar";
import type { harvestList } from "./records-contracts";

type HarvestScreen = z.infer<typeof harvestList>;
const kg = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Planned (cycle target), actual and remaining kg of the open cycle; falls back to the lots when an older backend sends no totals. remainingKg may be zero or negative: the plan is not a cap. */
export function harvestProgressOf(data: HarvestScreen) {
  const harvestedKg = data.harvestedKg ?? data.lots.reduce((sum, lot) => sum + lot.estimatedKg, 0);
  const harvestedCages = data.harvestedCages ?? data.lots.reduce((sum, lot) => sum + lot.cageCount, 0);
  const target = data.targetYieldKg ?? null;
  const percent = data.targetPercent ?? planPercent(harvestedKg, target) ?? null;
  return { harvestedKg, harvestedCages, target, remainingKg: data.remainingKg ?? (target === null ? null : target - harvestedKg), percent, overTarget: data.overTarget ?? (percent !== null && percent > 100) };
}

/**
 * "So với kế hoạch" strip: harvested kg (an estimate) against the cycle target. The target is only a plan (owner decision 12/11/2026): going over it is
 * information, shown with a neutral badge, never a warning, a block or a confirmation.
 */
export function HarvestPlanSummary({ data, extraKg = 0 }: { data: HarvestScreen; extraKg?: number }) {
  if (!data.cycle) return null;
  const { harvestedKg, harvestedCages, target, remainingKg, percent, overTarget } = harvestProgressOf(data);
  const afterTrip = extraKg > 0 ? harvestedKg + extraKg : undefined;
  const afterPercent = afterTrip !== undefined ? planPercent(afterTrip, target) : undefined;
  return <section aria-label="Sản lượng so với kế hoạch" className="mb-4 grid gap-2 rounded-control border border-border bg-surface p-3" data-testid="harvest-plan-summary">
    <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
      <span className="font-medium">Sản lượng thu hoạch <span className="font-normal text-text-muted">(ước tính)</span></span>
      <span className="tabular-nums text-text-muted">
        {target !== null ? `${kg(harvestedKg)} / ${kg(target)} kg ước tính` : `${kg(harvestedKg)} kg ước tính`}
        {percent !== null && <strong className="ml-1 text-text">({kg(percent)}%)</strong>}
        {overTarget && <span className="ml-2 rounded-full border border-border bg-surface-subtle px-2 py-0.5 font-medium text-text">Vượt kế hoạch</span>}
      </span>
    </div>
    {percent !== null
      ? <div role="progressbar" aria-label="Sản lượng so với kế hoạch" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(percent))} aria-valuetext={`${kg(percent)}% kế hoạch`} className="h-2 overflow-hidden rounded-full bg-surface-subtle">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      : <p className="text-xs text-text-muted">Chu kỳ chưa đặt sản lượng mục tiêu.</p>}
    <p className="text-xs text-text-muted">
      Đã thu {harvestedCages.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lồng
      {remainingKg !== null && (remainingKg > 0 ? `. Còn ${kg(remainingKg)} kg so với mục tiêu.` : remainingKg === 0 ? ". Đã đạt mục tiêu." : `. Cao hơn mục tiêu ${kg(-remainingKg)} kg.`)}
    </p>
    {afterTrip !== undefined && <p className="text-xs text-text-muted" role="status">
      Cộng chuyến đang nhập: {kg(afterTrip)} kg ước tính{afterPercent !== undefined ? ` (${kg(afterPercent)}% kế hoạch)` : ""}.</p>}
  </section>;
}
