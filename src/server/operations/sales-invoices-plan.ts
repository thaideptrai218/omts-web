import "server-only";
import { z } from "zod";
import * as c from "@/features/sales-invoices/contracts";
import * as v from "@/features/sales-invoices/vietqr-contracts";
import type { OperationPlan } from "./operation-plan";

const area = "sales-invoices" as const, id = z.guid();
const readQuery = z.strictObject({ action: z.enum(["lots", "open-requests", "detail", "publish-check", "pending"]), id: id.optional(), customerId: id.optional(), code: v.pendingCode.optional() });
// `id` của thao tác ghi là GUID hóa đơn (finish/resend) hoặc mã hóa đơn đang chờ (change-payment/stop): repository dùng chung một tham số id.
const writeInput = z.strictObject({ action: z.enum(["create", "finish", "resend", "change-payment", "stop"]), id: z.string().max(40).optional(), zoneId: z.undefined().optional(), body: z.unknown().default({}) });

/** Kế hoạch gọi backend cho Lập hóa đơn bán (SALE-04/05): đọc lô còn bán, yêu cầu mua đang mở, chi tiết, kiểm tra công bố và giao dịch VietQR đang chờ; ghi hóa đơn (tiền mặt/ghi nợ/VietQR), kết thúc bán, gửi lại, đổi phương thức và dừng giao dịch chờ. */
export function salesInvoicesPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  if (method === "GET") {
    const q = readQuery.safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const { action, id: invoiceId, customerId, code } = q.data;
    const base = { area, action, method: "GET" as const };
    if (action === "pending" && !invoiceId && !customerId) {
      return code ? { ...base, path: `/api/sales-invoices/pending/${code}`, permission: "Create", schema: v.pendingSale }
        : { ...base, path: "/api/sales-invoices/pending", permission: "Create", schema: z.array(v.pendingSale) };
    }
    if (code) return;
    if (action === "lots" && !invoiceId && !customerId) return { ...base, path: "/api/harvest-lots/for-sale", permission: "Create", schema: c.lotsForSale };
    if (action === "open-requests" && customerId && !invoiceId) return { ...base, path: `/api/sales-invoices/open-purchase-requests?customerId=${customerId}`, permission: "Create", schema: z.array(c.openPurchaseRequest) };
    if (action === "detail" && invoiceId && !customerId) return { ...base, path: `/api/sales-invoices/${invoiceId}`, permission: "View", schema: c.salesInvoice, expectedId: invoiceId };
    if (action === "publish-check" && invoiceId && !customerId) return { ...base, path: `/api/sales-invoices/${invoiceId}/publish-check`, permission: "Create", schema: c.publishCheck };
    return;
  }
  const parsed = writeInput.safeParse(input);
  if (method !== "POST" || query.size || !parsed.success) return;
  const { action, id: rawId, body } = parsed.data;
  const base = { area, action, method: "POST" as const, permission: "Create" };
  const invoiceId = rawId !== undefined && id.safeParse(rawId).success ? rawId : undefined;
  const code = rawId !== undefined ? v.pendingCode.safeParse(rawId).data : undefined;
  if (action === "create" && rawId === undefined) {
    const values = c.createInvoice.safeParse(body);
    // 201 hóa đơn đã lưu hoặc 202 giao dịch VietQR đang chờ (payment.rest = VietQr): kết quả là một trong hai.
    return values.success ? { ...base, path: "/api/sales-invoices", schema: v.createResult, body: values.data, zoneId: values.data.zoneId ?? undefined } : undefined;
  }
  if (action === "finish" && invoiceId) {
    const values = c.finishInvoice.safeParse(body);
    return values.success ? { ...base, path: `/api/sales-invoices/${invoiceId}/finish`, schema: c.salesInvoiceSent, body: values.data } : undefined;
  }
  if (action === "resend" && invoiceId && z.strictObject({}).safeParse(body).success) return { ...base, path: `/api/sales-invoices/${invoiceId}/resend`, schema: c.salesInvoiceSent };
  if (action === "change-payment" && code) {
    const values = v.changePendingPayment.safeParse(body);
    return values.success ? { ...base, path: `/api/sales-invoices/pending/${code}/change-payment`, schema: c.salesInvoiceSaved, body: values.data } : undefined;
  }
  if (action === "stop" && code) {
    const values = v.stopPending.safeParse(body);
    return values.success ? { ...base, path: `/api/sales-invoices/pending/${code}/stop`, schema: v.pendingSale, body: values.data } : undefined;
  }
}
