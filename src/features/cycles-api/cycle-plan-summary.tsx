import { cycleNurseryText } from "./nursery-batch-options";
import type { CycleView } from "./cycle-model";

/** "Kế hoạch chu kỳ" side panel of Tiến độ làn: the planned yield and the nursed batch (a planned seed quantity only on an old cycle that has one). */
export function CyclePlanSummary({ cycle }: { cycle: CycleView }) {
  const facts: (readonly [string, string])[] = [
    ["Sản lượng dự kiến", cycle.targetYieldKg == null ? "Chưa lập" : `${cycle.targetYieldKg.toLocaleString("vi-VN")} kg`],
    ["Đợt ươm", cycle.nurseryBatchId ? cycleNurseryText(cycle) : "Không qua ươm"],
    ...(cycle.expectedSeedQuantity != null ? [["Lượng giống dự kiến", `${cycle.expectedSeedQuantity.toLocaleString("vi-VN")} mảnh`] as const] : []),
  ];
  return <section className="rounded-card border border-border p-4">
    <h3 className="mb-3 text-sm font-semibold">Kế hoạch chu kỳ</h3>
    <dl className="space-y-3 text-sm">{facts.map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-text-muted">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl>
    {cycle.assessment && <p className="mt-4 border-t border-border pt-3 text-sm leading-6">Đánh giá: {cycle.assessment}</p>}
    {cycle.closeDate && <p className="mt-3 text-xs text-text-muted">Đã kết thúc ngày {cycle.closeDate.split("-").reverse().join("/")}</p>}
  </section>;
}
