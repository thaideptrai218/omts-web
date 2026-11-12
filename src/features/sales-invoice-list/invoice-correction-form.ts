import { toMoney } from "@/features/sales-invoices/invoice-draft";
import type { CorrectionBody, InvoiceDetail } from "./invoice-list-contracts";

/**
 * Biểu mẫu giảm giá sau khiếu nại chất lượng (SALE-07.1): một khoản trừ vào tổng cộng của hóa đơn, các dòng hàng không đổi.
 * Sửa nội dung hóa đơn (kg, đơn giá, giảm giá, thu khác) thuộc màn sửa hóa đơn, như sửa phiếu nhập.
 */
export type CorrectionForm = { reason: string; cut: string };
export type CorrectionFields = Omit<CorrectionBody, "rowVersion" | "confirmOwedBack" | "customerId">;

export const initialCorrection = (): CorrectionForm => ({ reason: "", cut: "" });

/** Lỗi nhập liệu đầu tiên (tiếng Việt) hoặc thân yêu cầu đã dựng (chưa có rowVersion; hook thêm vào lúc gửi). */
export function buildCorrection(form: CorrectionForm, invoice: InvoiceDetail): { problem: string } | { fields: CorrectionFields } {
  const reason = form.reason.trim();
  if (!reason) return { problem: "Nhập lý do giảm giá." };
  if (reason.length > 500) return { problem: "Lý do tối đa 500 ký tự." };
  const cut = toMoney(form.cut);
  if (!(cut > 0)) return { problem: "Nhập khoản giảm giá là số nguyên đồng lớn hơn 0." };
  if (cut > invoice.total) return { problem: "Khoản giảm giá không được lớn hơn tổng cộng hiện tại của hóa đơn." };
  return { fields: { kind: "PriceCutAfterClaim", reason, priceCutAmount: cut } };
}
