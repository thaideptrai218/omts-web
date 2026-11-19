import "server-only";
import { z } from "zod";
import { dashboardSchema } from "@/features/api-workspace/overview-contracts";
import type { OperationPlan } from "./operation-plan";

const query = z.strictObject({ action: z.literal("dashboard"), zoneId: z.guid().optional() });

/**
 * Kế hoạch đọc số liệu Tổng quan: GET /api/dashboard (hôm nay, hôm qua, công nợ, cảnh báo). Chỉ đọc, thuộc quyền xem báo cáo
 * bán hàng (SALES_REPORTS View) nên Kế toán dùng được; backend quyết định phạm vi vùng. Chỉ nhận `zoneId` tùy chọn.
 */
export function dashboardPlan(method: string, params: URLSearchParams): OperationPlan | undefined {
  if (method !== "GET" || [...params.keys()].length !== new Set(params.keys()).size) return;
  const parsed = query.safeParse(Object.fromEntries(params));
  if (!parsed.success) return;
  const { zoneId } = parsed.data;
  return { area: "sales-report", action: "dashboard", method: "GET", permission: "View", zoneId, path: `/api/dashboard${zoneId ? `?zoneId=${zoneId}` : ""}`, schema: dashboardSchema };
}
