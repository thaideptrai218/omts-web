"use client";
import { ErrorNotice, Select, Skeleton } from "./ui";
import type { WaterChartData } from "./water-measurement-shared";
import { WaterQualityChart } from "./water-quality-chart";

type WaterChartSectionProps = {
  chart: { data?: WaterChartData; error?: string; loading: boolean };
  groupBy: string;
  onGroupByChange(groupBy: string): void;
};

/** "Xu hướng chất lượng nước" block of the water screen: grouping select + trend chart. */
export function WaterChartSection({ chart, groupBy, onGroupByChange }: WaterChartSectionProps) {
  return <section aria-labelledby="water-chart-heading" className="mt-7 border-t border-border pt-4">
    <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 id="water-chart-heading" className="text-base font-semibold tracking-tight">Xu hướng chất lượng nước</h2>
        <p className="mt-1 text-xs text-text-muted">Chỉ số đã xác nhận, so với ngưỡng hiện hành</p>
      </div>
      <div className="w-full sm:w-44">
        <Select label="Khoảng gộp" value={groupBy} onChange={(e) => onGroupByChange(e.target.value)}>
          <option value="month">Theo tháng</option>
          <option value="day">Theo ngày</option>
        </Select>
      </div>
    </div>
    <ErrorNotice error={chart.error} />
    {chart.loading ? <Skeleton /> : chart.data && <WaterQualityChart data={chart.data} />}
  </section>;
}
