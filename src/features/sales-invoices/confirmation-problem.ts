import { z } from "zod";

/**
 * Câu hỏi xác nhận (HTTP 409) của backend khi lập hóa đơn bán hoặc ghi nhận thanh toán của khách: client trả lời bằng cách gửi lại cùng yêu cầu
 * kèm cờ có tên trong `confirmationField`. Chỉ cho qua tên trường nằm trong danh sách cho phép và các con số;
 * câu chữ hiển thị do web tự dựng (không chuyển chuỗi lạ từ backend ra giao diện).
 */
const fieldPattern = /^(lines\[\d{1,3}\]\.priceDecidedByOwner|discountDecidedByOwner|payment\.payLaterOwnerAgreed|payment\.subtractExtraFromDebt|wantsQrCode|confirmAboveDebt|confirmDuplicateBankReference|confirmOwedBack|customerId|cashGivenBack)$/;
// Sửa / hủy hóa đơn (SALE-07, SALE-08) thêm confirmOwedBack (MSG-SALE-17), customerId (MSG-SALE-19) và cashGivenBack (MSG-SALE-23, kèm paymentId):
// các tên này thuộc nhánh backend chưa gộp feature/OMTS-224-correct-cancel.
const amount = z.number().finite().nonnegative().optional();
const details = {
  lineNumber: z.number().int().positive().optional(), laterAmount: amount, debtAmount: amount, excessAmount: amount, subtractAmount: amount, changeAmount: amount,
  amount, owedBackAmount: amount, paymentCode: z.string().regex(/^[A-Za-z0-9-]{1,40}$/).optional(), paymentDate: z.iso.date().optional(), paymentId: z.guid().optional(),
};

export const invoiceConfirmationSchema = z.object({ field: z.string().regex(fieldPattern), ...details });
export type InvoiceConfirmation = z.infer<typeof invoiceConfirmationSchema>;

/** Dạng backend gửi: tên trường nằm ở "confirmationField", các con số nằm cùng cấp. */
const raw = z.object({ confirmationField: z.string().regex(fieldPattern), ...details });

export function projectInvoiceConfirmation(status: number, body: unknown): InvoiceConfirmation | undefined {
  if (status !== 409) return undefined;
  const value = raw.safeParse(body);
  if (!value.success) return undefined;
  const { confirmationField, ...numbers } = value.data;
  return { field: confirmationField, ...numbers };
}

/** Chuyển tên trường backend thành cách ghi trong thân yêu cầu: trả lời "Có" cho từng loại câu hỏi. */
export function answerPatch(field: string): { kind: "line"; index: number } | { kind: "discount" | "payLater" | "subtract" | "owedBack" | "qr" } | undefined {
  const line = /^lines\[(\d{1,3})\]\.priceDecidedByOwner$/.exec(field);
  if (line) return { kind: "line", index: Number(line[1]) };
  if (field === "discountDecidedByOwner") return { kind: "discount" };
  if (field === "payment.payLaterOwnerAgreed") return { kind: "payLater" };
  if (field === "payment.subtractExtraFromDebt") return { kind: "subtract" };
  if (field === "confirmOwedBack") return { kind: "owedBack" };
  if (field === "wantsQrCode") return { kind: "qr" };
  return undefined;
}
