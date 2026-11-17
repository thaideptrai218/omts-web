import type { CreateInvoice, LotForSale, UpdateInvoice } from "@/features/sales-invoices/contracts";
import { toKg } from "@/features/sales-invoices/invoice-draft";
import { lineAmount, parseQuantity } from "@/features/sales-orders/order-logic";
import type { DraftLine, InvoiceDraft } from "./contracts";

/** Pure rules of the invoice editor: money per unit, totals with the advance, the discount share, the lots to offer, validation and the request bodies. */

export type EditorUnit = { id: string; name: string; factor: number; salePrice: number | null };
/**
 * One line of the form. `unitId` is null for a line of an old invoice made before units existed (counted in kg). `referencePrice` is what a typed price is compared
 * with: the price of the order line, or the list price of a line added outside the order. `kg` is the weighed kg (always required); for a line counted in kg it equals the quantity.
 */
export type EditorLine = {
  key: string; lineId: string | null; orderLineId: string | null; productId: string; productCode: string; productName: string;
  units: EditorUnit[]; unitId: string | null; unitName: string; factor: number;
  quantity: string; kg: string; lotId: string; lotCode: string; unitPrice: number | null; referencePrice: number | null;
  ordered: number | null; delivered: number | null;
};

/** A line counted in kg: the quantity is the weighed kg. */
export const countsInKg = (line: Pick<EditorLine, "factor">) => line.factor === 1;
const kgText = (value: number) => String(value);

/** The quantity of the line in its unit, or null when it is not a valid quantity. */
export function lineQuantity(line: EditorLine): number | null {
  if (!countsInKg(line)) return parseQuantity(line.quantity);
  const kg = toKg(line.kg);
  return kg > 0 && Number.isFinite(kg) ? kg : null;
}
/** Amount of a line: quantity in its unit × price per that unit, rounded half up to the dong (kg × price per kg for a kg line). */
export const lineMoney = (line: EditorLine) => lineAmount(lineQuantity(line), line.unitPrice);
/** A line with a quantity typed takes part in the invoice; a line of the order with nothing typed (nothing left to deliver) is simply left out. */
export const isActive = (line: EditorLine) => (countsInKg(line) ? line.kg.trim() : line.quantity.trim()) !== "";

/** Typing the quantity of a kg line sets the weighed kg too: they are the same number. */
export function withQuantity(line: EditorLine, value: string): EditorLine {
  return countsInKg(line) ? { ...line, quantity: value, kg: value } : { ...line, quantity: value };
}

/** A line of the draft from "Xử lý đặt hàng": what is left to deliver, at the price and in the unit of the order line, with the lot the draft proposes already chosen. */
export function lineFromDraft(source: DraftLine, key: string, productUnits: readonly EditorUnit[]): EditorLine {
  const remaining = source.quantity > 0 ? source.quantity : 0;
  const unit: EditorUnit = { id: source.unitId, name: source.unitName, factor: source.factor, salePrice: source.listPrice ?? null };
  return {
    key, lineId: null, orderLineId: source.salesOrderLineId, productId: source.productId, productCode: source.productCode, productName: source.productName,
    units: productUnits.some((row) => row.id === unit.id) ? [...productUnits] : [unit, ...productUnits], unitId: unit.id, unitName: unit.name, factor: unit.factor,
    quantity: remaining ? kgText(remaining) : "", kg: source.factor === 1 && remaining ? kgText(remaining) : "", lotId: source.suggestedLotId ?? "", lotCode: source.suggestedLotCode ?? "",
    unitPrice: source.unitPrice, referencePrice: source.unitPrice, ordered: source.orderedQuantity, delivered: source.deliveredQuantity,
  };
}

/** `lot` is the lot as the API lists it for sale; null for a lot that is only known by the code (already on the line). `suggested`: its harvest plan serves the order. */
export type LotOption = { id: string; code: string; lot: LotForSale | null; planCode: string | null; suggested: boolean };
/**
 * The lots a line may name: those of the harvest that hold the product (a lot not split by product holds any), the lots of the harvest plan that serves the order first
 * (marked with the plan code), then the rest in the order of the API. The lot already on the line stays in the list even when it is no longer open (an invoice being changed).
 */
