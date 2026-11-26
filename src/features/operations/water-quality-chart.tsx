"use client";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, GRID_STROKE, labelInterval } from "@/components/ui/charts/chart-theme";
import charts from "@/components/ui/charts/charts.module.css";
import { indicatorRange } from "@/features/zones-api/zone-water-model";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { INDICATORS, boundsOf, chartDomain, chartRows, chartSummary, formatReading, type ChartRow } from "./water-chart-model";
import type { WaterChartData } from "./water-chart-periods";
import local from "./water-screen.module.css";

const LINE = "var(--omts-color-primary)", OUTSIDE = "var(--omts-color-danger)", LIMIT_BAND = "var(--omts-color-surface-subtle)";
const PLOT = 112, AXIS = 28, Y_WIDTH = 44, MARGIN = { top: 6, right: 12, left: 0, bottom: 0 } as const;

/** Three small charts one above the other (pH, độ mặn, nhiệt độ) that share the time axis; the readings and the thresholds in force are drawn on each. */
export function WaterQualityChart({ data }: { data: WaterChartData }) {
  const measured = data.periods.some(period => !period.missing);
  if (!measured) return <p role="status" className={local.emptyChart}>Chưa có lượt đo trong khoảng này.</p>;
  return <div className={local.charts}>
    <ul className={charts.legend} aria-label="Chú giải biểu đồ">
      <li><span className={charts.legendStatic}><i className={`${charts.swatch} ${charts.swatchLine}`} style={{ borderColor: LINE }} />Trung bình</span></li>
      <li><span className={charts.legendStatic}><i className={charts.swatch} style={{ background: LINE, opacity: 0.25 }} />Thấp nhất đến cao nhất</span></li>
      <li><span className={charts.legendStatic}><i className={charts.swatch} style={{ background: LIMIT_BAND, border: "1px solid var(--omts-color-border-strong)" }} />Trong ngưỡng của vùng</span></li>
      <li><span className={charts.legendStatic}><i className={charts.swatch} style={{ background: OUTSIDE, borderRadius: "50%" }} />Có lượt đo vượt ngưỡng</span></li>
    </ul>
    {INDICATORS.map((indicator, index) => <IndicatorChart key={indicator.key} data={data} indicator={indicator} last={index === INDICATORS.length - 1} />)}
  </div>;
}

function IndicatorChart({ data, indicator, last }: { data: WaterChartData; indicator: (typeof INDICATORS)[number]; last: boolean }) {
  const rows = chartRows(data, indicator.key), bounds = boundsOf(data, indicator.key), domain = chartDomain(rows, bounds);
  const limits = indicatorRange(data.thresholds, indicator.key), unit = indicator.unit ? ` ${indicator.unit}` : "";
  const hasLimits = bounds[0] !== null || bounds[1] !== null;
  return <figure className={local.chartFigure}>
    <figcaption><strong>{indicator.title}{unit}</strong>{limits && <span>ngưỡng vùng {limits}</span>}</figcaption>
    <div role="img" aria-label={chartSummary(data, indicator.key)} style={{ height: PLOT + (last ? AXIS : 0) }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart data={rows} syncId="water-trend" margin={MARGIN}>
          <CartesianGrid vertical={false} stroke={GRID_STROKE} />
          <XAxis dataKey="tick" hide={!last} height={last ? AXIS : 0} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval={labelInterval(rows.length)} />
          <YAxis domain={domain} width={Y_WIDTH} tick={AXIS_TICK} tickLine={false} axisLine={false} tickCount={4} tickFormatter={(value: number) => formatReading(value, 1)} />
          {hasLimits && <ReferenceArea y1={bounds[0] ?? domain[0]} y2={bounds[1] ?? domain[1]} fill={LIMIT_BAND} fillOpacity={1} stroke="var(--omts-color-border-strong)" strokeOpacity={0.5} strokeDasharray="3 3" ifOverflow="hidden" />}
          <Area dataKey="band" type="monotone" stroke="none" fill={LINE} fillOpacity={0.22} connectNulls={false} isAnimationActive={false} activeDot={false} />
          <Line dataKey="average" type="monotone" stroke={LINE} strokeWidth={2} connectNulls={false} isAnimationActive={false}
            dot={dot} activeDot={{ r: 5, stroke: "var(--omts-color-surface)", strokeWidth: 2 }} />
          <Tooltip content={<PeriodTooltip unit={unit} />} cursor={{ stroke: "var(--omts-color-border-strong)", strokeDasharray: "3 3" }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  </figure>;
}

/** Red for a period that had a reading beyond a threshold, the line colour otherwise; a period without data draws nothing. */
function dot(props: { cx?: number; cy?: number; index?: number; payload?: ChartRow }) {
  const { cx, cy, index, payload } = props;
  if (cx === undefined || cy === undefined || !payload || payload.average === null) return <g key={`gap-${index}`} />;
  return <circle key={`dot-${index}`} cx={cx} cy={cy} r={3.5} fill={payload.outside ? OUTSIDE : LINE} stroke="var(--omts-color-surface)" strokeWidth={1.5} />;
}

function PeriodTooltip({ active, payload, unit }: { active?: boolean; payload?: readonly { payload?: ChartRow }[]; unit: string }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return <div className={charts.tooltip} role="status">
    <strong>{row.label}</strong>
    <p className={local.tooltipDates}>{formatVietnameseDate(row.from)} – {formatVietnameseDate(row.to)}</p>
    {row.count === 0 || row.average === null || row.minimum === null || row.maximum === null ? <p>Không có lượt đo</p> : <ul>
      <li><span>Trung bình</span><b>{formatReading(row.average)}{unit}</b></li>
      <li><span>Thấp nhất – cao nhất</span><b>{formatReading(row.minimum)} – {formatReading(row.maximum)}{unit}</b></li>
      <li><span>Số lượt đo</span><b>{row.count}</b></li>
    </ul>}
    {row.outside && <p className={local.tooltipOutside}>Có lượt đo vượt ngưỡng</p>}
  </div>;
}
