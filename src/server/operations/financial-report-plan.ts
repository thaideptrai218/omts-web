import "server-only";
import { z } from "zod";
import { financialReport, financialUnits } from "@/features/sales-reports/financial-report-contracts";
import type { OperationPlan } from "./operation-plan";

const readQuery = z.strictObject({ action: z.enum(["report", "export"]), from: z.iso.date().optional(), to: z.iso.date().optional(), unit: z.enum(financialUnits).optional() });

/** Kế hoạch gọi backend cho báo cáo Tài chính (kết quả kinh doanh theo tháng/quý/năm): đọc và xuất Excel. Chỉ đọc; backend giới hạn người xem. */
export function financialReportPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (method !== "GET" || input !== undefined || [...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = readQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, from, to, unit } = parsed.data;
  if (from && to && from > to) return;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (unit) params.set("unit", unit);
  const suffix = params.size ? `?${params}` : "";
  const base = { area: "financial-report" as const, action, method: "GET" as const };
  if (action === "export") return { ...base, path: `/api/reports/financial/export${suffix}`, permission: "Export", schema: z.strictObject({}), file: "export" };
  return { ...base, path: `/api/reports/financial${suffix}`, permission: "View", schema: financialReport };
}
