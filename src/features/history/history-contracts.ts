import { z } from "zod";

/**
 * One line of the change history of a record (harvest lot, seeding session, material usage, care log, cycle):
 * who, when, what, why, and for an edit the changed fields with their labels (the backend writes the label with its unit).
 * Everything but `at` and `action` is optional so a smaller answer from an older backend still shows.
 */
const scalar = z.union([z.string(), z.number(), z.boolean()]).nullable();
export const historyChange = z.object({ field: z.string().max(100), label: z.string().max(200).nullish(), from: scalar.optional(), to: scalar.optional() });
export const historyEntry = z.object({
  at: z.string(), action: z.string().max(100), byName: z.string().nullish(), byRole: z.string().nullish(),
  reason: z.string().nullish(), note: z.string().nullish(), changes: z.array(historyChange).default([]),
});
export const historyList = z.array(historyEntry);
export type HistoryEntry = z.infer<typeof historyEntry>;
export type HistoryChange = z.infer<typeof historyChange>;

const actions: Record<string, string> = {
  damaged: "Báo hỏng", repaired: "Sửa làn", outOfService: "Ngừng hoạt động",
  created: "Tạo mới", create: "Tạo mới", recorded: "Ghi nhận", corrected: "Điều chỉnh", correct: "Điều chỉnh", updated: "Cập nhật", edited: "Chỉnh sửa",
  removed: "Xóa", remove: "Xóa", cancelled: "Hủy", closed: "Kết thúc", laneFinished: "Hoàn tất thu hoạch làn", completed: "Hoàn tất",
};
/** Vietnamese name of an action code ("HarvestLot.Corrected" -> "Điều chỉnh"); an unknown code is shown as it is. */
export function historyActionLabel(action: string): string {
  const last = action.split(".").at(-1) ?? action;
  return actions[last.charAt(0).toLowerCase() + last.slice(1)] ?? action;
}

/** "4" for a number (vi-VN), "Có/Không" for a boolean, "—" for nothing. */
export function historyValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString("vi-VN", { maximumFractionDigits: 3 });
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return value;
}

/** "Số lồng: 4 → 5". */
export const historyChangeText = (change: HistoryChange) => `${change.label || change.field}: ${historyValue(change.from)} → ${historyValue(change.to)}`;
