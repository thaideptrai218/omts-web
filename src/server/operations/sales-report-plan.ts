import "server-only";
import { z } from "zod";
import { salesGroupBy, salesInvoiceList, salesReport } from "@/features/sales-reports/contracts";
import type { OperationPlan } from "./operation-plan";

const MAX_IDS = 50;
// Danh sách id đến từ trình duyệt dạng "a,b,c": mỗi phần tử là GUID, không trùng, tối đa 50.
export const idList = z.string().max(MAX_IDS * 37).transform((value) => value.split(",")).pipe(z.array(z.guid()).min(1).max(MAX_IDS)).transform((list) => [...new Set(list)]);
// groupKey là `key` của một nhóm do backend trả (id, ngày bắt đầu hoặc tên cố định như walk-in); chỉ nhận ký tự an toàn.
export const groupKey = z.string().min(1).max(100).regex(/^[A-Za-z0-9_.:-]+$/);
const readQuery = z.strictObject({
  action: z.enum(["report", "invoices", "export"]), from: z.iso.date().optional(), to: z.iso.date().optional(), groupBy: z.enum(salesGroupBy).optional(),
  zoneIds: idList.optional(), customerIds: idList.optional(), productIds: idList.optional(), groupKey: groupKey.optional(),
});

/**
 * Kế hoạch gọi backend cho Hiệu quả bán hàng (REPORT-01), báo cáo Khách hàng và phần Bán hàng của báo cáo Hàng hóa (cùng nguồn): đọc báo cáo, hóa đơn của một nhóm (View) và xuất Excel (Export).
 * Chỉ đọc; backend quyết định vùng được xem theo quyền SALES_REPORTS của người gọi.
 */
export function salesReportPlan(area: "sales-report" | "customer-report" | "product-report", method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if (method !== "GET" || input !== undefined || [...query.keys()].length !== new Set(query.keys()).size) return;
  const parsed = readQuery.safeParse(Object.fromEntries(query));
  if (!parsed.success) return;
  const { action, from, to, groupBy, groupKey: key } = parsed.data;
  if (from && to && from > to) return;
  if (action === "invoices" && !key || action !== "invoices" && key) return;
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (groupBy) params.set("groupBy", groupBy);
  for (const [name, ids] of [["zoneIds", parsed.data.zoneIds], ["customerIds", parsed.data.customerIds], ["productIds", parsed.data.productIds]] as const)
    for (const value of ids ?? []) params.append(name, value);
  if (key) params.set("groupKey", key);
  const suffix = params.size ? `?${params}` : "";
  const base = { area, action, method: "GET" as const };
  if (action === "export") return { ...base, path: `/api/reports/sales-performance/export${suffix}`, permission: "Export", schema: z.strictObject({}), file: "export" };
  if (action === "invoices") return { ...base, path: `/api/reports/sales-performance/invoices${suffix}`, permission: "View", schema: salesInvoiceList };
  return { ...base, path: `/api/reports/sales-performance${suffix}`, permission: "View", schema: salesReport };
}
