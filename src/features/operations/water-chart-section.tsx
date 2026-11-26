"use client";
import { useCallback, useMemo, useState } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { PeriodRangeMenu } from "@/components/ui/management-screen/period-range-menu";
import { lastDaysRange, type PeriodRange } from "@/components/ui/management-screen/period-range-model";
import * as c from "./contracts";
import { Skeleton, businessToday, useRemote } from "./ui";
import { aggregateWaterChart, granularityFor } from "./water-chart-periods";
import { WaterKpiCards } from "./water-kpi-cards";
import { waterRepository } from "./water-measurement-shared";
import { WaterPeriodTable } from "./water-period-table";
import local from "./water-screen.module.css";

/**
 * The indicators of one zone over a chosen range: three KPI cards, then the per-period table as a card of its own. The backend answers the raw
 * points of the active measurements; grouping by day, week, month, quarter or year follows the length of the range and is done here.
 */
export function WaterChartSection({ zoneId }: { zoneId: string }) {
  const today = businessToday();
  const [range, setRange] = useState<PeriodRange>(() => lastDaysRange(30, today));
  // A range that reaches today is read without an end date, so the backend answers up to now.
  const to = range.to < today ? range.to : "";
  const remote = useRemote(useCallback((signal: AbortSignal) => waterRepository.read("chart", { zoneId, from: range.from, to }, c.waterChartSchema, signal), [zoneId, range.from, to]));
  const granularity = granularityFor(range.from, range.to);
  const data = useMemo(() => remote.data && aggregateWaterChart(remote.data, granularity), [remote.data, granularity]);
  return <>
    <section aria-label="Chỉ số chất lượng nước" className={local.kpiBlock}>
      <div className={local.blockHead}>
        <h2>Chỉ số chất lượng nước</h2>
        <PeriodRangeMenu label="Khoảng thời gian" value={range} today={today} onChange={setRange} />
      </div>
      {remote.loading && !data && <Skeleton />}
      {remote.error && <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại" />}
      {data && <WaterKpiCards data={data} />}
    </section>
    {data && <WaterPeriodTable data={data} />}
  </>;
}