export function lotOptions(line: Pick<EditorLine, "productId" | "lotId" | "lotCode">, lots: readonly LotForSale[]): LotOption[] {
  const fits = lots.filter((lot) => !lot.products?.length || lot.products.some((own) => own.productId === line.productId));
  const options = fits.map<LotOption>((lot) => ({ id: lot.id, code: lot.lotCode, lot, planCode: lot.harvestPlanCode ?? null, suggested: !!lot.suggested }));
  if (line.lotId && !options.some((row) => row.id === line.lotId)) options.push({ id: line.lotId, code: line.lotCode, lot: null, planCode: null, suggested: false });
  return options.map((row, order) => ({ row, order })).sort((a, b) => Number(b.row.suggested) - Number(a.row.suggested) || a.order - b.order).map(({ row }) => row);
}

/** `roundHalfUp(a × b / c)` in integers, so large amounts do not lose digits. */
function ratio(a: number, b: number, c: number): number {
  const two = BigInt(2), base = BigInt(Math.round(c));
  return Number((two * BigInt(Math.round(a)) * BigInt(Math.round(b)) + base) / (two * base));
}
/**
 * The share of the order discount an invoice takes: the order discount split by goods amount, never more than what earlier invoices left of it. The draft already holds the
 * share for the goods it proposes (`discountShare` for `subtotal`); for other quantities the share follows the goods in proportion, never above the order discount.
 * The seller may type another amount.
 */
export function discountShare(draft: Pick<InvoiceDraft, "orderDiscount" | "discountShare" | "subtotal">, invoiceSubtotal: number): number {
  if (invoiceSubtotal === draft.subtotal) return draft.discountShare;
  if (draft.discountShare <= 0 || draft.subtotal <= 0 || invoiceSubtotal <= 0) return 0;
  return Math.min(draft.orderDiscount, ratio(draft.discountShare, invoiceSubtotal, draft.subtotal));
}

export type Totals = { subtotal: number; discount: number; otherCharges: number; total: number; advance: number; due: number; cash: number; rest: number; extra: number };
/**
 * Money of the invoice. The advance held for the order is set against it automatically (up to the total); cash is what the customer hands over for the rest;
 * what is neither is the rest (Trả sau or VietQR), what is more than the rest is extra.
 */
export function invoiceTotals(input: { lines: readonly EditorLine[]; discount: number; otherCharges: number; advanceLeft: number; cash: number }): Totals {
  const subtotal = input.lines.filter(isActive).reduce((sum, line) => sum + lineMoney(line), 0);
  const total = Math.max(0, subtotal - input.discount + input.otherCharges);
  const advance = Math.min(Math.max(0, input.advanceLeft), total), due = total - advance;
  return { subtotal, discount: input.discount, otherCharges: input.otherCharges, total, advance, due, cash: input.cash, rest: Math.max(0, due - input.cash), extra: Math.max(0, input.cash - due) };
}

/** The answers of the user to the questions of the API in the current save. */
export type Answers = { priceLines: ReadonlySet<number>; discount: boolean; payLater: boolean; subtract: boolean | null; owedBack: boolean };
export const noAnswers: Answers = { priceLines: new Set(), discount: false, payLater: false, subtract: null, owedBack: false };

export type PaymentMode = "standard" | "vietQr";
export type Form = {
  lines: readonly EditorLine[]; code: string; note: string; discount: number; otherCharges: number; cash: number; payLater: boolean;
  notWholeLots: ReadonlySet<string>; walkIn: boolean;
};
const codePattern = /^[A-Za-z0-9._-]{1,30}$/;
export const vietQrCodeLength = 25;

/** The first thing wrong with the form in the user's words; undefined when it can be sent. `payment` is false when an invoice is changed (what was paid stays as it is). */
export function firstProblem(form: Form, totals: Totals, options: { payment: boolean; mode?: PaymentMode }): string | undefined {
  const active = form.lines.map((line, index) => ({ line, position: index + 1 })).filter(({ line }) => isActive(line));
  if (!active.length) return "Nhập số lượng ít nhất một dòng hàng.";
  for (const { line, position } of active) {
    if (lineQuantity(line) === null) return `Dòng ${position}: số lượng phải lớn hơn 0, tối đa 3 chữ số thập phân.`;
    if (!line.lotId) return `Dòng ${position}: chọn lô thu hoạch.`;
    const kg = toKg(line.kg);
    if (!(kg > 0) || Math.round(kg * 1000) / 1000 !== kg) return `Dòng ${position}: nhập số kg cân, lớn hơn 0, tối đa 3 chữ số thập phân.`;
    if (!(line.unitPrice && line.unitPrice > 0)) return `Dòng ${position}: nhập đơn giá.`;
  }
  const trimmed = form.code.trim();
  if (trimmed && !codePattern.test(trimmed)) return "Mã hóa đơn gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới, tối đa 30 ký tự.";
  if (options.mode === "vietQr" && trimmed.length > vietQrCodeLength) return `Mã hóa đơn dùng làm nội dung chuyển khoản VietQR nên tối đa ${vietQrCodeLength} ký tự.`;
  if (totals.discount > totals.subtotal + totals.otherCharges) return "Giảm giá không được lớn hơn tổng tiền hàng.";
  if (!options.payment) return undefined;
  if (options.mode === "vietQr") return totals.rest > 0 ? undefined : "Không còn số tiền cần thu qua VietQR: tiền mặt và tiền ứng đã đủ.";
  if (totals.rest > 0 && !form.payLater) return "Khách chưa thanh toán đủ: nhận thêm tiền, chọn Trả sau hoặc thanh toán VietQR phần còn lại.";
  if (totals.rest > 0 && form.walkIn) return "Khách lẻ không thể trả sau: hãy nhận đủ tiền.";
  return undefined;
}

