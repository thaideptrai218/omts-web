import { toKg, toMoney } from "@/features/sales-invoices/invoice-draft";
import type { CorrectionBody, InvoiceDetail } from "./invoice-list-contracts";

/**
 * Biểu mẫu sửa hóa đơn (SALE-07, nhánh backend chưa gộp OMTS-224) và phép dựng thân yêu cầu. Hai loại sửa không dùng chung trường:
 * lỗi nhập liệu sửa kg, đơn giá, giảm giá, thu khác, đánh dấu "bán hết lô" và bỏ dòng; giảm giá sau khiếu nại chỉ nhập một khoản trừ vào tổng.
 */
export type LineDraft = { key: string; productId: string; productName: string; harvestLotId: string; lotCode: string; kg: string; unitPrice: string };
export type CorrectionForm = { kind: "DataEntryError" | "PriceCutAfterClaim"; reason: string; lines: LineDraft[]; notWholeLots: string[]; discount: string; otherCharges: string; cut: string };
export type CorrectionFields = Omit<CorrectionBody, "rowVersion" | "confirmOwedBack" | "customerId">;

const plain = (value: number) => String(value);

export function initialCorrection(invoice: InvoiceDetail): CorrectionForm {
  const lots = [...new Set(invoice.lines.map((line) => line.harvestLotId))];
  return {
    kind: "DataEntryError", reason: "", cut: "", discount: plain(invoice.discount), otherCharges: plain(invoice.otherCharges),
    lines: invoice.lines.map((line) => ({ key: line.id, productId: line.productId, productName: line.productName, harvestLotId: line.harvestLotId, lotCode: line.lotCode, kg: plain(line.kg), unitPrice: plain(line.unitPrice) })),
    // Lô chưa từng được đánh dấu "bán hết lô" trên mọi dòng của nó giữ nguyên trạng thái chưa đánh dấu.
    notWholeLots: lots.filter((lot) => invoice.lines.filter((line) => line.harvestLotId === lot).every((line) => !line.soldWholeLot)),
  };
}

const sameNumber = (text: string, value: number, parse: (t: string) => number) => parse(text) === value;

/** Có thay đổi nào so với hóa đơn hiện tại không (lỗi nhập liệu): tránh gửi một lần sửa rỗng làm sai lịch sử sửa. */
function changed(form: CorrectionForm, invoice: InvoiceDetail): boolean {
  if (form.lines.length !== invoice.lines.length || !sameNumber(form.discount, invoice.discount, toMoney) || !sameNumber(form.otherCharges, invoice.otherCharges, toMoney)) return true;
  if (form.lines.some((line, i) => !sameNumber(line.kg, invoice.lines[i].kg, toKg) || !sameNumber(line.unitPrice, invoice.lines[i].unitPrice, toMoney))) return true;
  return [...form.notWholeLots].sort().join() !== [...initialCorrection(invoice).notWholeLots].sort().join();
}

/** Lỗi nhập liệu đầu tiên (tiếng Việt) hoặc thân yêu cầu đã dựng (chưa có rowVersion; hook thêm vào lúc gửi). */
export function buildCorrection(form: CorrectionForm, invoice: InvoiceDetail): { problem: string } | { fields: CorrectionFields } {
  const reason = form.reason.trim();
  if (!reason) return { problem: "Nhập lý do sửa hóa đơn." };
  if (reason.length > 500) return { problem: "Lý do tối đa 500 ký tự." };
  if (form.kind === "PriceCutAfterClaim") {
    const cut = toMoney(form.cut);
    if (!(cut > 0)) return { problem: "Nhập khoản giảm giá là số nguyên đồng lớn hơn 0." };
    if (cut > invoice.total) return { problem: "Khoản giảm giá không được lớn hơn tổng cộng hiện tại của hóa đơn." };
    return { fields: { kind: "PriceCutAfterClaim", reason, priceCutAmount: cut } };
  }
  for (const [i, line] of form.lines.entries()) {
    const kg = toKg(line.kg), price = toMoney(line.unitPrice);
    if (!(kg > 0) || Math.round(kg * 1000) / 1000 !== kg) return { problem: `Dòng ${i + 1}: số kg phải lớn hơn 0, tối đa 3 chữ số thập phân.` };
    if (!(price > 0)) return { problem: `Dòng ${i + 1}: đơn giá phải là số nguyên đồng lớn hơn 0.` };
  }
  if (!form.lines.length) return { problem: "Hóa đơn phải còn ít nhất một dòng hàng." };
  const discount = toMoney(form.discount), other = toMoney(form.otherCharges);
  if (Number.isNaN(discount) || Number.isNaN(other)) return { problem: "Giảm giá và thu khác phải là số tiền nguyên không âm." };
  if (!changed(form, invoice)) return { problem: "Chưa có thay đổi nào so với hóa đơn hiện tại." };
  const lots = new Set(form.lines.map((line) => line.harvestLotId));
  return {
    fields: {
      kind: "DataEntryError", reason, discount, otherCharges: other, notSoldWholeLotIds: form.notWholeLots.filter((lot) => lots.has(lot)),
      lines: form.lines.map((line) => ({ productId: line.productId, harvestLotId: line.harvestLotId, kg: toKg(line.kg), unitPrice: toMoney(line.unitPrice) })),
    },
  };
}
