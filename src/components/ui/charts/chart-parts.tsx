"use client";
import { useCallback, useState } from "react";
import type { ChartPoint, ChartSeries } from "./chart-types";
import { seriesColor } from "./chart-theme";
import styles from "./charts.module.css";

/** Chuỗi bị ẩn do người dùng bấm chú giải; chỉ là trạng thái hiển thị, không đổi số liệu. */
export function useHiddenSeries() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback((name: string) => setHidden((current) => {
    const next = new Set(current);
    if (next.has(name)) next.delete(name); else next.add(name);
    return next;
  }), []);
  return { hidden, toggle };
}

export type LegendEntry = Readonly<{ name: string; color: string; kind: "box" | "line" | "dash"; toggleable: boolean }>;

/** Chú giải bấm để ẩn/hiện chuỗi (nút có aria-pressed); mục đường mốc chỉ để xem. */
export function ChartLegend({ entries, hidden, onToggle }: Readonly<{ entries: readonly LegendEntry[]; hidden: ReadonlySet<string>; onToggle(name: string): void }>) {
  return (
    <ul className={styles.legend} aria-label="Chú giải biểu đồ">
      {entries.map((entry) => {
        const off = hidden.has(entry.name);
        const swatch = <i className={`${styles.swatch} ${entry.kind === "box" ? "" : entry.kind === "line" ? styles.swatchLine : styles.swatchDash}`} style={{ background: entry.kind === "box" ? entry.color : undefined, borderColor: entry.color }} />;
        return (
          <li key={entry.name}>
            {entry.toggleable
              ? <button type="button" className={styles.legendButton} aria-pressed={!off} title={off ? "Bấm để hiện" : "Bấm để ẩn"} onClick={() => onToggle(entry.name)}>{swatch}<span className={off ? styles.legendOff : undefined}>{entry.name}</span></button>
              : <span className={styles.legendStatic}>{swatch}{entry.name}</span>}
          </li>
        );
      })}
    </ul>
  );
}

type TooltipPayload = Readonly<{ name?: string | number; value?: number | string | readonly (number | string)[]; color?: string }>;

/** Chú thích khi rê chuột/chạm: nhãn kỳ và giá trị từng chuỗi, định dạng tiếng Việt. */
export function ChartTooltip({ active, payload, label, format }: Readonly<{ active?: boolean; payload?: readonly TooltipPayload[]; label?: string | number; format(value: number): string }>) {
  if (!active || !payload?.length) return null;
  return (
    <div className={styles.tooltip} role="status">
      <strong>{label}</strong>
      <ul>{payload.filter((item) => typeof item.value === "number").map((item) => (
        <li key={String(item.name)}><i className={styles.swatch} style={{ background: item.color }} /><span>{item.name}</span><b>{format(item.value as number)}</b></li>
      ))}</ul>
    </div>
  );
}

/** Bảng số liệu ẩn thị giác thay cho hình vẽ với trình đọc màn hình. */
export function ChartDataTable({ caption, points, series, extra, format }: Readonly<{
  caption: string; points: readonly ChartPoint[]; series: readonly ChartSeries[]; extra?: Readonly<{ name: string; values: readonly number[] }>; format(value: number): string;
}>) {
  return (
    <table className={styles.srOnly}>
      <caption>{caption}</caption>
      <thead><tr><th scope="col">Kỳ</th>{series.map((item) => <th key={item.name} scope="col">{item.name}</th>)}{extra && <th scope="col">{extra.name}</th>}</tr></thead>
      <tbody>{points.map((point, row) => (
        <tr key={point.label}><th scope="row">{point.label}</th>{series.map((item, column) => <td key={item.name}>{format(point.values[column] ?? 0)}</td>)}{extra && <td>{format(extra.values[row] ?? 0)}</td>}</tr>
      ))}</tbody>
    </table>
  );
}

/** Khung chờ lần đầu và trạng thái rỗng dùng chung cho mọi biểu đồ. */
export function ChartPlaceholder({ loading, text, height }: Readonly<{ loading?: boolean; text: string; height: number }>) {
  return loading
    ? <div role="status" aria-label="Đang tải biểu đồ" className={`omts-skeleton ${styles.skeleton}`} style={{ height }} />
    : <p role="status" className={styles.empty} style={{ minHeight: height / 2 }}>{text}</p>;
}

export const legendFor = (series: readonly ChartSeries[]): LegendEntry[] => series.map((item, index) => ({ name: item.name, color: seriesColor(index, item.color), kind: "box", toggleable: true }));
