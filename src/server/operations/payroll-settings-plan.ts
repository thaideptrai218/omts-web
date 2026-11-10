import "server-only";
import { z } from "zod";
import * as c from "@/features/payroll-settings/contracts";
import type { OperationPlan } from "./operation-plan";

const area = "payroll-settings" as const;
const settingsQuery = z.strictObject({ action: z.literal("settings") });
const writeInput = z.strictObject({ action: z.literal("save"), id: z.undefined().optional(), zoneId: z.undefined().optional(), body: z.unknown() });

/**
 * Kế hoạch gọi backend cho Thiết lập kỳ lương (LABOR-16): đọc thiết lập, xem trước hai kỳ kế tiếp (không lưu), lưu bằng PUT.
 * Backend chỉ cho Chủ hợp tác xã; không có phạm vi vùng.
 */
export function payrollSettingsPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  if (method === "GET") {
    if (settingsQuery.safeParse(Object.fromEntries(query)).success) return { area, action: "settings", method: "GET", permission: "View", path: "/api/payroll-settings", schema: c.payrollSettings };
    const preview = c.previewQuery.safeParse(Object.fromEntries(query));
    if (!preview.success) return;
    const { startDay, automaticPayroll } = preview.data;
    return { area, action: "preview", method: "GET", permission: "View", path: `/api/payroll-settings/preview?startDay=${startDay}&automaticPayroll=${automaticPayroll}`, schema: c.payrollPreview };
  }
  if (method !== "POST" || query.size) return;
  const parsed = writeInput.safeParse(input);
  if (!parsed.success) return;
  const values = c.savePayrollSettings.safeParse(parsed.data.body);
  return values.success ? { area, action: "save", method: "PUT", permission: "Edit", path: "/api/payroll-settings", schema: c.payrollSettingsSaved, body: values.data } : undefined;
}
