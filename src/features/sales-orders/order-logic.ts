import type { OrderProgress, OrderSource } from "./contracts";

/** Pure rules of the order form: line money, totals, quantities, the "x/y" progress and the body sent to the API. */
const number = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
export const formatNumber = (value: number) => number.format(value);

/** A line amount: quantity × unit price in the unit of the line, rounded half up to the dong like the backend. */
export const lineAmount = (quantity: number | null | undefined, unitPrice: number | null | undefined) =>
  Math.round((Math.round((quantity ?? 0) * 1000) * (unitPrice ?? 0)) / 1000);

export function orderTotals(lines: readonly { quantity: number | null; unitPrice: number | null }[], discount: number) {
  const subtotal = lines.reduce((sum, line) => sum + lineAmount(line.quantity, line.unitPrice), 0);
  return { subtotal, discount, total: Math.max(0, subtotal - discount) };
}

/** A quantity typed with a comma or a point: above 0 with at most 3 decimals, otherwise null. */
export function parseQuantity(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(parsed) && parsed > 0 && Math.round(parsed * 1000) / 1000 === parsed ? parsed : null;
}

/** "40/50 kg · 2/2 Lồng": what is delivered of what was ordered, one part per unit. */
export const progressText = (progress: readonly OrderProgress[]) =>
  progress.length ? progress.map((part) => `${formatNumber(part.delivered)}/${formatNumber(part.ordered)} ${part.unitName}`).join(" · ") : "—";

const dayOf = (instant: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
/**
 * "Số ngày chờ": the calendar days left until the pickup day of an order that is still open (0 = today, negative = past the pickup day); null when the order has no
 * pickup time or is already closed.
 */
export function daysUntilPickup(pickupAt: string | null | undefined, statusId: number, now: Date = new Date()): number | null {
  if (!pickupAt || statusId !== 4101 && statusId !== 4102) return null;
  const pickup = new Date(pickupAt);
  if (Number.isNaN(pickup.getTime())) return null;
  const [py, pm, pd] = dayOf(pickup).split("-").map(Number), [ny, nm, nd] = dayOf(now).split("-").map(Number);
  return Math.round((Date.UTC(py, pm - 1, pd) - Date.UTC(ny, nm - 1, nd)) / 86_400_000);
}
/** The cell of "Số ngày chờ". */
export const waitingText = (days: number | null) => days === null ? "—" : days < 0 ? `Quá ${-days} ngày` : String(days);

/** The wall time of the picker (`yyyy-mm-ddTHH:mm`) as an instant at +07:00. */
export const toInstant = (local: string) => `${local.slice(0, 16)}:00+07:00`;

export type DraftLine = { productId: string; unitId: string; quantity: string; unitPrice: number | null; listPrice: number | null; note: string };
export type Advance = { amount: number; method: "Cash" | "OtherTransfer" | "VietQr"; bankReference: string; cashAccountId: string };
export type OrderForm = {
  code: string; customerId: string; walkIn: boolean; purchaseRequestId?: string; source: OrderSource; receivedById: string; orderedAt: string; pickupAt: string;
  note: string; discount: number; lines: DraftLine[]; advance?: Advance; deduplicationKey?: string; rowVersion?: string;
};
/** The answers to the questions of the API: the Owner agreed to the price of a line (by index) or to the discount. */
export type Decisions = { lines: ReadonlySet<number>; discount: boolean; duplicateReference?: boolean };

/** The first thing wrong with the form, in the user's words; undefined when it can be sent. */
export function validateForm(form: OrderForm, total: number): string | undefined {
  if (!form.customerId && !form.walkIn) return "Chọn khách hàng hoặc Khách lẻ.";
  if (!form.lines.length) return "Thêm ít nhất một dòng hàng.";
  for (const [index, line] of form.lines.entries()) {
    if (!parseQuantity(line.quantity)) return `Dòng ${index + 1}: nhập số lượng lớn hơn 0, tối đa 3 chữ số thập phân.`;
    if (line.unitPrice == null) return `Dòng ${index + 1}: nhập đơn giá.`;
  }
  const subtotal = orderTotals(form.lines.map((line) => ({ quantity: parseQuantity(line.quantity), unitPrice: line.unitPrice })), 0).subtotal;
  if (form.discount > subtotal) return "Giảm giá không được lớn hơn tổng tiền hàng.";
  if (form.advance && form.advance.amount > 0) {
    if (form.walkIn) return "Khách lẻ không có hồ sơ nên không nhận khách thanh toán trước.";
    if (form.advance.amount > total) return "Khách thanh toán không được lớn hơn khách cần trả.";
    if (form.advance.method === "OtherTransfer" && !form.advance.bankReference.trim()) return "Nhập mã giao dịch ngân hàng.";
    if (form.advance.method === "VietQr" && !form.advance.cashAccountId) return "Chọn tài khoản nhận tiền cho mã VietQR.";
  }
  return undefined;
}

/** The JSON body of a save; the API compares each price with the list price of the unit and asks (409) when the caller is not the Owner. */
export function buildOrderBody(form: OrderForm, decisions: Decisions) {
  const advance = form.advance && form.advance.amount > 0 ? {
    amount: form.advance.amount, method: form.advance.method, ...(decisions.duplicateReference ? { confirmDuplicateBankReference: true } : {}),
    ...(form.advance.method === "OtherTransfer" ? { bankReference: form.advance.bankReference.trim() } : {}),
    ...(form.advance.method !== "Cash" && form.advance.cashAccountId ? { cashAccountId: form.advance.cashAccountId } : {}),
  } : undefined;
  return {
    code: form.code.trim() || null, customerId: form.walkIn ? null : form.customerId || null, walkInCustomer: form.walkIn,
    ...(form.purchaseRequestId ? { purchaseRequestId: form.purchaseRequestId } : {}), source: form.source, receivedById: form.receivedById || null,
    orderedAt: form.orderedAt ? toInstant(form.orderedAt) : null, pickupAt: form.pickupAt ? toInstant(form.pickupAt) : null, note: form.note.trim() || null,
    discount: form.discount, discountDecidedByOwner: decisions.discount,
    lines: form.lines.map((line, index) => ({
      productId: line.productId, unitId: line.unitId, quantity: parseQuantity(line.quantity), unitPrice: line.unitPrice, priceDecidedByOwner: decisions.lines.has(index), note: line.note.trim() || null,
    })),
    ...(advance ? { advance } : {}), ...(form.deduplicationKey && !form.rowVersion ? { deduplicationKey: form.deduplicationKey } : {}),
    ...(form.rowVersion ? { rowVersion: form.rowVersion } : {}),
  };
}

/** The effect of the answer to a question of the API (field `lines[2].priceDecidedByOwner`, `discountDecidedByOwner` or `confirmDuplicateBankReference`) on the decisions. */
export function withAnswer(decisions: Decisions, field: string): Decisions {
  const line = /^lines\[(\d{1,3})\]\.priceDecidedByOwner$/.exec(field);
  if (line) return { ...decisions, lines: new Set([...decisions.lines, Number(line[1])]) };
  if (field === "discountDecidedByOwner") return { ...decisions, discount: true };
  if (field === "confirmDuplicateBankReference") return { ...decisions, duplicateReference: true };
  return decisions;
}

/** The unit price a line starts with: the list price of its unit, or the product's per-kg price times the factor when the unit has none. */
export const defaultPrice = (unit: { salePrice?: number | null; factor: number }, productPrice: number | null | undefined) =>
  unit.salePrice ?? (productPrice == null ? null : Math.round(productPrice * unit.factor));
