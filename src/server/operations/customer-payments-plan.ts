import "server-only";
import { z } from "zod";
import * as c from "@/features/customer-payments/contracts";
import type { OperationPlan } from "./operation-plan";

const area = "customer-payments" as const, id = z.guid();
const readQuery = z.strictObject({
  action: z.enum(["form", "awaiting", "detail"]), id: id.optional(), customerId: id.optional(),
  page: z.string().regex(/^[1-9]\d{0,6}$/).optional(), pageSize: z.enum(["10", "20", "50"]).optional(),
});
const writeInput = z.strictObject({ action: z.enum(["record", "pay-back", "confirm", "cancel"]), id: id.optional(), zoneId: z.undefined().optional(), body: z.unknown().default({}) });

/** Kế hoạch gọi backend cho Thanh toán của khách (DEBT-02/03): đọc biểu mẫu, danh sách chờ xác nhận, chi tiết; ghi nhận, trả lại tiền, xác nhận/hủy. Không có phạm vi vùng (toàn HTX). */
export function customerPaymentsPlan(method: string, query: URLSearchParams, input?: unknown): OperationPlan | undefined {
  if ([...query.keys()].length !== new Set(query.keys()).size) return;
  if (method === "GET") {
    const q = readQuery.safeParse(Object.fromEntries(query));
    if (!q.success) return;
    const { action, id: paymentId, customerId, page, pageSize } = q.data, base = { area, action, method: "GET" as const, permission: "View" };
    if (action === "form" && customerId && !paymentId && !page && !pageSize) return { ...base, path: `/api/customer-payments/form/${customerId}`, schema: c.paymentForm };
    if (action === "awaiting" && !paymentId && !customerId) return { ...base, path: `/api/customer-payments/awaiting-confirmation?page=${page ?? 1}&pageSize=${pageSize ?? 20}`, schema: c.awaiting };
    if (action === "detail" && paymentId && !customerId && !page && !pageSize) return { ...base, path: `/api/customer-payments/${paymentId}`, schema: c.paymentDetails, expectedId: paymentId };
    return;
  }
  const parsed = writeInput.safeParse(input);
  if (method !== "POST" || query.size || !parsed.success) return;
  const { action, id: paymentId, body } = parsed.data;
  if ((action === "record" || action === "pay-back") && !paymentId) {
    const values = c.recordPayment.safeParse(body);
    return values.success ? { area, action, method: "POST", permission: "Create", path: action === "record" ? "/api/customer-payments" : "/api/customer-payments/pay-back", schema: c.paymentSaved, body: values.data } : undefined;
  }
  if (action === "confirm" && !paymentId) {
    const values = c.confirmPayments.safeParse(body);
    return values.success ? { area, action, method: "POST", permission: "Edit", path: "/api/customer-payments/confirmations", schema: c.confirmed, body: values.data } : undefined;
  }
  if (action === "cancel" && paymentId) {
    const values = c.cancelPayment.safeParse(body);
    return values.success ? { area, action, method: "POST", permission: "Edit", path: `/api/customer-payments/${paymentId}/cancel`, schema: c.paymentSaved, body: values.data } : undefined;
  }
}
