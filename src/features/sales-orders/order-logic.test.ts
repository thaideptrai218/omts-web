import { describe, expect, it } from "vitest";
import { buildOrderBody, daysUntilPickup, defaultPrice, lineAmount, orderTotals, parseQuantity, progressText, toInstant, validateForm, waitingText, withAnswer, type OrderForm } from "./order-logic";

const ids = { customer: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", product: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b01", unit: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b02" };
const form = (patch: Partial<OrderForm> = {}): OrderForm => ({
  code: "", customerId: ids.customer, walkIn: false, source: "Phone", receivedById: "", orderedAt: "2026-11-12T08:00", pickupAt: "", note: "", discount: 0,
  lines: [{ productId: ids.product, unitId: ids.unit, quantity: "2", unitPrice: 60000, listPrice: 60000, note: "" }], ...patch,
});

describe("order money", () => {
  it("rounds a line half up to the dong by the unit of the line", () => {
    expect(lineAmount(2, 60000)).toBe(120000);
    expect(lineAmount(0.5, 1001)).toBe(501);
    expect(lineAmount(1.333, 1000)).toBe(1333);
    expect(lineAmount(null, 1000)).toBe(0);
  });
  it("adds the lines and takes the discount off without going below zero", () => {
    expect(orderTotals([{ quantity: 2, unitPrice: 60000 }, { quantity: 3, unitPrice: 50000 }], 20000)).toEqual({ subtotal: 270000, discount: 20000, total: 250000 });
    expect(orderTotals([{ quantity: 1, unitPrice: 1000 }], 5000).total).toBe(0);
  });
  it("starts a line at the list price of its unit, or the per-kg price times the factor", () => {
    expect(defaultPrice({ salePrice: 900000, factor: 15 }, 60000)).toBe(900000);
    expect(defaultPrice({ salePrice: null, factor: 15 }, 60000)).toBe(900000);
    expect(defaultPrice({ salePrice: null, factor: 1 }, null)).toBeNull();
  });
});

describe("quantities and progress", () => {
  it("accepts a positive quantity with at most three decimals, comma or point", () => {
    expect(parseQuantity("2,5")).toBe(2.5);
    expect(parseQuantity("0.125")).toBe(0.125);
    for (const bad of ["", "0", "-1", "1.2345", "abc"]) expect(parseQuantity(bad)).toBeNull();
  });
  it("writes the progress per unit", () => {
    expect(progressText([{ unitId: "a", unitCode: "K", unitName: "kg", ordered: 50, delivered: 40 }, { unitId: "b", unitCode: "L", unitName: "Lồng", ordered: 2, delivered: 2 }])).toBe("40/50 kg · 2/2 Lồng");
    expect(progressText([])).toBe("—");
  });
  it("keeps the wall time at +07:00", () => { expect(toInstant("2026-11-12T08:30")).toBe("2026-11-12T08:30:00+07:00"); });
});

describe("order form", () => {
  it("names the first thing wrong", () => {
    expect(validateForm(form({ customerId: "" }), 120000)).toBe("Chọn khách hàng hoặc Khách lẻ.");
    expect(validateForm(form({ lines: [] }), 0)).toBe("Thêm ít nhất một dòng hàng.");
    expect(validateForm(form({ lines: [{ productId: ids.product, unitId: ids.unit, quantity: "", unitPrice: 1, listPrice: 1, note: "" }] }), 0)).toContain("Dòng 1");
    expect(validateForm(form({ discount: 999999 }), 0)).toBe("Giảm giá không được lớn hơn tổng tiền hàng.");
    expect(validateForm(form(), 120000)).toBeUndefined();
  });
  it("refuses an advance of a walk-in buyer, above the total, or a transfer without its reference", () => {
    const advance = { amount: 50000, method: "Cash" as const, bankReference: "", cashAccountId: "" };
    expect(validateForm(form({ customerId: "", walkIn: true, advance }), 120000)).toContain("Khách lẻ");
    expect(validateForm(form({ advance: { ...advance, amount: 200000 } }), 120000)).toContain("không được lớn hơn");
    expect(validateForm(form({ advance: { ...advance, method: "OtherTransfer" } }), 120000)).toContain("mã giao dịch");
    expect(validateForm(form({ advance: { ...advance, method: "VietQr" } }), 120000)).toContain("tài khoản");
    expect(validateForm(form({ advance }), 120000)).toBeUndefined();
  });
  it("builds the body: walk-in has no customer, the advance goes with create and update, the row version only on update", () => {
    const decisions = { lines: new Set<number>(), discount: false };
    const created = buildOrderBody(form({ advance: { amount: 50000, method: "OtherTransfer", bankReference: " FT123 ", cashAccountId: "" }, deduplicationKey: "k" }), decisions);
    expect(created).toMatchObject({ code: null, customerId: ids.customer, walkInCustomer: false, source: "Phone", advance: { amount: 50000, method: "OtherTransfer", bankReference: "FT123" }, deduplicationKey: "k" });
    expect(created.lines).toEqual([{ productId: ids.product, unitId: ids.unit, quantity: 2, unitPrice: 60000, priceDecidedByOwner: false, note: null }]);
    expect(created).not.toHaveProperty("rowVersion");
    const updated = buildOrderBody(form({ walkIn: true, customerId: "", rowVersion: "v1", advance: { amount: 1, method: "Cash", bankReference: "", cashAccountId: "" } }), decisions);
    expect(updated).toMatchObject({ customerId: null, walkInCustomer: true, rowVersion: "v1" });
    expect(updated).toMatchObject({ advance: { amount: 1, method: "Cash" } });
    expect(updated).not.toHaveProperty("deduplicationKey");
  });
  it("turns the Owner's answers into flags on the next send", () => {
    const first = withAnswer({ lines: new Set(), discount: false }, "lines[1].priceDecidedByOwner");
    const both = withAnswer(first, "discountDecidedByOwner");
    const body = buildOrderBody(form({ lines: [form().lines[0], form().lines[0]], discount: 1000 }), both);
    expect(body.lines.map((line) => line.priceDecidedByOwner)).toEqual([false, true]);
    expect(body.discountDecidedByOwner).toBe(true);
    expect(withAnswer(both, "wantsQrCode")).toBe(both);
  });
});

describe('Số ngày chờ: số ngày còn lại đến ngày hẹn lấy hàng', () => {
  const now = new Date('2026-11-12T10:00:00+07:00');
  it('đếm theo ngày lịch giờ Việt Nam, không theo giờ', () => {
    expect(daysUntilPickup('2026-11-14T08:30:00+07:00', 4101, now)).toBe(2);
    expect(daysUntilPickup('2026-11-12T23:59:00+07:00', 4102, now)).toBe(0);
    expect(daysUntilPickup('2026-11-12T00:00:00+07:00', 4102, now)).toBe(0);
    expect(daysUntilPickup('2026-11-13T00:30:00+07:00', 4101, new Date('2026-11-12T23:50:00+07:00'))).toBe(1);
    expect(daysUntilPickup('2026-11-10T08:00:00+07:00', 4101, now)).toBe(-2);
  });
  it('không có hẹn lấy hàng hoặc đơn đã đóng thì không có số', () => {
    expect(daysUntilPickup(null, 4101, now)).toBeNull();
    expect(daysUntilPickup('2026-11-14T08:30:00+07:00', 4103, now)).toBeNull();
    expect(daysUntilPickup('2026-11-14T08:30:00+07:00', 4104, now)).toBeNull();
    expect(daysUntilPickup('không phải ngày', 4101, now)).toBeNull();
  });
  it('hiển thị: số ngày, Quá N ngày khi đã quá hẹn, gạch ngang khi không có', () => {
    expect(waitingText(3)).toBe('3'); expect(waitingText(0)).toBe('0'); expect(waitingText(-2)).toBe('Quá 2 ngày'); expect(waitingText(null)).toBe('—');
  });
});
