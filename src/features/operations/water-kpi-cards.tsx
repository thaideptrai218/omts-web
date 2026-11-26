"use client";
import { useId } from "react";
import { Area, AreaChart, ReferenceArea, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { INDICATORS, boundsOf, chartDomain, chartRows, formatReading, kpiOf, kpiSummary, type ChartRow } from "./water-chart-model";
import type { WaterChartData } from "./water-chart-periods";
import local from "./water-screen.module.css";

const LINE = "var(--omts-brand, #315a96)", OUTSIDE = "var(--omts-color-danger)";
const SPARK = 60, CARD_TITLES = { ph: "pH", salinity: "Độ mặn (‰)", temperature: "Nhiệt độ (°C)" } as const;

/** One row of three compact cards (pH, độ mặn, nhiệt độ): the latest period average, the average of the chosen range with the zone thresholds, and a sparkline. */
export function WaterKpiCards({ data }: { data: WaterChartData }) {
  if (!data.periods.some(period => !period.missing)) return <p role="status" className={local.emptyChart}>Chưa có lượt đo trong khoảng này.</p>;
  return <div className={local.kpiRow}>{INDICATORS.map(indicator => <KpiCard key={indicator.key} data={data} indicator={indicator} />)}</div>;
}

function KpiCard({ data, indicator }: { data: WaterChartData; indicator: (typeof INDICATORS)[number] }) {
  const gradient = `water-spark-${useId().replace(/:/g, "")}`;
  const kpi = kpiOf(data, indicator.key), rows = chartRows(data, indicator.key), bounds = boundsOf(data, indicator.key), domain = chartDomain(rows, bounds);
  const unit = indicator.unit ? ` ${indicator.unit}` : "";
  return <section className={local.kpiCard} aria-label={CARD_TITLES[indicator.key]}>
    <h3>{CARD_TITLES[indicator.key]}</h3>
    <p className={local.kpiValue}>
      <strong data-outside={kpi.latestOutside || undefined} className={kpi.latestOutside ? local.kpiOutside : undefined}>{kpi.latest === null ? "—" : formatReading(kpi.latest)}</strong>
      {kpi.latestOutside && <span className={local.kpiFlag}>Vượt ngưỡng</span>}
    </p>
    <p className={local.kpiSub}>TB kỳ chọn {kpi.rangeAverage === null ? "—" : formatReading(kpi.rangeAverage)}{kpi.limits ? ` · ngưỡng ${kpi.limits}` : ""}</p>
    <div role="img" aria-label={kpiSummary(data, indicator.key)} className={local.kpiSpark} style={{ height: SPARK }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <AreaChart data={rows} margin={{ top: 4, right: 2, left: 2, bottom: 2 }}>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={LINE} stopOpacity={0.22} /><stop offset="100%" stopColor={LINE} stopOpacity={0} /></linearGradient></defs>
          <YAxis hide domain={domain} />
          {(bounds[0] !== null || bounds[1] !== null) && <ReferenceArea y1={bounds[0] ?? domain[0]} y2={bounds[1] ?? domain[1]} fill={LINE} fillOpacity={0.06} stroke="none" ifOverflow="hidden" />}
          <Area dataKey="average" type="monotone" stroke={LINE} strokeWidth={1.75} fill={`url(#${gradient})`} connectNulls={false} isAnimationActive={false} dot={dot} activeDot={{ r: 3, fill: LINE, stroke: "var(--omts-color-surface)", strokeWidth: 1.5 }} />
          <Tooltip content={<SparkTooltip unit={unit} />} cursor={{ stroke: "var(--omts-color-border-strong)", strokeDasharray: "3 3" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </section>;
}

/** Only a period with a reading beyond a threshold gets a (red) dot; a lone period with no neighbour gets a small line-coloured one so it is not lost. */
function dot(props: { cx?: number; cy?: number; index?: number; payload?: ChartRow }) {
  const { cx, cy, index, payload } = props;
  if (cx === undefined || cy === undefined || !payload || payload.average === null) return <g key={`gap-${index}`} />;
  if (payload.outside) return <circle key={`out-${index}`} cx={cx} cy={cy} r={2.75} fill={OUTSIDE} />;
  return payload.isolated ? <circle key={`lone-${index}`} cx={cx} cy={cy} r={2} fill={LINE} /> : <g key={`plain-${index}`} />;
}

function SparkTooltip({ active, payload, unit }: { active?: boolean; payload?: readonly { payload?: ChartRow }[]; unit: string }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const text = row.count === 0 || row.average === null || row.minimum === null || row.maximum === null ? "không có lượt đo"
    : `TB ${formatReading(row.average)}${unit} · thấp ${formatReading(row.minimum)} · cao ${formatReading(row.maximum)} · ${row.count} lượt`;
  return <div className={local.sparkTooltip} role="status"><strong>{row.label}</strong> · <span className={row.outside ? local.kpiOutside : undefined}>{text}</span></div>;
}
