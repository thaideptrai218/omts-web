import type { z } from "zod";
import { staffingPlanSchema, type PurchaseRequest } from "./new-module-contracts";
import type { ReviewResult } from "./purchase-request-review-presentation";

/** Logic thuần của "Kế hoạch nhân sự" trong chi tiết yêu cầu mua: dựng nội dung gửi POST /api/purchase-requests/{id}/staffing. */
export type StaffingPlanBody = z.infer<typeof staffingPlanSchema>;
export type StaffingFormInput = { cages: string; pickupDate: string; selectedIds: readonly string[]; chosenIds: readonly string[] };

const wholeNumber = (text: string) => /^\d{1,6}$/.test(text.trim()) ? Number(text.trim()) : undefined;

/**
 * Lần gửi đầu: số lồng (không vượt số lồng yêu cầu), ngày lấy hàng (không trước hôm nay, cũng là ngày làm việc) và ít nhất một nhân viên; năng suất mỗi người mỗi ngày được tính từ số lồng chia số người.
 * Gửi lại: backend giữ nguyên số lồng, ngày và năng suất của kế hoạch đã gửi, chỉ cho chọn thêm người, nên các giá trị đó lấy từ kế hoạch và người đã chọn được gửi kèm.
 */
export function buildStaffingPayload(form: StaffingFormInput, request: Pick<PurchaseRequest, "requestedCages" | "rowVersion" | "staffing">, today: string): ReviewResult<StaffingPlanBody> {
  const sent = request.staffing, chosen = new Set(form.chosenIds);
  const added = form.selectedIds.filter((id) => !chosen.has(id));
  let body: unknown;
  if (sent) {
    if (!added.length) return { ok: false, error: "Chọn thêm ít nhất một nhân viên để lưu." };
    const employeeIds = [...form.chosenIds, ...added];
    body = { cages: sent.cages, workDate: sent.workDate, pickupDate: sent.pickupDate, cagesPerEmployeePerDay: sent.cagesPerEmployeePerDay ?? Math.max(1, Math.ceil(sent.cages / employeeIds.length)), employeeIds, note: sent.note ?? null, rowVersion: request.rowVersion };
  } else {
    const cages = wholeNumber(form.cages);
    if (!cages) return { ok: false, error: "Nhập số lồng cần lấy là số nguyên lớn hơn 0." };
    if (cages > request.requestedCages) return { ok: false, error: `Số lồng cần lấy (${cages}) không được vượt quá ${request.requestedCages} lồng thương lái đã yêu cầu.` };
    if (!form.pickupDate || form.pickupDate < today) return { ok: false, error: "Ngày lấy hàng không được trước hôm nay." };
    if (!added.length) return { ok: false, error: "Chọn ít nhất một nhân viên." };
    body = { cages, workDate: form.pickupDate, pickupDate: form.pickupDate, cagesPerEmployeePerDay: Math.max(1, Math.ceil(cages / added.length)), employeeIds: added, note: null, rowVersion: request.rowVersion };
  }
  const parsed = staffingPlanSchema.safeParse(body);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: "Kế hoạch nhân sự chưa hợp lệ. Hãy kiểm tra số lồng, ngày lấy hàng và nhân viên đã chọn." };
}
