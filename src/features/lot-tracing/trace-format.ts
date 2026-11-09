import type { OriginGap, OriginState } from "./contracts";

/** Hàm thuần của màn truy xuất: nhãn tiếng Việt, đọc số nhập tay, định dạng giá trị so sánh. Không dùng chuỗi thông điệp tiếng Anh của backend. */

export const originLabel = (state: OriginState) => ({ NotPublished: "Chưa công bố", Published: "Đã công bố", Withdrawn: "Đã thu hồi" }[state]);
export const originTone = (state: OriginState) => state === "Published" ? "success" as const : state === "Withdrawn" ? "danger" as const : "neutral" as const;
export const cycleStatusLabel = (status: string) => status.toLowerCase() === "closed" ? "Đã đóng" : status.toLowerCase() === "open" ? "Đang mở" : "Không xác định";
/** Trạng thái lô theo mã ổn định của backend (2901 Mở, 2902 Mở lại, 2903 Đóng), không dựa vào chuỗi tiếng Anh. */
export const lotStatusLabel = (statusId: number) => ({ 2901: "Đang mở", 2902: "Mở lại", 2903: "Đã đóng" }[statusId] ?? "Không xác định");

/** "2026-10-26" thành "26/10/2026" bằng cắt chuỗi, không qua múi giờ. */
export function formatDay(value: string | null | undefined) {
  const match = value && /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "—";
}
export const formatDateTime = (value: string) => new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" }).format(new Date(value));
export const formatNumber = (value: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(value);
export const lanesText = (lanes: readonly number[]) => lanes.length ? lanes.join(", ") : "—";

export function describeGap(gap: OriginGap) {
  if (gap.kind === "NoSeedingSession") return `Luống ${gap.laneNumber} chưa có phiên thả giống trong chu kỳ của lô.`;
  if (gap.kind === "SeedLotNotOnCompletedReceipt") return `Lô giống ${gap.seedLotCodes.join(", ")} của luống ${gap.laneNumber} chưa thuộc phiếu nhập đã hoàn thành.`;
  return `Chỉ Quản lý vùng ${gap.zoneCode ?? ""} hoặc Chủ hợp tác xã mới công bố được lô này.`;
}
export const blockLabel = (block: string | null) => ({
  NoRight: "Bạn không có quyền công bố lô này.", AlreadyPublished: "Lô đã được công bố, không công bố lại.",
  NotOnSalesInvoice: "Lô chỉ được công bố sau khi có trên hóa đơn bán chưa hủy.", OwnerOnly: "Lô đã thu hồi chỉ Chủ hợp tác xã được công bố lại.",
}[block ?? ""] ?? "");

/** "1, 2; 3" thành [1, 2, 3]; undefined nếu có phần không phải số nguyên dương. Bỏ trống cho ra mảng rỗng. */
export function parseNumberList(text: string): number[] | undefined {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  const numbers = parts.map((part) => /^\d{1,3}$/.test(part) ? Number(part) : NaN);
  return numbers.some((n) => !Number.isInteger(n) || n < 1) ? undefined : numbers;
}
/** Số thập phân nhập kiểu Việt Nam hoặc quốc tế: "1.200,5", "1200.5"; NaN khi không đọc được; chuỗi trống là NaN. */
export function parseDecimal(text: string) {
  const value = text.trim().replace(/\s/g, "");
  if (!value) return NaN;
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : /^\d{1,3}(\.\d{3})+$/.test(value) ? value.replace(/\./g, "") : value;
  return /^\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : NaN;
}

const fieldLabels: Record<string, string> = {
  seedingDate: "Ngày thả giống", seedLot: "Lô giống", lanes: "Luống", quantity: "Số lượng", visitDate: "Ngày ghi nhật ký", notes: "Ghi chú", photos: "Ảnh",
  finishedLanes: "Luống đã thu xong", cageCount: "Số lồng", kgPerCage: "kg mỗi lồng", estimatedKg: "kg ước tính",
};
export const fieldLabel = (name: string) => fieldLabels[name] ?? name;
export function formatValue(name: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return name === "photos" ? `${value.length} ảnh` : value.length ? value.join(", ") : "—";
  if (typeof value === "number") return formatNumber(value);
  if (typeof value === "string") return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatDay(value) : /^\d{4}-\d{2}-\d{2}T/.test(value) ? formatDateTime(value) : value;
  return typeof value === "boolean" ? value ? "Có" : "Không" : "—";
}
