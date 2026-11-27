import { z } from "zod";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { formatVietnameseDateTime } from "@/shared/format/date-time";

/**
 * One line of the change history of a record (harvest lot, seeding session, material usage, care log, cycle, nursery batch):
 * who, when, what, why, and for an edit the changed fields with their Vietnamese labels, values and unit (the backend writes them).
 * Everything but `at` and `action` is optional so a smaller answer from an older backend still shows.
 */
const scalar = z.union([z.string(), z.number(), z.boolean()]).nullable();
export const historyChange = z.object({ field: z.string().max(100), label: z.string().max(200).nullish(), from: scalar.optional(), to: scalar.optional(), unit: z.string().max(50).nullish() });
export const historyEntry = z.object({
  at: z.string(), action: z.string().max(100), actionLabel: z.string().max(200).nullish(), byName: z.string().nullish(), byRole: z.string().nullish(),
  reason: z.string().nullish(), note: z.string().nullish(), changes: z.array(historyChange).default([]),
});
// The backend answers `{ recordType, recordId, recordCode, entries: [...] }`; a bare array is still accepted.
export const historyList = z.union([z.array(historyEntry), z.object({ entries: z.array(historyEntry) }).transform(value => value.entries)]);
export type HistoryEntry = z.infer<typeof historyEntry>;
export type HistoryChange = z.infer<typeof historyChange>;

/** What is said of an action nobody named: never the English code. */
export const unknownHistoryAction = "Thay đổi";
/** What is said of a field nobody named. */
export const unknownHistoryField = "Thông tin khác";

const actions: Record<string, string> = {
  damaged: "Báo hỏng", repaired: "Sửa làn", outOfService: "Ngừng hoạt động", restored: "Khôi phục hoạt động",
  created: "Tạo mới", create: "Tạo mới", recorded: "Ghi nhận", corrected: "Điều chỉnh", correct: "Điều chỉnh", updated: "Cập nhật", edited: "Chỉnh sửa", traceCorrected: "Hiệu chỉnh truy xuất",
  removed: "Xóa", remove: "Xóa", deleted: "Xóa", cancelled: "Hủy", voided: "Hủy bỏ", closed: "Kết thúc", weighed: "Cân thực tế", reweighed: "Cân lại", weighingAgreed: "Thương nhân xác nhận cân",
  reopened: "Mở lại", laneFinished: "Hoàn tất thu hoạch làn", lanesFinished: "Hoàn tất thu hoạch nhiều làn", completed: "Hoàn tất", started: "Bắt đầu vụ", seedingCompleted: "Hoàn tất thả giống",
  published: "Công khai truy xuất", republished: "Công khai lại truy xuất", withdrawn: "Rút công khai truy xuất", survivorsCorrected: "Sửa số sống sót", allocationsChanged: "Cập nhật đợt ươm",
};
/** A label of an older backend that is a bare code ("Published", "OPEN"): ASCII only and no space. */
const looksEnglish = (text: string) => /^[A-Za-z0-9_.-]+$/.test(text.trim());
/**
 * Vietnamese name of an action. The backend's `actionLabel` comes first; without one the code is looked up ("HarvestLot.Corrected" -> "Điều chỉnh"), and a code nobody
 * named is "Thay đổi", never English.
 */
export function historyActionLabel(action: string, actionLabel?: string | null): string {
  if (actionLabel?.trim() && !looksEnglish(actionLabel)) return actionLabel.trim();
  const last = action.split(".").at(-1) ?? action;
  return actions[last.charAt(0).toLowerCase() + last.slice(1)] ?? unknownHistoryAction;
}

/** Coded values a backend of before the Vietnamese values may still send; the current backend sends them in Vietnamese already. */
const codes: Record<string, string> = {
  OPEN: "Đang mở", CLOSED: "Đã kết thúc", AWAITING_WEIGHING: "Chờ cân", REOPENED: "Đã mở lại",
  NotPublished: "Chưa công khai", Published: "Đã công khai", Withdrawn: "Đã rút công khai",
  SoldWholeLot: "Bán hết lô", Unsold: "Không bán hết", Spoiled: "Hư hỏng", TimeLimitReached: "Quá thời hạn bán",
  FEEDING: "Cho ăn", CLEANING: "Vệ sinh bè/lồng", INSPECTION: "Kiểm tra", DISEASE: "Phòng/trị bệnh", REPAIR: "Sửa chữa", OTHER: "Khác",
};
const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const numeric = /^-?[\d.,]+$/;

/** True for a value with nothing to read: empty, or an id (a reader never sees a GUID). */
export const isBlankHistoryValue = (value: string | number | boolean | null | undefined) =>
  value === null || value === undefined || (typeof value === "string" && (value.trim() === "" || guid.test(value.trim())));

/** "4" for a number (vi-VN), "Có/Không" for a boolean, dates as dd/mm/yyyy[ HH:mm], a known code in Vietnamese, "—" for nothing or an id. */
export function historyValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || isBlankHistoryValue(value)) return "—";
  if (typeof value === "number") return value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
  if (typeof value === "boolean") return value ? "Có" : "Không";
  const text = value.trim();
  if (codes[text]) return codes[text];
  if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
    const shown = formatVietnameseDateTime(text);
    return shown === "—" ? text : shown;
  }
  return formatVietnameseDate(text);
}

/** The value with its unit when it is a number ("12 lồng"); a text keeps what the backend wrote. */
export function historyValueWithUnit(value: string | number | boolean | null | undefined, unit?: string | null): string {
  const text = historyValue(value);
  return unit && text !== "—" && (typeof value === "number" || numeric.test(text)) ? `${text} ${unit}` : text;
}

/** How the lines of an entry read: "set" is "Label: value" (a creation: every `from` is empty), "arrow" is "Label: from → to". */
export type HistoryChangeStyle = "arrow" | "set";
export const historyChangeStyle = (changes: readonly HistoryChange[]): HistoryChangeStyle =>
  changes.length > 0 && changes.every(change => isBlankHistoryValue(change.from)) ? "set" : "arrow";

/** The changes worth listing: a field that is empty (or an id) before and after says nothing. */
export const visibleHistoryChanges = (changes: readonly HistoryChange[]) => changes.filter(change => !(isBlankHistoryValue(change.from) && isBlankHistoryValue(change.to)));

/** "Số lồng: 4 → 5", "Số lồng: 5" for a creation. */
export function historyChangeText(change: HistoryChange, style: HistoryChangeStyle = "arrow"): string {
  const label = change.label?.trim() || unknownHistoryField;
  if (style === "set") return `${label}: ${historyValueWithUnit(change.to, change.unit)}`;
  return `${label}: ${historyValueWithUnit(change.from, change.unit)} → ${historyValueWithUnit(change.to, change.unit)}`;
}
