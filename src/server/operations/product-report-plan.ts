import "server-only";
import { z } from "zod";
import { productStockGroupBy, productStockReport } from "@/features/sales-reports/product-stock-contracts";
import type { OperationPlan } from "./operation-plan";
import { idList, salesReportPlan } from "./sales-report-plan";

const stockQuery = z.strictObject({
  action: z.enum(["report", "export"]), concern: z.literal("stock"), from: z.iso.date().optional(), to: z.iso.date().optional(),
  groupBy: z.enum(productStockGroupBy).optional(), productIds: idList.optional(), categoryIds: idList.optional(),
});

/**
 * Kế hoạch gọi backend cho báo cáo Hàng hóa. Mối quan tâm "Bán hàng" dùng đúng nguồn của báo cáo Bán hàng (gộp theo sản phẩm);
 * "Xuất nhập tồn" (`concern=stock`) đọc api/reports/product-stock và xuất Excel. Chỉ đọc; backend quyết định ai được xem.
 */
export function productReportPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (query.get("concern") !== "stock") return salesReportPlan("product-report", method, query, input);
  if (method !== "GET" || input !== undefined || [...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = stockQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, from, to, groupBy } = parsed.data;
  if (from && to && from > to) return;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (groupBy) params.set("groupBy", groupBy);
  for (const [name, ids] of [["productIds", parsed.data.productIds], ["categoryIds", parsed.data.categoryIds]] as const)
    for (const value of ids ?? []) params.append(name, value);
  const suffix = params.size ? `?${params}` : "";
  const base = { area: "product-report" as const, action, method: "GET" as const };
  if (action === "export") return { ...base, path: `/api/reports/product-stock/export${suffix}`, permission: "Export", schema: z.strictObject({}), file: "export" };
  return { ...base, path: `/api/reports/product-stock${suffix}`, permission: "View", schema: productStockReport };
}
