import type { z } from "zod";
import { historyValue } from "@/features/history/history-contracts";
import type { nurseryHistorySchema } from "./contracts";
import { nurseryDisplayText } from "./nursery-display-text";

export type NurseryHistoryEntry = z.infer<typeof nurseryHistorySchema>["entries"][number];
type Change = NurseryHistoryEntry["changes"][number];
const actions: Record<string, string> = {
  created: "Bắt đầu ươm", edited: "Sửa đợt ươm", cancelled: "Xóa đợt ươm", completed: "Hoàn tất ươm",
  survivorscorrected: "Sửa số sống sót", allocationschanged: "Chuyển lại số mảnh giữa các bè",
};
const fields: Record<string, string> = {
  quantity: "Số mảnh vào ươm", quantityin: "Số mảnh vào ươm", startdate: "Ngày bắt đầu ươm",
  seedlot: "Lô giống", seedlotid: "Lô giống", note: "Ghi chú", survivors: "Sống sót (ước tính)",
  completedon: "Ngày hoàn tất ươm", allocations: "Số mảnh chuyển sang bè", status: "Trạng thái",
  loss: "Hao hụt (ước tính)", losspieces: "Hao hụt (ước tính)", losspercent: "Tỷ lệ hao hụt (ước tính)",
  targetyieldkg: "Sản lượng dự kiến", startphotos: "Ảnh bắt đầu ươm", completionphotos: "Ảnh hoàn tất ươm",
};
const fieldKey = (field: string) => field.replace(/[\s_-]/g, "").toLowerCase();
export function nurseryHistoryAction(entry: NurseryHistoryEntry): string {
  const code = entry.action.split(".").at(-1)?.toLowerCase() ?? "";
  return actions[code] ?? nurseryDisplayText(entry.actionLabel) ?? "Cập nhật đợt ươm";
}
export function nurseryHistoryChangeLabel(change: Change): string {
  const label = fields[fieldKey(change.field)] ?? nurseryDisplayText(change.label) ?? "Thông tin đợt ươm";
  return `${label}${change.unit && !label.includes(`(${change.unit})`) ? ` (${change.unit})` : ""}`;
}
export function nurseryHistoryValue(change: Change, value: Change["from"]): string {
  if (fieldKey(change.field) === "status" && typeof value === "string") {
    const statuses: Record<string, string> = { Nursing: "Đang ươm", Completed: "Đã hoàn tất", Cancelled: "Đã hủy" };
    return statuses[value] ?? nurseryDisplayText(historyValue(value)) ?? "—";
  }
  return nurseryDisplayText(historyValue(value)) ?? "—";
}
export function nurseryHistorySummary(entry: NurseryHistoryEntry): string {
  const action = nurseryHistoryAction(entry);
  const survivors = entry.changes.find(change => fieldKey(change.field) === "survivors");
  return entry.action.split(".").at(-1)?.toLowerCase() === "survivorscorrected" && survivors
    ? `${action} ${historyValue(survivors.from)} → ${historyValue(survivors.to)}` : action;
}
