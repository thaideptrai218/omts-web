import type { CreateInvoice, LotForSale } from "./contracts";

/** Bản nháp hóa đơn trên giao diện và các phép tính thuần (không gọi mạng), khớp quy tắc tiền của backend (InvoiceMoney). */
export type DraftLine = { key: string; lot: LotForSale; productId: string; kg: string; unitPrice: string };
export type DraftCustomer = { id: string; name: string; phoneNumber: string | null };
export type Draft = {
  lines: DraftLine[]; walkIn: boolean; customer: DraftCustomer | null; requestId: string | null;
  discount: string; otherCharges: string; cash: string; payLater: boolean;
};
/** Các câu hỏi xác nhận đã được trả lời "Có" trong lần lập hiện tại. */
export type Answers = { priceLines: ReadonlySet<number>; discount: boolean; payLater: boolean; subtract: boolean | null };

export const emptyDraft: Draft = { lines: [], walkIn: true, customer: null, requestId: null, discount: "", otherCharges: "", cash: "", payLater: false };
export const noAnswers: Answers = { priceLines: new Set(), discount: false, payLater: false, subtract: null };

/** Số kg: chấp nhận "," hoặc "." làm dấu thập phân (không có phân cách nghìn). Trống → 0; không hợp lệ → NaN. */
export function toKg(text: string): number {
  const cleaned = text.trim().replace(",", ".");
  return cleaned === "" ? 0 : /^\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : NaN;
}
/** Số tiền: chấp nhận "." hoặc khoảng trắng làm phân cách nghìn (kiểu Việt Nam). Trống → 0; không hợp lệ → NaN. */
export function toMoney(text: string): number {
  const cleaned = text.trim().replace(/[\s.]/g, "");
  return cleaned === "" ? 0 : /^\d+$/.test(cleaned) ? Number(cleaned) : NaN;
}
const wholeMoney = toMoney;
const validKg = (n: number) => n > 0 && Number.isFinite(n) && Math.round(n * 1000) / 1000 === n;

export function lineAmount(line: DraftLine, listPrice: number | null | undefined): number {
  const kg = toKg(line.kg), price = line.unitPrice.trim() === "" ? listPrice ?? NaN : toMoney(line.unitPrice);
  return Number.isFinite(kg) && Number.isFinite(price) ? Math.round(kg * price) : 0;
}

export type Totals = { totalKg: number; subtotal: number; discount: number; otherCharges: number; total: number; cash: number; rest: number; extra: number };
export function totals(draft: Draft, listPrice: (productId: string) => number | null | undefined): Totals {
  const totalKg = draft.lines.reduce((sum, l) => sum + (toKg(l.kg) || 0), 0);
  const subtotal = draft.lines.reduce((sum, l) => sum + lineAmount(l, listPrice(l.productId)), 0);
  const discount = wholeMoney(draft.discount) || 0, otherCharges = wholeMoney(draft.otherCharges) || 0, cash = wholeMoney(draft.cash) || 0;
  const total = Math.max(0, subtotal - discount + otherCharges);
  return { totalKg, subtotal, discount, otherCharges, total, cash, rest: Math.max(0, total - cash), extra: Math.max(0, cash - total) };
}

/** Cách trả phần còn lại: "standard" = tiền mặt đủ hoặc ghi nợ; "vietQr" = phần chưa trả bằng tiền mặt trả bằng mã VietQR của hóa đơn (chờ chuyển khoản). */
export type PaymentMode = "standard" | "vietQr";

/** Lỗi nhập liệu đầu tiên cần sửa trước khi gửi (tiếng Việt), hoặc undefined nếu hợp lệ. */
export function firstProblem(draft: Draft, t: Totals, mode: PaymentMode = "standard"): string | undefined {
  if (!draft.lines.length) return "Chọn ít nhất một lô để bán.";
  for (const [i, line] of draft.lines.entries()) {
    if (!line.productId) return `Dòng ${i + 1}: chọn sản phẩm.`;
    if (!validKg(toKg(line.kg))) return `Dòng ${i + 1}: số kg phải lớn hơn 0, tối đa 3 chữ số thập phân.`;
    if (line.unitPrice.trim() !== "" && !(toMoney(line.unitPrice) > 0)) return `Dòng ${i + 1}: đơn giá phải là số nguyên dương.`;
  }
  if (!draft.walkIn && !draft.customer) return "Chọn khách hàng hoặc chuyển sang khách lẻ.";
  for (const [label, text] of [["Giảm giá", draft.discount], ["Thu khác", draft.otherCharges], ["Tiền mặt nhận", draft.cash]] as const) if (Number.isNaN(wholeMoney(text))) return `${label} phải là số tiền nguyên không âm.`;
  if (t.discount > t.subtotal + t.otherCharges) return "Giảm giá không được lớn hơn tổng tiền hàng.";
  if (mode === "vietQr") return t.rest > 0 ? undefined : "Không còn số tiền cần thu qua VietQR: tiền mặt đã đủ hoặc vượt tổng cộng.";
  if (t.rest > 0 && !draft.payLater) return "Tiền mặt chưa đủ: nhận thêm tiền, chọn ghi nợ hoặc thanh toán VietQR phần còn lại.";
  if (t.rest > 0 && draft.walkIn) return "Khách lẻ không thể ghi nợ: hãy chọn khách có hồ sơ hoặc nhận đủ tiền.";
  return undefined;
}

/** Thân yêu cầu POST /api/sales-invoices; chỉ gửi cờ "Có" cho các câu hỏi đã được trả lời. */
export function buildRequest(draft: Draft, answers: Answers, deduplicationKey: string, listPrice: (productId: string) => number | null | undefined, mode: PaymentMode = "standard"): CreateInvoice {
  const t = totals(draft, listPrice);
  return {
    customerId: draft.walkIn ? null : draft.customer!.id, walkInCustomer: draft.walkIn, zoneId: null,
    lines: draft.lines.map((l, i) => {
      const custom = l.unitPrice.trim() !== "" && toMoney(l.unitPrice) !== listPrice(l.productId);
      return { productId: l.productId, harvestLotId: l.lot.id, kg: toKg(l.kg), ...(custom ? { unitPrice: toMoney(l.unitPrice), priceDecidedByOwner: answers.priceLines.has(i) } : {}) };
    }),
    // VietQR: phần còn lại chờ chuyển khoản; không có tiền dư để trừ công nợ và không ghi nợ nên không gửi hai cờ đó.
    payment: mode === "vietQr" ? { cashAmount: t.cash, rest: "VietQr", subtractExtraFromDebt: null, payLaterOwnerAgreed: false }
      : { cashAmount: t.cash, rest: t.rest > 0 ? "PayLater" : "None", subtractExtraFromDebt: answers.subtract, payLaterOwnerAgreed: answers.payLater },
    purchaseRequestId: draft.walkIn ? null : draft.requestId,
    discount: t.discount || null, discountDecidedByOwner: answers.discount, otherCharges: t.otherCharges || null, deduplicationKey,
  };
}
