"use client";
import { useMemo } from "react";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { formatKg } from "./yield-logic";
import { cumulative, valueOf, zoneValues, type TrendBucket, type TrendMetric } from "./yield-trend-model";

type Props = { buckets: TrendBucket[]; metric: TrendMetric; byZone: boolean; zones: string[]; targetKg?: number | null };

/**
 * Cột theo kỳ (tổng hoặc chồng theo vùng), đường cộng dồn và mốc mục tiêu (trục phải, cùng đơn vị) trên bộ biểu đồ chung.
 * Số liệu đầy đủ cũng nằm trong bảng "Xem dạng bảng" và bảng thay thế cho trình đọc màn hình.
 */
export function YieldTrendChart({ buckets, metric, byZone, zones, targetKg }: Props) {
  const unit = metric === "kg" ? "kg" : "lồng";
  const total = useMemo(() => cumulative(buckets, metric), [buckets, metric]);
  const series = useMemo(() => byZone ? zones.map((zone) => ({ name: zone })) : [{ name: `Cột: ${unit} theo kỳ` }], [byZone, zones, unit]);
  const points = useMemo(() => buckets.map((bucket) => ({ label: bucket.label, values: byZone ? zones.map((zone) => zoneValues(bucket, metric)[zone] ?? 0) : [valueOf(bucket, metric)] })), [buckets, byZone, zones, metric]);
  const target = metric === "kg" && targetKg ? targetKg : null;
  return (
    <BarChart points={points} series={series} stacked={byZone} valueFormat={formatKg} height={240}
      overlay={{ name: `Đường: cộng dồn (${formatKg(total.at(-1) ?? 0)} ${unit})`, values: total }}
      reference={target ? { value: target, label: `Mục tiêu ${formatKg(target)} kg` } : undefined}
      ariaLabel={`Biểu đồ ${metric === "kg" ? "kg ước tính" : "số lồng"} theo kỳ thu hoạch, ${buckets.length} kỳ, tổng ${formatKg(total.at(-1) ?? 0)} ${unit}`} />
  );
}
