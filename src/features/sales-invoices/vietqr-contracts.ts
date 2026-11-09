import { z } from "zod";
import { salesInvoiceSaved } from "./contracts";
import { isVietQrPayloadConsistent } from "./vietqr-payload-check";

/**
 * Hợp đồng bán chờ chuyển khoản VietQR (OMTS-224, SALE-05 bước 7-8, SALE-05.0.E4), khớp backend nhánh feature/OMTS-224-vietqr-webhook:
 * POST /api/sales-invoices với payment.rest = "VietQr" -> 202 PendingSaleView (hoặc 201 nếu không phải VietQR);
 * GET .../pending, GET .../pending/{code}, POST .../pending/{code}/change-payment (201 hóa đơn), POST .../pending/{code}/stop (200).
 * Không dựng giao diện cho webhook ngân hàng (PaymentNotifications) - đó là cổng của dịch vụ thông báo ngân hàng.
 */
const id = z.guid(), vnd = z.number().int().nonnegative(), at = z.iso.datetime({ offset: true });

/** Mã hóa đơn do backend cấp (tiền tố + ít nhất 6 chữ số), cũng là nội dung chuyển khoản. Chỉ ký tự an toàn để ghép vào đường dẫn. */
export const pendingCode = z.string().regex(/^[A-Za-z]{1,8}\d{6,12}$/);
export const pendingStatus = z.enum(["Awaiting", "Completed", "PaymentChanged", "Stopped"]);

const vietQrView = z.object({
  payload: z.string().max(400), bankBin: z.string().regex(/^\d{6}$/), bankName: z.string().max(120),
  accountNumber: z.string().max(40), accountHolderName: z.string().max(200), amount: vnd, content: z.string().max(40),
});

export const pendingSale = z.object({
  code: pendingCode, status: pendingStatus, zone: z.object({ id, code: z.string(), name: z.string() }),
  customer: z.object({ id, name: z.string(), phoneNumber: z.string().nullable() }).nullable(), walkInCustomer: z.boolean(),
  total: vnd, cashAmount: vnd, toPayAmount: vnd, receivedAmount: vnd, vietQr: vietQrView.nullable(), createdAt: at,
  invoiceId: id.nullable(), invoice: salesInvoiceSaved.nullable(), endedAt: at.nullable(),
}).refine((sale) => sale.vietQr === null || sale.vietQr.amount === sale.toPayAmount, "Số tiền VietQR không khớp số cần trả");
export type PendingSale = z.infer<typeof pendingSale>;
export type PendingVietQr = NonNullable<PendingSale["vietQr"]>;

/** POST /api/sales-invoices: 201 hóa đơn đã lưu, hoặc 202 giao dịch đang chờ chuyển khoản (đúng một trong hai). */
export const createResult = z.union([salesInvoiceSaved, pendingSale]);
export const isPendingSale = (value: z.infer<typeof createResult>): value is PendingSale => "status" in value && "toPayAmount" in value;

/** Đổi phương thức trong lúc chờ: tiền mặt (rest None, cashAmount = tổng) hoặc ghi nợ phần còn lại; không được đổi lại sang VietQR. */
export const changePendingPayment = z.strictObject({
  payment: z.strictObject({ cashAmount: vnd, rest: z.enum(["None", "PayLater"]), payLaterOwnerAgreed: z.boolean().optional() }),
});
/** Dừng bán: web luôn hỏi người dùng trước (MSG-SALE-14) rồi mới gửi confirmed = true. */
export const stopPending = z.strictObject({ confirmed: z.literal(true) });

/** Chuỗi VietQR hợp lệ với số tiền và nội dung hiển thị, mới được vẽ thành mã QR. */
export function usableVietQr(sale: PendingSale): PendingVietQr | undefined {
  const qr = sale.vietQr;
  return qr && isVietQrPayloadConsistent(qr.payload, sale.toPayAmount, qr.content) ? qr : undefined;
}
