import { z } from "zod";

/**
 * Hợp đồng dữ liệu Thiết lập kỳ lương (LABOR-16) khớp backend: GET api/payroll-settings,
 * GET api/payroll-settings/preview, PUT api/payroll-settings. Chỉ Chủ hợp tác xã được dùng.
 */
export const START_DAY_FIRST = 1;
export const START_DAY_LAST = 28;

const startDay = z.number().int().min(START_DAY_FIRST).max(START_DAY_LAST);
/** Một kỳ lương: ngày bắt đầu và kết thúc (DateOnly -> yyyy-MM-dd); "name" là tên kỳ do backend đặt (MM/yyyy). */
export const payPeriod = z.object({ start: z.iso.date(), end: z.iso.date(), name: z.string().optional() });
export const payrollSettings = z.object({
  payPeriodStartDay: startDay, automaticPayroll: z.boolean(), nextPeriods: z.array(payPeriod).min(2), rowVersion: z.string().min(1),
});
export const payrollSettingsSaved = z.object({ settings: payrollSettings, message: z.string(), messageCode: z.string() });
export const payrollPreview = z.object({
  payPeriodStartDay: startDay, automaticPayroll: z.boolean(), nextPeriods: z.array(payPeriod).min(2), message: z.string(), messageCode: z.string(),
});
/** Nội dung lưu: bắt buộc rowVersion của lần đọc để backend phát hiện bản đã bị người khác đổi. */
export const savePayrollSettings = z.strictObject({ payPeriodStartDay: startDay, automaticPayroll: z.boolean(), rowVersion: z.string().min(1) });
/** Tham số xem trước: ngày bắt đầu (1-28) và cờ tự động, đều dạng chuỗi trên URL. */
export const previewQuery = z.strictObject({
  action: z.literal("preview"), startDay: z.string().regex(/^(?:[1-9]|1\d|2[0-8])$/), automaticPayroll: z.enum(["true", "false"]),
});

export type PayPeriod = z.infer<typeof payPeriod>;
export type PayrollSettings = z.infer<typeof payrollSettings>;
export type PayrollPreview = z.infer<typeof payrollPreview>;
