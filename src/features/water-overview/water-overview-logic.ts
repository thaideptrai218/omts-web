import { formatVietnameseDateTime } from "@/shared/format/date-time";
import type { ZoneOverviewItem } from "./contracts";

/** "Chưa đo gần đây" (PM 19/11/2026): vùng không có lần đo nào trong 1 tháng gần nhất (tính theo tháng lịch, không phải 24 giờ). */
export const RECENT_MEASUREMENT_TEXT = "1 tháng";

const MINUTE = 60_000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;

/** Vùng chưa có lần đo nào hoặc lần đo mới nhất cũ hơn cùng thời điểm này của tháng trước. */
export function isMeasurementStale(latest: string | null, now: number): boolean {
  if (!latest) return true;
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - 1);
  return Date.parse(latest) < limit.getTime();
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

/** Thời điểm đo tuyệt đối theo giờ Việt Nam, dạng dd/mm/yyyy HH:mm. */
export function absoluteTimeText(latest: string | null): string {
  return latest ? formatVietnameseDateTime(latest) : "—";
}

export interface OverviewSummary { total: number; alerting: number; stale: number }

export function summarize(items: readonly ZoneOverviewItem[], now: number): OverviewSummary {
  return {
    total: items.length,
    alerting: items.filter((item) => item.hasWaterAlert).length,
    stale: items.filter((item) => isMeasurementStale(item.latestMeasuredAt, now)).length,
  };
}

/** Nhãn tiếng Việt của trạng thái vùng. Backend trả tên trạng thái bằng tiếng Anh ("In Use", "Discontinued"), không đưa ra giao diện nguyên văn. */
export function zoneStatusLabel(item: { zoneStatus: string; zoneStatusCode: string }): string {
  const key = `${item.zoneStatus} ${item.zoneStatusCode}`;
  if (/discontinu|inactive|stopp|ngừng/i.test(key)) return "Ngừng sử dụng";
  if (/in.?use|active|đang/i.test(key)) return "Đang sử dụng";
  return "Chưa rõ trạng thái";
}

/** Vùng đang sử dụng, vùng đang cảnh báo đứng trước; trong mỗi nhóm theo mã vùng. Vùng ngừng sử dụng không hiện ở tổng quan. */
export function dashboardZones(items: readonly ZoneOverviewItem[]): ZoneOverviewItem[] {
  return items.filter(item => zoneStatusLabel(item) !== "Ngừng sử dụng")
    .sort((a, b) => Number(b.hasWaterAlert) - Number(a.hasWaterAlert) || a.zoneCode.localeCompare(b.zoneCode, "vi", { numeric: true }));
}

/** Một dòng tóm tắt: "1 vùng đang cảnh báo · 6 vùng chưa đo gần đây". */
export function summaryLine({ alerting, stale }: Pick<OverviewSummary, "alerting" | "stale">): string {
  const parts = [alerting ? `${alerting} vùng đang cảnh báo` : "", stale ? `${stale} vùng chưa đo gần đây` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Không có vùng nào cảnh báo hoặc chưa đo gần đây";
}
