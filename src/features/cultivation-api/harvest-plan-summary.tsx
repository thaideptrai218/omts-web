"use client";
import type { z } from "zod";
import { PlanBar } from "@/features/farming-management/plan-bar";
import type { harvestList } from "./records-contracts";

type HarvestScreen = z.infer<typeof harvestList>;
const kg = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

/** Planned (cycle target), actual and remaining kg of the open cycle; falls back to the lots when an older backend sends no totals. */
export function harvestProgressOf(data: HarvestScreen) {
  const harvestedKg = data.harvestedKg ?? data.lots.reduce((sum, lot) => sum + lot.estimatedKg, 0);
  const harvestedCages = data.harvestedCages ?? data.lots.reduce((sum, lot) => sum + lot.cageCount, 0);
  const target = data.targetYieldKg ?? null;
  return { harvestedKg, harvestedCages, target, remainingKg: data.remainingKg ?? (target === null ? null : target - harvestedKg) };
}

/** "So với kế hoạch" strip: kg first (estimate), cages second, remaining to the target. */
export function HarvestPlanSummary({ data, extraKg = 0 }: { data: HarvestScreen; extraKg?: number }) {
  if (!data.cycle) return null;
  const { harvestedKg, harvestedCages, target, remainingKg } = harvestProgressOf(data);
  const afterTrip = extraKg > 0 ? harvestedKg + extraKg : undefined;
  return <section aria-label="Sản lượng so với kế hoạch" className="mb-4 grid gap-2 rounded-control border border-border bg-surface p-3">
    <PlanBar label="Sản lượng thu hoạch" actual={harvestedKg} plan={target} unit="kg" estimate
      note={`Đã thu ${harvestedCages.toLocaleString("vi-VN", { maximumFractionDigits: 2 })} lồng${remainingKg !== null ? remainingKg >= 0 ? `. Còn ${kg(remainingKg)} kg để đạt mục tiêu.` : `. Đã vượt mục tiêu ${kg(-remainingKg)} kg.` : ". Chu kỳ chưa đặt sản lượng mục tiêu."}`} />
    {afterTrip !== undefined && target !== null && <p className={`text-xs ${afterTrip > target ? "text-warning" : "text-text-muted"}`} role="status">
      Cộng chuyến đang nhập: {kg(afterTrip)} kg ước tính{afterTrip > target ? `, vượt mục tiêu ${kg(target)} kg` : ""}.</p>}
  </section>;
}
