"use client";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AXIS_TICK, GRID_STROKE, OVERLAY_COLOR, REFERENCE_COLOR, defaultFormat, labelInterval, seriesColor } from "./chart-theme";
import { ChartDataTable, ChartLegend, ChartPlaceholder, ChartTooltip, legendFor, useHiddenSeries, type LegendEntry } from "./chart-parts";
import type { ChartCommonProps, ChartOverlayLine, ChartReferenceLine } from "./chart-types";
import styles from "./charts.module.css";

type BarChartProps = ChartCommonProps & Readonly<{
  /** Cột chồng nhau (ví dụ theo vùng) thay vì đứng cạnh nhau. */
  stacked?: boolean;
  /** Đường phủ theo trục phải, ví dụ cộng dồn. */
  overlay?: ChartOverlayLine;
  /** Mốc ngang, ví dụ mục tiêu. */
  reference?: ChartReferenceLine;
}>;

/**
 * Biểu đồ cột (nhiều chuỗi, tuỳ chọn cột chồng) kèm đường phủ và mốc ngang trên trục phải.
 * Chú giải bấm để ẩn/hiện; có bảng số liệu ẩn thị giác cho trình đọc màn hình; co giãn theo khung chứa.
 */
export function BarChart({ points, series, stacked, overlay, reference, valueFormat = defaultFormat, axisFormat, ariaLabel, loading, emptyText = "Chưa có dữ liệu để vẽ biểu đồ.", height = 260 }: BarChartProps) {
  const { hidden, toggle } = useHiddenSeries();
  if (loading || !points.length) return <ChartPlaceholder loading={loading} text={emptyText} height={height} />;
  const axis = axisFormat ?? valueFormat;
  const rows = points.map((point, row) => ({ label: point.label, ...Object.fromEntries(series.map((item, column) => [`s${column}`, point.values[column] ?? 0])), line: overlay?.values[row] ?? 0 }));
  const entries: LegendEntry[] = [
    ...legendFor(series),
    ...(overlay ? [{ name: overlay.name, color: overlay.color ?? OVERLAY_COLOR, kind: "line" as const, toggleable: true }] : []),
    ...(reference ? [{ name: reference.label, color: REFERENCE_COLOR, kind: "dash" as const, toggleable: false }] : []),
  ];
  // Mốc ngang cần đường phủ cùng đơn vị mới vẽ theo trục phải; không có thì vẽ theo trục trái.
  const refAxis = overlay ? "right" : "left";
  return (
    <figure className={styles.wrap} style={{ margin: 0 }}>
      <ChartLegend entries={entries} hidden={hidden} onToggle={toggle} />
      <div className={styles.plot} role="img" aria-label={ariaLabel} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={rows} margin={{ top: 8, right: overlay ? 4 : 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID_STROKE} />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: GRID_STROKE }} interval={labelInterval(rows.length)} />
            <YAxis yAxisId="left" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={axis} width={52} />
            {(overlay || reference) && <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={axis} width={52} />}
            <Tooltip content={<ChartTooltip format={valueFormat} />} cursor={{ fill: "var(--omts-color-surface-subtle)" }} />
            {series.map((item, column) => (
              <Bar key={item.name} yAxisId="left" dataKey={`s${column}`} name={item.name} fill={seriesColor(column, item.color)} stackId={stacked ? "stack" : undefined}
                hide={hidden.has(item.name)} radius={stacked ? 0 : [2, 2, 0, 0]} maxBarSize={44} isAnimationActive={false} />
            ))}
            {reference && <ReferenceLine yAxisId={refAxis} y={reference.value} stroke={REFERENCE_COLOR} strokeDasharray="5 4" strokeWidth={1.5} ifOverflow="extendDomain"
              label={{ value: reference.label, position: "insideTopRight", fontSize: 10, fill: REFERENCE_COLOR }} />}
            {overlay && !hidden.has(overlay.name) && <Line yAxisId="right" type="monotone" dataKey="line" name={overlay.name} stroke={overlay.color ?? OVERLAY_COLOR} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ChartDataTable caption={ariaLabel} points={points} series={series} extra={overlay} format={valueFormat} />
    </figure>
  );
}
