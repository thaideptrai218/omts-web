"use client";
import { SelectBox } from "@/components/ui/select-box";
import { useCallback, useMemo, useState } from "react";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import * as c from "./contracts";
import { Skeleton, businessToday, useRemote } from "./ui";
import { aggregateWaterChart, defaultChartStart, type WaterGroupBy } from "./water-chart-periods";
import { waterRepository } from "./water-measurement-shared";
import { WaterQualityChart } from "./water-quality-chart";
import local from "./water-screen.module.css";

/**
 * "Xu hướng chất lượng nước": the backend answers raw points of the active measurements; grouping by day or month is done
 * here, so switching it does not read again. Without a start date the chart looks back twelve months.
 */
export function WaterChartSection({ zoneId, from, to }: { zoneId: string; from: string; to: string }) {
  const [groupBy, setGroupBy] = useState<WaterGroupBy>("month");
  const remote = useRemote(useCallback((signal: AbortSignal) => waterRepository.read("chart", { zoneId, from: from || defaultChartStart(businessToday()), to }, c.waterChartSchema, signal), [zoneId, from, to]));
  const data = useMemo(() => remote.data && aggregateWaterChart(remote.data, groupBy), [remote.data, groupBy]);
  return <section aria-label="Xu hướng chất lượng nước" className={local.panel}>
    <div className={local.panelHead}>
      <p>Chỉ số đã xác nhận, so với ngưỡng hiện hành</p>
      <label>Gộp theo<SelectBox value={groupBy} onChange={event => setGroupBy(event.target.value === "day" ? "day" : "month")}>
        <option value="month">Tháng</option><option value="day">Ngày</option></SelectBox></label>
    </div>
    {remote.loading && <Skeleton />}
    {remote.error && <ListStateMessage error={remote.error} onRetry={remote.reload} retryLabel="Tải lại biểu đồ" />}
    {data && <WaterQualityChart data={data} />}
  </section>;
}
