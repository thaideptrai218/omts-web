import "server-only";
import { z } from "zod";
import * as c from "@/features/sales-invoices/contracts";
import * as v from "@/features/sales-invoices/vietqr-contracts";
import * as editor from "@/features/sales-invoice-editor/contracts";
import type { OperationPlan } from "./operation-plan";

const area = "sales-invoices" as const, id = z.guid();
const readQuery = z.strictObject({ action: z.enum(["lots", "order-draft", "next-code", "detail", "publish-check", "pending"]), id: id.optional(), code: v.pendingCode.optional() });
// `id` của thao tác ghi là GUID hóa đơn (finish/resend/update) hoặc mã hóa đơn đang chờ (change-payment/stop): repository dùng chung một tham số id.
const writeInput = z.strictObject({ action: z.enum(["create", "update", "finish", "resend", "change-payment", "stop"]), id: z.string().max(40).optional(), zoneId: z.undefined().optional(), body: z.unknown().default({}) });

/**
 * Kế hoạch gọi backend cho hóa đơn bán lập từ đơn đặt hàng (SALE-04/05): đọc lô còn bán, form "Xử lý đặt hàng" (invoice-draft), mã hóa đơn kế tiếp, chi tiết,
 * kiểm tra công bố và giao dịch VietQR đang chờ; ghi hóa đơn (tiền mặt/ghi nợ/VietQR), sửa hóa đơn (Edit), kết thúc bán, gửi lại, đổi phương thức và dừng giao dịch chờ.
 */
export function salesInvoicesPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  if (method === "GET") {
    const q = readQuery.safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const { action, id: refId, code } = q.data;
    const base = { area, action, method: "GET" as const };
    if (action === "pending" && !refId) {
      return code ? { ...base, path: `/api/sales-invoices/pending/${code}`, permission: "Create", schema: v.pendingSale }
        : { ...base, path: "/api/sales-invoices/pending", permission: "Create", schema: z.array(v.pendingSale) };
    }
    if (code) return;
    // Lô còn bán; kèm id đơn đặt hàng thì lô của kế hoạch thu hoạch phục vụ đơn đó được gợi ý và đứng đầu.
    if (action === "lots") return { ...base, path: refId ? `/api/harvest-lots/for-sale?salesOrderId=${refId}` : "/api/harvest-lots/for-sale", permission: "Create", schema: c.lotsForSale };
    if (action === "next-code" && !refId) return { ...base, path: "/api/sales-invoices/next-code", permission: "Create", schema: editor.nextCode };
    if (action === "order-draft" && refId) return { ...base, path: `/api/sales-orders/${refId}/invoice-draft`, permission: "Create", schema: editor.invoiceDraft };
    if (action === "detail" && refId) return { ...base, path: `/api/sales-invoices/${refId}`, permission: "View", schema: c.salesInvoice, expectedId: refId };
    if (action === "publish-check" && refId) return { ...base, path: `/api/sales-invoices/${refId}/publish-check`, permission: "Create", schema: c.publishCheck };
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
    // 201 hóa đơn đã lưu hoặc 202 giao dịch VietQR đang chờ (payment.rest = VietQr): kết quả là một trong hai. Khách và vùng lấy từ đơn nên không gửi zoneId.
    return values.success ? { ...base, path: "/api/sales-invoices", schema: v.createResult, body: values.data } : undefined;
  }
  if (action === "update" && invoiceId) {
    // Sửa hóa đơn (như sửa phiếu nhập): quyền Edit, chỉ Chủ HTX hoặc người được cấp. Trả về hóa đơn đã lưu và tình trạng gửi lại cho khách (SalesInvoiceSent).
    const values = c.updateInvoice.safeParse(body);
    return values.success ? { ...base, method: "PUT", permission: "Edit", path: `/api/sales-invoices/${invoiceId}`, schema: c.salesInvoiceSent, body: values.data } : undefined;
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
