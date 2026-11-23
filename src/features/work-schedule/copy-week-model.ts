import type { Assignment } from "@/features/operations/workforce-shared";
import { personDayKey, shiftDay, type SchedulePerson } from "./schedule-model";
import type { ScheduleDraft } from "./schedule-service";

export type CopyStatus = "create" | "duplicate" | "occupied" | "past" | "ineligible" | "missing-job";
export type CopyItem = { key: string; name: string; label: string; draft: ScheduleDraft; status: CopyStatus };
export const copyStatusLabel: Record<CopyStatus, string> = {
  create: "Sẽ tạo", duplicate: "Bỏ qua: đã có phân công trùng", occupied: "Bỏ qua: người này đã có việc trong ngày",
  past: "Bỏ qua: ngày đã qua", ineligible: "Bỏ qua: không còn làm việc trong vùng", "missing-job": "Bỏ qua: thiếu loại công việc",
};

/** The API keeps one assignment per person/day: never move an existing assignment during copy. */
export function previewCopyWeek(source: Assignment[], target: Assignment[], people: SchedulePerson[], zoneId: string, today: string): CopyItem[] {
  const eligible = new Set(people.filter((person) => person.eligible).map((person) => person.id));
  const seen = new Set<string>();
  return source.filter((row) => row.zoneId === zoneId).sort((a, b) => a.date.localeCompare(b.date) || a.employeeName.localeCompare(b.employeeName, "vi")).map((row) => {
    const day = shiftDay(row.date, 7), key = personDayKey(row.employeeId, day);
    const existing = target.filter((entry) => personDayKey(entry.employeeId, entry.date) === key);
    const duplicate = seen.has(key) || existing.some((entry) => entry.zoneId === zoneId && entry.raftId === row.raftId && entry.jobTypeId === row.jobTypeId);
    const status: CopyStatus = day < today ? "past" : !eligible.has(row.employeeId) ? "ineligible" : !row.jobTypeId ? "missing-job"
      : duplicate ? "duplicate" : existing.length ? "occupied" : "create";
    seen.add(key);
    return { key: `${row.id}:${day}`, name: row.employeeName, label: `${row.raftCode || "Cấp vùng"} · ${row.job}`,
      draft: { employeeId: row.employeeId, zoneId, raftId: row.raftId || "", jobTypeId: row.jobTypeId || "", day }, status };
  });
}
