import { formatKg } from "./yield-logic";
import { cumulative, niceMax, valueOf, zoneValues, type TrendBucket, type TrendMetric } from "./yield-trend-model";

const W = 720, H = 240, L = 46, R = 50, T = 14, B = 30;
export const zonePalette = ["#0f766e", "#2563eb", "#b45309", "#7c3aed", "#be123c", "#4d7c0f", "#0369a1", "#a16207"];
const barColor = "#2f8f83";
const unitOf = (metric: TrendMetric) => metric === "kg" ? "kg" : "lồng";

type Props = { buckets: TrendBucket[]; metric: TrendMetric; byZone: boolean; zones: string[]; targetKg?: number | null };

/**
 * Biểu đồ SVG thuần: cột theo kỳ (trục trái), đường cộng dồn và mốc mục tiêu (trục phải, cùng đơn vị).
 * Số liệu đầy đủ nằm trong bảng thay thế "Xem dạng bảng" nên biểu đồ chỉ là hình ảnh (role="img").
 */
export function YieldTrendChart({ buckets, metric, byZone, zones, targetKg }: Props) {
  const total = cumulative(buckets, metric), target = metric === "kg" && targetKg ? targetKg : null;
  const left = niceMax(Math.max(...buckets.map((bucket) => valueOf(bucket, metric)), 0)), right = niceMax(Math.max(total.at(-1) ?? 0, target ?? 0));
  const iw = W - L - R, ih = H - T - B, band = iw / Math.max(buckets.length, 1), barW = Math.min(band * 0.68, 44);
  const yl = (value: number) => T + ih - (value / left) * ih, yr = (value: number) => T + ih - (value / right) * ih;
  const cx = (index: number) => L + band * index + band / 2;
  const every = Math.max(1, Math.ceil(buckets.length / 9));
  const unit = unitOf(metric);
  const points = total.map((value, index) => `${cx(index)},${yr(value)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" width="100%" style={{ maxHeight: 280 }}
      aria-label={`Biểu đồ ${metric === "kg" ? "kg ước tính" : "số lồng"} theo kỳ thu hoạch, ${buckets.length} kỳ, tổng ${formatKg(total.at(-1) ?? 0)} ${unit}`}>
      {[0, 0.5, 1].map((tick) => <g key={tick}>
        <line x1={L} x2={W - R} y1={yl(left * tick)} y2={yl(left * tick)} stroke="var(--omts-color-border)" strokeWidth={1} />
        <text x={L - 6} y={yl(left * tick) + 4} textAnchor="end" fontSize={10} fill="var(--omts-color-text-muted)">{formatKg(left * tick)}</text>
        <text x={W - R + 6} y={yr(right * tick) + 4} fontSize={10} fill="var(--omts-color-text-muted)">{formatKg(right * tick)}</text>
      </g>)}
      {buckets.map((bucket, index) => {
        const parts = byZone ? zones.map((zone, zoneIndex) => ({ zone, value: zoneValues(bucket, metric)[zone] ?? 0, color: zonePalette[zoneIndex % zonePalette.length] })) : [{ zone: "Tổng", value: valueOf(bucket, metric), color: barColor }];
        let base = 0;
        return <g key={bucket.key}>
          {parts.filter((part) => part.value > 0).map((part) => { const y0 = yl(base), y1 = yl(base += part.value);
            return <rect key={part.zone} x={cx(index) - barW / 2} y={y1} width={barW} height={Math.max(y0 - y1, 0)} fill={part.color} rx={2}><title>{`${bucket.label}${byZone ? ` · ${part.zone}` : ""}: ${formatKg(part.value)} ${unit}`}</title></rect>; })}
          {index % every === 0 && <text x={cx(index)} y={H - 10} textAnchor="middle" fontSize={10} fill="var(--omts-color-text-muted)">{bucket.label}</text>}
        </g>;
      })}
      {target != null && <g>
        <line x1={L} x2={W - R} y1={yr(target)} y2={yr(target)} stroke="#b45309" strokeWidth={1.5} strokeDasharray="5 4" />
        <text x={W - R - 2} y={yr(target) - 4} textAnchor="end" fontSize={10} fill="#b45309">Mục tiêu {formatKg(target)} kg</text>
      </g>}
      {buckets.length > 0 && <polyline points={points} fill="none" stroke="var(--omts-color-text)" strokeWidth={2} strokeLinejoin="round" />}
      {total.map((value, index) => <circle key={buckets[index].key} cx={cx(index)} cy={yr(value)} r={3} fill="var(--omts-color-text)"><title>{`Cộng dồn đến ${buckets[index].label}: ${formatKg(value)} ${unit}`}</title></circle>)}
    </svg>
  );
}
