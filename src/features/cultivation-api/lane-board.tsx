"use client";
import { LaneOverview } from "@/features/farming-management/lane-overview";
const states = ["NotSeeded", "Growing", "BeingHarvested", "Harvested", "OutOfService"] as const;
export function LaneBoard({ lanes, selected, onSelect }: { lanes: readonly { id?: string; laneNumber: number; state: string | number; statusId?: number; isDamaged?: boolean; isOutOfService?: boolean }[]; selected?: number; onSelect(lane: number): void }) {
  return <LaneOverview lanes={lanes.map(lane => ({ ...lane, state: typeof lane.state === "number" ? states[lane.state] : lane.state }))} opened={selected} onLaneClick={onSelect} label="Sơ đồ làn nuôi" />;
}
export function CyclePlanSummary({ plan }: { plan: { expectedSeedQuantity: number | null; expectedHarvestDate: string | null; targetYieldKg: number | null; assessment?: string | null; closeDate?: string | null } }) {
  const facts = [
    ["Lượng giống dự kiến", plan.expectedSeedQuantity == null ? "Chưa lập" : `${plan.expectedSeedQuantity.toLocaleString("vi-VN")} mảnh`],
    ["Ngày thu hoạch dự kiến", plan.expectedHarvestDate?.split("-").reverse().join("/") ?? "Chưa lập"],
    ["Sản lượng mục tiêu", plan.targetYieldKg == null ? "Chưa lập" : `${plan.targetYieldKg.toLocaleString("vi-VN")} kg`],
  ];
  return <section className="rounded-card border border-border p-4">
    <h3 className="mb-3 text-sm font-semibold">Kế hoạch chu kỳ</h3>
    <dl className="space-y-3 text-sm">{facts.map(([label, value]) => <div key={label} className="flex justify-between gap-4"><dt className="text-text-muted">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl>
    {plan.assessment && <p className="mt-4 border-t border-border pt-3 text-sm leading-6">Đánh giá: {plan.assessment}</p>}
    {plan.closeDate && <p className="mt-3 text-xs text-text-muted">Đã kết thúc ngày {plan.closeDate.split("-").reverse().join("/")}</p>}
  </section>;
}
