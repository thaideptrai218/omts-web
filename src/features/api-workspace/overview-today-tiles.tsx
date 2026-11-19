"use client";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { count, vnd } from "@/features/sales-reports/report-format";
import type { Dashboard } from "./overview-contracts";
import styles from "./owner-overview.module.css";

type Change = Readonly<{ text: string; tone: "up" | "down" | "flat" }>;

/** So với hôm qua: mũi tên và phần trăm. `worseWhenUp` đảo màu cho chỉ số mà tăng là xấu (hàng trả). */
export function compareWithYesterday(today: number, yesterday: number, worseWhenUp = false): Change {
  if (today === yesterday) return { text: "— bằng hôm qua", tone: "flat" };
  if (yesterday === 0) return { text: "▲ mới phát sinh", tone: worseWhenUp ? "down" : "up" };
  const percent = Math.round(Math.abs(today - yesterday) / Math.abs(yesterday) * 100);
  const rising = today > yesterday;
  return { text: `${rising ? "▲" : "▼"} ${percent}% so với hôm qua`, tone: rising === worseWhenUp ? "down" : "up" };
}

type Props = Readonly<{ data?: Dashboard; loading: boolean; error?: string; onRetry(): void }>;

/** Kết quả bán hàng hôm nay (số hóa đơn, doanh thu, trả hàng, doanh thu thuần) kèm so sánh với hôm qua. */
export function OverviewTodayTiles({ data, loading, error, onRetry }: Props) {
  if (error) return <ListStateMessage error={error} onRetry={onRetry} />;
  if (!data) return loading ? <div className={styles.skeleton} role="status" aria-label="Đang tải kết quả hôm nay" /> : null;
  const { today, yesterday } = data;
  const tiles = [
    { label: "Số hóa đơn", value: count(today.invoiceCount), change: compareWithYesterday(today.invoiceCount, yesterday.invoiceCount) },
    { label: "Doanh thu", value: vnd(today.revenue), change: compareWithYesterday(today.revenue, yesterday.revenue) },
    { label: "Trả hàng", value: vnd(today.returnValue), hint: `${count(today.returnCount)} phiếu trả`, change: compareWithYesterday(today.returnValue, yesterday.returnValue, true) },
    { label: "Doanh thu thuần", value: vnd(today.netRevenue), change: compareWithYesterday(today.netRevenue, yesterday.netRevenue) },
  ];
  return (
    <dl className={styles.tiles} aria-label="Kết quả bán hàng hôm nay">
      {tiles.map((tile) => (
        <div key={tile.label} className={styles.tile}>
          <dt>{tile.label}</dt>
          <dd>{tile.value}{tile.hint && <small>{tile.hint}</small>}</dd>
          <span className={`${styles.change} ${styles[tile.change.tone]}`}>{tile.change.text}</span>
        </div>
      ))}
    </dl>
  );
}
