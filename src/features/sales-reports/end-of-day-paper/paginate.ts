import type { EndOfDayOrientation } from "../end-of-day-contracts";

/** Một phần tử của dòng chảy trong trang: chiều cao đã đo (px). `table` có mặt = dòng của bảng đó (đầu bảng lặp lại ở mỗi trang). */
export type FlowItem = Readonly<{ key: string; height: number; table?: string; /** Không để phần tử này nằm cuối trang một mình: kéo theo phần tử kế tiếp. */ keepWithNext?: boolean }>;
export type PagePlan = Readonly<{ keys: readonly string[] }>;

const MM = 96 / 25.4;
/** Lề giấy (mm). Chân trang "Trang n/N" nằm trong lề dưới. */
export const MARGIN_MM = { top: 12, bottom: 14, side: 12 } as const;
/** Chừa một khoảng nhỏ để lệch đo giữa màn hình và máy in không đẩy dòng cuối sang trang thừa. */
const SLACK_PX = 6;

/** Kích thước trang A4 theo hướng giấy, tính bằng mm và px (CSS px = 96/inch). */
export function pageGeometry(orientation: EndOfDayOrientation) {
  const widthMm = orientation === "landscape" ? 297 : 210, heightMm = orientation === "landscape" ? 210 : 297;
  return {
    widthMm, heightMm, width: widthMm * MM, height: heightMm * MM,
    contentWidth: (widthMm - MARGIN_MM.side * 2) * MM,
    contentHeight: (heightMm - MARGIN_MM.top - MARGIN_MM.bottom) * MM - SLACK_PX,
  };
}

/**
 * Cắt dòng chảy thành các trang. `available` là chiều cao nội dung của một trang; `headers` là chiều cao dòng tiêu đề của từng bảng:
 * dòng đầu của mỗi đoạn bảng trên một trang được cộng thêm chiều cao tiêu đề (tiêu đề lặp lại trên mọi trang). Phần tử cao hơn cả trang
 * vẫn được đặt trên trang riêng (không bao giờ lặp vô hạn). Luôn trả ít nhất một trang.
 */
export function paginate(items: readonly FlowItem[], available: number, headers: Readonly<Record<string, number>>): PagePlan[] {
  const pages: string[][] = [[]];
  let used = 0, previous: FlowItem | undefined;
  const cost = (item: FlowItem, after: FlowItem | undefined) => item.height + (item.table && after?.table !== item.table ? headers[item.table] ?? 0 : 0);
  items.forEach((item, index) => {
    const next = items[index + 1];
    const need = (after: FlowItem | undefined) => cost(item, after) + (item.keepWithNext && next ? cost(next, item) : 0);
    if (previous && used + need(previous) > available) { pages.push([]); used = 0; previous = undefined; }
    pages[pages.length - 1].push(item.key);
    used += cost(item, previous);
    previous = item;
  });
  return pages.map((keys) => ({ keys }));
}

/** Số trang hợp lệ gần nhất với `value` (1..count). */
export const clampPage = (value: number, count: number): number => Math.min(Math.max(1, Math.trunc(Number.isFinite(value) ? value : 1)), Math.max(1, count));
