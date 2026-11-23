import { operationError } from "@/features/operations/ui";
import { businessToday } from "@/features/operations/ui";
import { personDayKey } from "./schedule-model";
import { scheduleService } from "./schedule-service";
import type { CopyItem } from "./copy-week-model";

export type CopyOutcome = { item: CopyItem; status: "created" | "skipped" | "failed"; message: string };
export type CopyProgress = { completed: number; total: number; outcomes: CopyOutcome[] };

/** Recheck occupancy, then write sequentially. Unknown outcomes are recorded and never replayed. */
export async function executeCopyWeek(items: CopyItem[], onProgress: (progress: CopyProgress) => void, canCreate: () => boolean) {
  const candidates = items.filter((item) => item.status === "create");
  const signal = AbortSignal.timeout(60_000);
  const dates = [...new Set(candidates.map((item) => item.draft.day))];
  const fresh = await Promise.all(dates.map(async (day) => ({ day, result: await scheduleService.day(day, signal) })));
  const occupied = new Set(fresh.flatMap(({ day, result }) => result.status === "success"
    ? result.data.filter((row) => row.date === day).map((row) => personDayKey(row.employeeId, row.date)) : []));
  const outcomes: CopyOutcome[] = [];
  let stopReason: string | undefined;
  for (const item of candidates) {
    const checked = fresh.find((entry) => entry.day === item.draft.day)!;
    const key = personDayKey(item.draft.employeeId, item.draft.day);
    if (stopReason || !canCreate()) outcomes.push({ item, status: "failed", message: stopReason || "Quyền tạo phân công không còn hiệu lực." });
    else if (checked.result.status !== "success") outcomes.push({ item, status: "failed", message: `Chưa đối chiếu được ngày này: ${operationError(checked.result)}` });
    else if (occupied.has(key) || item.draft.day < businessToday()) outcomes.push({ item, status: "skipped", message: "Đã có phân công hoặc ngày đã qua; giữ nguyên lịch hiện tại." });
    else {
      try {
        const result = await scheduleService.create(item.draft);
        if (result.status === "success") {
          occupied.add(key);
          outcomes.push({ item, status: "created", message: "Đã tạo phân công" });
        } else {
          outcomes.push({ item, status: "failed", message: operationError(result) });
          if (result.httpStatus === 401 || result.httpStatus === 403) stopReason = "Đã dừng: phiên đăng nhập hoặc quyền truy cập đã thay đổi.";
        }
      } catch {
        outcomes.push({ item, status: "failed", message: "Chưa rõ kết quả. Tải lại lịch để đối chiếu trước khi chép lại." });
      }
    }
    onProgress({ completed: outcomes.length, total: candidates.length, outcomes: [...outcomes] });
  }
  return outcomes;
}
