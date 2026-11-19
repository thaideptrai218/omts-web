"use client";
import { CartesianGrid, Line, LineChart as RechartsLineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, GRID_STROKE, defaultFormat, labelInterval, seriesColor } from "./chart-theme";
import { ChartDataTable, ChartLegend, ChartPlaceholder, ChartTooltip, legendFor, useHiddenSeries } from "./chart-parts";
import type { ChartCommonProps } from "./chart-types";
import styles from "./charts.module.css";

/** Biểu đồ đường nhiều chuỗi, cùng giao diện, chú giải bấm ẩn/hiện và bảng thay thế như biểu đồ cột. */
export function LineChart({ points, series, valueFormat = defaultFormat, axisFormat, ariaLabel, loading, emptyText = "Chưa có dữ liệu để vẽ biểu đồ.", height = 260 }: ChartCommonProps) {
  const { hidden, toggle } = useHiddenSeries();
  if (loading || !points.length) return <ChartPlaceholder loading={loading} text={emptyText} height={height} />;
  const rows = points.map((point) => ({ label: point.label, ...Object.fromEntries(series.map((item, column) => [`s${column}`, point.values[column] ?? 0])) }));
  return (
    <figure className={styles.wrap} style={{ margin: 0 }}>
      <ChartLegend entries={legendFor(series).map((entry) => ({ ...entry, kind: "line" as const }))} hidden={hidden} onToggle={toggle} />
      <div className={styles.plot} role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <RechartsLineChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval={labelInterval(rows.length)} />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={axisFormat ?? valueFormat} width={52} />
            <Tooltip content={<ChartTooltip format={valueFormat} />} />
            {series.map((item, column) => (
              <Line key={item.name} type="monotone" dataKey={`s${column}`} name={item.name} stroke={seriesColor(column, item.color)} strokeWidth={2} dot={{ r: 3 }}
                hide={hidden.has(item.name)} isAnimationActive={false} />
            ))}
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption={ariaLabel} points={points} series={series} format={valueFormat} />
    </figure>
  );
}
