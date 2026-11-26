"use client";
import { useCallback, useMemo, useState } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { TimeRangeMenu } from "@/components/ui/management-screen/time-range-menu";
import { allTime, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import * as c from "./contracts";
import { Skeleton, businessToday, useRemote } from "./ui";
import { WATER_GRANULARITIES, aggregateWaterChart, defaultChartStart, defaultRangeText, type WaterGranularity } from "./water-chart-periods";
import { waterRepository } from "./water-measurement-shared";
import { WaterPeriodTable } from "./water-period-table";
import { WaterQualityChart } from "./water-quality-chart";
import local from "./water-screen.module.css";

const RANGE_PRESETS = ["thisMonth", "lastMonth", "thisQuarter", "lastQuarter", "thisYear", "lastYear", "all"] as const;

/**
 * "Xu hướng chất lượng nước" of one zone. The backend answers the raw points of the active measurements; grouping by month, quarter or
 * year is done here, so switching it does not read again. Without a chosen range the chart looks back 12 months, 8 quarters or 5 years.
 */
export function WaterChartSection({ zoneId }: { zoneId: string }) {
  const [granularity, setGranularity] = useState<WaterGranularity>("month"), [range, setRange] = useState<TimeRangeValue>(allTime);
  const today = businessToday();
  // A range that reaches past today is read up to today, so the chart does not end in empty future periods.
  const from = range.from || defaultChartStart(today, granularity), to = range.to && range.to < today ? range.to : "";
  const remote = useRemote(useCallback((signal: AbortSignal) => waterRepository.read("chart", { zoneId, from, to }, c.waterChartSchema, signal), [zoneId, from, to]));
  const data = useMemo(() => remote.data && aggregateWaterChart(remote.data, granularity), [remote.data, granularity]);
  return <section aria-label="Xu hướng chất lượng nước" className={local.panel}>
    <div className={local.panelHead}>
      <h2>Xu hướng chất lượng nước</h2>
      <div className={local.panelTools}>
        <div className={local.segmented} role="group" aria-label="Gộp số liệu theo">
          {WATER_GRANULARITIES.map(([key, label]) => <button key={key} type="button" aria-pressed={granularity === key} onClick={() => setGranularity(key)}>{label}</button>)}
        </div>
        <TimeRangeMenu label="Khoảng thời gian của biểu đồ" value={range} onChange={setRange} presets={RANGE_PRESETS} allLabel={defaultRangeText(granularity)} />
      </div>
    </div>
    {remote.loading && !data && <Skeleton />}
    {remote.error && <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại biểu đồ" />}
    {data && <><WaterQualityChart data={data} /><WaterPeriodTable data={data} /></>}
  </section>;
}
