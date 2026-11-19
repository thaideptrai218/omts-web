import "server-only";
import { z } from "zod";
import { endOfDayMethods, endOfDayReport } from "@/features/sales-reports/end-of-day-contracts";
import type { OperationPlan } from "./operation-plan";

const MAX_ZONES = 50;
// Danh sách vùng đến từ trình duyệt dạng "a,b,c": mỗi phần tử là GUID, không trùng, tối đa 50.
const idList = z.string().max(MAX_ZONES * 37).transform((value) => value.split(",")).pipe(z.array(z.guid()).min(1).max(MAX_ZONES)).transform((list) => [...new Set(list)]);
const readQuery = z.strictObject({ action: z.enum(["report", "export"]), date: z.iso.date().optional(), zoneIds: idList.optional(), method: z.enum(endOfDayMethods).optional(), createdBy: z.guid().optional(), format: z.enum(["pdf", "xlsx"]).optional() });

/**
 * Kế hoạch gọi backend cho báo cáo Cuối ngày (REPORT end-of-day): đọc báo cáo của một ngày (View) và xuất PDF hoặc Excel (Export).
 * Chỉ đọc; backend giới hạn vùng theo quyền SALES_REPORTS của người gọi.
 */
export function endOfDayReportPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (method !== "GET" || input !== undefined || [...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = readQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, date, zoneIds, method: fund, createdBy, format } = parsed.data;
  if (format && action !== "export") return;
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  for (const zone of zoneIds ?? []) params.append("zoneIds", zone);
  if (fund) params.set("method", fund);
  if (createdBy) params.set("createdBy", createdBy);
  const suffix = params.size ? `?${params}` : "";
  const base = { area: "end-of-day-report" as const, action, method: "GET" as const };
  if (action === "export") {
    // PDF hoặc Excel (mặc định); backend đặt tên tệp BaoCaoCuoiNgay_yyyyMMdd.
    if (format) params.set("format", format);
    return { ...base, path: `/api/reports/end-of-day/export${params.size ? `?${params}` : ""}`, permission: "Export", schema: z.strictObject({}), file: "export", ...(format === "pdf" ? { exportFormat: "pdf" as const } : {}) };
  }
  return { ...base, path: `/api/reports/end-of-day${suffix}`, permission: "View", schema: endOfDayReport };
}
