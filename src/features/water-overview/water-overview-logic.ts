import type { ValueOutside, ZoneOverviewItem } from "./contracts";

/**
 * Ngưỡng "đo gần đây": vùng không có lần đo nào trong khoảng này được tính là "chưa đo gần đây".
 * Chỉ là hằng số hiển thị của Web, chưa có quy tắc nghiệp vụ chốt; đổi tại đây nếu SRS quy định khác.
 */
export const RECENT_MEASUREMENT_HOURS = 24;

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;

/** Vùng chưa có lần đo nào hoặc lần đo mới nhất đã quá ngưỡng RECENT_MEASUREMENT_HOURS. */
export function isMeasurementStale(latest: string | null, now: number): boolean {
  if (!latest) return true;
  return now - Date.parse(latest) > RECENT_MEASUREMENT_HOURS * HOUR;
}

/** Thời gian đã qua dạng tiếng Việt, vd "5 phút trước"; thời điểm tương lai nhẹ (lệch đồng hồ) coi như "vừa xong". */
export function relativeTimeText(latest: string | null, now: number): string {
  if (!latest) return "Chưa có lần đo";
  const diff = now - Date.parse(latest);
  if (!Number.isFinite(diff) || diff < MINUTE) return "Vừa xong";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ trước`;
  return `${Math.floor(diff / DAY)} ngày trước`;
}

/** Thời điểm đo tuyệt đối theo giờ Việt Nam. */
export function absoluteTimeText(latest: string | null): string {
  if (!latest) return "—";
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(latest));
}

export interface OverviewSummary { total: number; alerting: number; stale: number }

export function summarize(items: readonly ZoneOverviewItem[], now: number): OverviewSummary {
  return {
    total: items.length,
    alerting: items.filter((item) => item.hasWaterAlert).length,
    stale: items.filter((item) => isMeasurementStale(item.latestMeasuredAt, now)).length,
  };
}

const indicatorNames: Record<string, string> = { PH: "pH", SALINITY: "Độ mặn", TEMPERATURE: "Nhiệt độ" };
const num = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value);

/** Mô tả một giá trị vượt ngưỡng, vd "Độ mặn 12 ‰ quá thấp (cho phép 15–30 ‰)". */
export function describeValueOutside(v: ValueOutside): string {
  const unit = v.unit ? ` ${v.unit}` : "";
  const range = v.min !== null && v.max !== null ? `cho phép ${num(v.min)}–${num(v.max)}${unit}`
    : v.min !== null ? `cho phép tối thiểu ${num(v.min)}${unit}`
    : v.max !== null ? `cho phép tối đa ${num(v.max)}${unit}` : "chưa đặt khoảng cho phép";
  return `${indicatorNames[v.indicator] ?? v.indicator} ${num(v.value)}${unit} quá ${v.direction === "High" ? "cao" : "thấp"} (${range})`;
}

/** Nhãn tiếng Việt của trạng thái vùng. Backend trả tên trạng thái bằng tiếng Anh ("In Use", "Discontinued"), không đưa ra giao diện nguyên văn. */
export function zoneStatusLabel(item: { zoneStatus: string; zoneStatusCode: string }): string {
  const key = `${item.zoneStatus} ${item.zoneStatusCode}`;
  if (/discontinu|inactive|stopp|ngừng/i.test(key)) return "Ngừng sử dụng";
  if (/in.?use|active|đang/i.test(key)) return "Đang sử dụng";
  return "Chưa rõ trạng thái";
}
