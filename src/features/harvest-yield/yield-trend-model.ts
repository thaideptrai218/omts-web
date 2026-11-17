import type { YieldGroup } from "./contracts";

/** Gộp lô theo ngày thu hoạch để vẽ xu hướng; làm hoàn toàn ở trình duyệt từ các lô trong kỳ (không gọi lại API). */
export type TrendUnit = "day" | "week" | "month";
export type TrendMetric = "kg" | "cages";
export type TrendBucket = {
  key: string; label: string;
  kg: number; cages: number;
  /** Theo mã vùng, để vẽ cột chồng khi chọn "Theo vùng". */
  zoneKg: Record<string, number>; zoneCages: Record<string, number>;
};

const pad = (n: number) => String(n).padStart(2, "0");
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Thứ Hai của tuần chứa ngày `iso`. */
export function weekStart(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`), shift = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - shift);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export const bucketKey = (iso: string, unit: TrendUnit) => unit === "day" ? iso : unit === "week" ? weekStart(iso) : iso.slice(0, 7);
export const bucketLabel = (key: string, unit: TrendUnit) => unit === "day" ? dmy(key) : unit === "week" ? `Tuần ${dmy(key)}` : `${key.slice(5)}/${key.slice(0, 4)}`;

/** Chỉ tính lô trong kỳ; cột nào không có lô thì không xuất hiện (không điền số 0 giả). Số lồng thiếu coi là chưa ghi nhận. */
export function aggregateTrend(groups: readonly YieldGroup[], unit: TrendUnit): TrendBucket[] {
  const map = new Map<string, TrendBucket>();
  for (const lot of groups.flatMap((group) => group.lots)) {
    if (!lot.inPeriod) continue;
    const key = bucketKey(lot.harvestDate, unit);
    const bucket = map.get(key) ?? { key, label: bucketLabel(key, unit), kg: 0, cages: 0, zoneKg: {}, zoneCages: {} };
    const cages = lot.cageCount ?? 0;
    bucket.kg += lot.estimatedKg; bucket.cages += cages;
    bucket.zoneKg[lot.zoneCode] = (bucket.zoneKg[lot.zoneCode] ?? 0) + lot.estimatedKg;
    bucket.zoneCages[lot.zoneCode] = (bucket.zoneCages[lot.zoneCode] ?? 0) + cages;
    map.set(key, bucket);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export const valueOf = (bucket: TrendBucket, metric: TrendMetric) => metric === "kg" ? bucket.kg : bucket.cages;
export const zoneValues = (bucket: TrendBucket, metric: TrendMetric) => metric === "kg" ? bucket.zoneKg : bucket.zoneCages;

/** Cộng dồn theo thứ tự thời gian. */
export function cumulative(buckets: readonly TrendBucket[], metric: TrendMetric): number[] {
  let sum = 0;
  return buckets.map((bucket) => (sum += valueOf(bucket, metric)));
}

/** Giá trị trần "đẹp" cho trục: 1, 2, 2.5, 5 × 10^n. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exponent = 10 ** Math.floor(Math.log10(value)), fraction = value / exponent;
  return (fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10) * exponent;
}