/**
 * The lines sent to the API: only the lines with a quantity, kg always, the quantity only for a unit that is not kg, the price flag only for a price changed and answered.
 * A question of the API names the line by its place in what was sent, so the answers are kept by that place.
 */
function bodyLines(form: Form, answers: Answers, keepUnit: (line: EditorLine) => boolean) {
  return form.lines.filter(isActive).map((line, index) => ({
    productId: line.productId, harvestLotId: line.lotId, kg: toKg(line.kg), ...(line.orderLineId ? { salesOrderLineId: line.orderLineId } : {}),
    ...(keepUnit(line) && line.unitId ? { unitId: line.unitId } : {}), ...(!countsInKg(line) ? { quantity: lineQuantity(line)! } : {}),
    unitPrice: line.unitPrice,
    ...(line.referencePrice !== null && line.unitPrice !== line.referencePrice ? { priceDecidedByOwner: answers.priceLines.has(index) } : {}),
  }));
}
const common = (form: Form, answers: Answers, totals: Totals, keepUnit: (line: EditorLine) => boolean) => {
  const lines = bodyLines(form, answers, keepUnit), lots = new Set(lines.map((line) => line.harvestLotId));
  return {
    code: form.code.trim() || null, note: form.note.trim() || null, lines, notSoldWholeLotIds: [...lots].filter((lot) => form.notWholeLots.has(lot)),
    discount: totals.discount || null, discountDecidedByOwner: answers.discount, otherCharges: totals.otherCharges || null,
  };
};

/** The body of POST /api/sales-invoices: customer and zone come from the order. */
export function buildCreateBody(orderId: string, form: Form, answers: Answers, totals: Totals, deduplicationKey: string, mode: PaymentMode = "standard"): CreateInvoice {
  return {
    salesOrderId: orderId, ...common(form, answers, totals, () => true),
    // VietQR: the rest waits for the transfer, so there is nothing to subtract from the debt and nothing owed.
    payment: mode === "vietQr" ? { cashAmount: totals.cash, rest: "VietQr", subtractExtraFromDebt: null, payLaterOwnerAgreed: false }
      : { cashAmount: totals.cash, rest: totals.rest > 0 ? "PayLater" : "None", subtractExtraFromDebt: answers.subtract, payLaterOwnerAgreed: answers.payLater },
    deduplicationKey,
  };
}
/**
 * The body of PUT /api/sales-invoices/{id}: the whole content again, like a receipt. A line of an old invoice keeps no unit (counted in kg).
 * The API keeps what is left out, so the amounts and the note are always sent: 0 and "" are how the user clears them.
 */
export function buildUpdateBody(rowVersion: string, form: Form, answers: Answers, totals: Totals): UpdateInvoice {
  return {
    ...common(form, answers, totals, (line) => line.unitId !== null), discount: totals.discount, otherCharges: totals.otherCharges, note: form.note.trim(),
    rowVersion, ...(answers.owedBack ? { confirmOwedBack: true } : {}),
  };
}

/** The effect on the answers of a "yes" to a question of the API, by the field it names. */
export function withAnswer(answers: Answers, patch: { kind: "line"; index: number } | { kind: "discount" | "payLater" | "subtract" | "owedBack" | "qr" }, yes: boolean): Answers {
  switch (patch.kind) {
    case "line": return { ...answers, priceLines: new Set([...answers.priceLines, patch.index]) };
    case "discount": return { ...answers, discount: true };
    case "payLater": return { ...answers, payLater: true };
    case "owedBack": return { ...answers, owedBack: true };
    case "subtract": return { ...answers, subtract: yes };
    default: return answers;
  }
}
