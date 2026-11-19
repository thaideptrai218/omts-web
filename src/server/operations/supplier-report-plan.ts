import "server-only";
import { z } from "zod";
import { purchaseGroupBy, purchaseKinds, purchaseLines, purchaseReport } from "@/features/sales-reports/supplier-report-contracts";
import type { OperationPlan } from "./operation-plan";
import { groupKey, idList } from "./sales-report-plan";

const readQuery = z.strictObject({
  action: z.enum(["report", "lines", "export"]), from: z.iso.date().optional(), to: z.iso.date().optional(), groupBy: z.enum(purchaseGroupBy).optional(),
  supplierIds: idList.optional(), kind: z.enum(purchaseKinds).optional(), groupKey: groupKey.optional(),
});

/** Kế hoạch gọi backend cho báo cáo "Hàng nhập theo nhà cung cấp": đọc báo cáo, chứng từ của một nhóm (`lines`) và xuất Excel. Chỉ đọc. */
export function supplierReportPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (method !== "GET" || input !== undefined || [...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = readQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, from, to, groupBy, kind, groupKey: key } = parsed.data;
  if (from && to && from > to) return;
  if (action === "lines" && !key || action !== "lines" && key) return;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (groupBy) params.set("groupBy", groupBy);
  for (const value of parsed.data.supplierIds ?? []) params.append("supplierIds", value);
  if (kind && kind !== "all") params.set("kind", kind);
  if (key) params.set("groupKey", key);
  const suffix = params.size ? `?${params}` : "";
  const base = { area: "supplier-report" as const, action, method: "GET" as const };
  if (action === "export") return { ...base, path: `/api/reports/purchases/export${suffix}`, permission: "Export", schema: z.strictObject({}), file: "export" };
  if (action === "lines") return { ...base, path: `/api/reports/purchases/lines${suffix}`, permission: "View", schema: purchaseLines };
  return { ...base, path: `/api/reports/purchases${suffix}`, permission: "View", schema: purchaseReport };
}
