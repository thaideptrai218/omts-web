import "server-only";
import { z } from "zod";
import * as c from "@/features/sales-invoice-list/invoice-list-contracts";
import type { OperationPlan } from "./operation-plan";

const area = "sales-invoice-list" as const, id = z.guid();
// Đúng các tham số lọc mà SalesInvoiceSearchQuery của backend nhận; statusId chỉ có hai trạng thái (Hoàn thành 3501, Đã hủy 3502).
const filters = {
  from: z.iso.date().optional(), to: z.iso.date().optional(), zoneId: id.optional(), customerId: id.optional(), harvestLotId: id.optional(),
  statusId: z.enum(["3501", "3502"]).optional(), paid: z.enum(["true", "false"]).optional(), code: z.string().trim().min(1).max(50).optional(), cashCollectedByMe: z.literal("true").optional(),
};
const readQuery = z.strictObject({
  action: z.enum(["list", "detail", "export", "lots"]), id: id.optional(), lotCode: z.string().trim().min(1).max(100).optional(), ...filters,
  page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["10", "20", "50", "100"]).optional(),
});
const filterNames = Object.keys(filters) as (keyof typeof filters)[];
const writeInput = z.strictObject({ action: z.enum(["resend", "correct", "cancel"]), id, zoneId: z.undefined().optional(), body: z.unknown().default({}) });

/**
 * Kế hoạch gọi backend cho Hóa đơn bán (SALE-09, SCR-SALE-05).
 * Quyền (plan.permission): View = SALES_INVOICES View (danh sách, chi tiết, tra lô), Export = SALES_INVOICES Export (xuất danh sách; in một hóa đơn là `action=export&id=...`),
 * Create = gửi lại (SALE-06.1). Sửa và hủy hóa đơn chỉ dành cho Chủ HTX ([RequireCooperativeOwner]) nên dùng Edit / Delete, không cấp theo Create của người bán.
 * PHỤ THUỘC NHÁNH CHƯA GỘP feature/OMTS-224-correct-cancel: `correct` (PUT .../correction) và `cancel` (POST .../cancel).
 */
export function salesInvoiceListPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  if (method === "GET") {
    if (input !== undefined) return;
    const parsed = readQuery.safeParse(Object.fromEntries(query));
    if (!parsed.success) return;
    const q = parsed.data, base = { area, action: q.action, method: "GET" as const };
    const used = (names: readonly string[]) => [...query.keys()].every((name) => name === "action" || names.includes(name));
    if (q.action === "detail") return q.id && used(["id"]) ? { ...base, path: `/api/sales-invoices/${q.id}`, permission: "View", schema: c.invoiceDetail, expectedId: q.id } : undefined;
    if (q.action === "lots") return q.lotCode && used(["lotCode"]) ? { ...base, path: `/api/harvest-lots/trace-search?${new URLSearchParams({ lotCode: q.lotCode })}`, permission: "View", schema: c.lotSearch } : undefined;
    if (q.from && q.to && q.from > q.to || q.lotCode !== undefined) return;
    if (q.action === "export" && q.id) {
      // In một hóa đơn: không kèm bộ lọc nào khác.
      return used(["id"]) ? { ...base, path: `/api/sales-invoices/${q.id}/print`, permission: "Export", schema: z.strictObject({}), file: "export" } : undefined;
    }
    if (q.id || !used([...filterNames, ...(q.action === "list" ? ["page", "pageSize"] : [])])) return;
    const params = new URLSearchParams();
    for (const name of filterNames) if (q[name] !== undefined) params.set(name, q[name]);
    if (q.action === "list") { params.set("page", q.page ?? "1"); params.set("pageSize", q.pageSize ?? "20"); }
    const path = `/api/sales-invoices${q.action === "export" ? "/export" : ""}${params.size ? `?${params}` : ""}`;
    const plan = { ...base, path, zoneId: q.zoneId };
    return q.action === "export" ? { ...plan, permission: "Export", schema: z.strictObject({}), file: "export" } : { ...plan, permission: "View", schema: c.searchResult };
  }
  const parsed = writeInput.safeParse(input);
  if (method !== "POST" || query.size || !parsed.success) return;
  const { action, id: invoiceId, body } = parsed.data, base = { area, action, method: "POST" as const };
  if (action === "resend") return z.strictObject({}).safeParse(body).success ? { ...base, path: `/api/sales-invoices/${invoiceId}/resend`, permission: "Create", schema: c.invoiceSent } : undefined;
  if (action === "correct") {
    const values = c.correctionBody.safeParse(body);
    return values.success ? { ...base, method: "PUT", path: `/api/sales-invoices/${invoiceId}/correction`, permission: "Edit", schema: c.invoiceSent, body: values.data } : undefined;
  }
  const values = c.cancelBody.safeParse(body);
  return values.success ? { ...base, path: `/api/sales-invoices/${invoiceId}/cancel`, permission: "Delete", schema: c.invoiceSent, body: values.data } : undefined;
}
