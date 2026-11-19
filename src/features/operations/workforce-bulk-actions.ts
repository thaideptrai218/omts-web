import * as c from "./new-module-contracts";
import { isCarryOver, workforceRepository as repository, type Assignment } from "./workforce-shared";
import { operationError } from "./ui";

/** One call per person, one after another: a long list stays slow, so a batch is limited. */
export const MAX_BULK = 30;
export type BulkAction = "check-in" | "check-out";
export type BulkResult = { id: string; name: string; ok: boolean; message: string };
type Allowed = (action: string, zoneId?: string) => boolean;

/** Why a row cannot take the action (shown in the results as skipped); undefined when it can. Mirrors the rules of the row buttons. */
export function bulkSkipReason(row: Assignment, action: BulkAction, today: string, allowed: Allowed): string | undefined {
  if (!allowed("AttendanceCreate", row.zoneId)) return "Bạn không có quyền chấm công ở vùng này.";
  if (action === "check-in") {
    if (row.date !== today) return "Chỉ ghi vào làm trong ngày hôm nay.";
    if (row.checkedInAt || row.checkedOutAt) return "Đã có lượt vào làm.";
    return row.jobTypeId ? undefined : "Chưa có loại công việc.";
  }
  if (row.checkedOutAt) return "Đã ra về.";
  if (!row.checkedInAt) return "Chưa có giờ vào làm.";
  return row.date === today || isCarryOver(row, today) ? undefined : "Không ghi được ra về cho ngày này.";
}

/** Sends the check-in or check-out of each row in turn; a failure of one person never stops or spoils the others. */
export async function runBulk(rows: readonly Assignment[], action: BulkAction, today: string, allowed: Allowed): Promise<BulkResult[]> {
  const results: BulkResult[] = [];
  for (const row of rows) {
    const skipped = bulkSkipReason(row, action, today, allowed);
    if (skipped) { results.push({ id: row.id, name: row.employeeName, ok: false, message: `Bỏ qua: ${skipped}` }); continue; }
    const result = await repository.write<unknown>(action, { qrCode: null }, c.assignmentSchema, row.id, row.zoneId);
    results.push(result.status === "success"
      ? { id: row.id, name: row.employeeName, ok: true, message: action === "check-in" ? "Đã ghi vào làm." : "Đã ghi ra về." }
      : { id: row.id, name: row.employeeName, ok: false, message: `${operationError(result)}${result.uncertain ? " Chưa rõ kết quả, hãy đối chiếu trước khi ghi lại." : ""}` });
  }
  return results;
}

export const verbOf = (action: BulkAction) => (action === "check-in" ? "vào làm" : "ra về");
