import { describe, expect, it } from "vitest";
import { buildRequest, emptyDraft, firstProblem, noAnswers, toKg, toMoney, totals, type Draft, type DraftLine } from "./invoice-draft";
import { answerPatch, projectInvoiceConfirmation } from "./confirmation-problem";
import { createInvoice } from "./contracts";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const lot = { id: id(1), lotCode: "B03-1", raftId: id(2), raftCode: "B03", zoneId: id(3), zoneCode: "VP01", zoneName: "VP01", harvestDate: "2026-10-26", remainingKg: 100, statusId: 1, status: "Open", originState: "NotPublished" as const, withdrawnAt: null };
const line = (over: Partial<DraftLine> = {}): DraftLine => ({ key: "a", lot, productId: id(9), kg: "10", unitPrice: "", ...over });
const price = () => 85_000;
const draft = (over: Partial<Draft> = {}): Draft => ({ ...emptyDraft, lines: [line()], cash: "850.000", ...over });

describe("đọc số", () => {
  it("kg nhận dấu phẩy hoặc chấm thập phân, không nhầm thành nghìn", () => {
    expect(toKg("1,5")).toBe(1.5); expect(toKg("1.5")).toBe(1.5); expect(toKg("")).toBe(0); expect(toKg("abc")).toBeNaN();
  });
  it("tiền nhận chấm nghìn kiểu Việt Nam và từ chối số lẻ", () => {
    expect(toMoney("1.250.000")).toBe(1_250_000); expect(toMoney("85 000")).toBe(85_000); expect(toMoney("1,5")).toBeNaN();
  });
});

describe("tổng tiền", () => {
  it("làm tròn nửa lên từng dòng như backend và tính phần còn lại", () => {
    const t = totals(draft({ lines: [line({ kg: "0,123", unitPrice: "85.000" })], cash: "10.000" }), price);
    expect(t.subtotal).toBe(10_455); expect(t.rest).toBe(455); expect(t.extra).toBe(0);
  });
  it("giảm giá và thu khác đi vào tổng, tiền thừa được tách ra", () => {
    const t = totals(draft({ discount: "50.000", otherCharges: "10.000", cash: "900.000" }), price);
    expect(t.total).toBe(810_000); expect(t.extra).toBe(90_000); expect(t.rest).toBe(0);
  });
});

describe("kiểm tra nhập liệu", () => {
  it("báo lỗi khi chưa chọn lô, kg sai, thiếu tiền mà không ghi nợ, khách lẻ ghi nợ", () => {
    const check = (d: Draft) => firstProblem(d, totals(d, price));
    expect(check({ ...emptyDraft })).toMatch(/ít nhất một lô/);
    expect(check(draft({ lines: [line({ kg: "1,2345" })] }))).toMatch(/3 chữ số/);
    expect(check(draft({ cash: "100.000" }))).toMatch(/ghi nợ/);
    expect(check(draft({ cash: "100.000", payLater: true, walkIn: true }))).toMatch(/Khách lẻ/);
    expect(check(draft())).toBeUndefined();
  });
});

describe("thân yêu cầu gửi backend", () => {
  it("khớp hợp đồng và chỉ gửi cờ Chủ HTX khi đơn giá khác bảng giá", () => {
    const d = draft({ lines: [line({ unitPrice: "80.000" }), line({ key: "b" })], cash: "0", payLater: true, walkIn: false, customer: { id: id(5), name: "A", phoneNumber: null } });
    const body = buildRequest(d, { ...noAnswers, priceLines: new Set([0]), payLater: true }, id(7), price);
    expect(createInvoice.safeParse(body).success).toBe(true);
    expect(body.lines[0]).toMatchObject({ unitPrice: 80_000, priceDecidedByOwner: true });
    expect(body.lines[1]).not.toHaveProperty("unitPrice");
    expect(body.payment).toMatchObject({ rest: "PayLater", payLaterOwnerAgreed: true });
  });
  it("khách lẻ không có customerId", () => {
    expect(buildRequest(draft(), noAnswers, id(7), price)).toMatchObject({ walkInCustomer: true, customerId: null, payment: { rest: "None", cashAmount: 850_000 } });
  });
});

describe("thanh toán VietQR", () => {
  it("cho VietQR khi còn tiền chưa thu, kể cả khách lẻ và không cần tick ghi nợ", () => {
    const d = draft({ cash: "100.000", walkIn: true });
    expect(firstProblem(d, totals(d, price), "vietQr")).toBeUndefined();
    expect(firstProblem(d, totals(d, price))).toMatch(/VietQR/); // thanh toán thường vẫn bị chặn và gợi ý VietQR
  });
  it("không cho VietQR khi tiền mặt đã đủ, nhưng vẫn kiểm tra các lỗi nhập liệu khác", () => {
    expect(firstProblem(draft(), totals(draft(), price), "vietQr")).toMatch(/Không còn số tiền/);
    const empty = { ...emptyDraft }, none = firstProblem(empty, totals(empty, price), "vietQr");
    expect(none).toMatch(/ít nhất một lô/);
    const bad = draft({ lines: [line({ kg: "0" })], cash: "0" });
    expect(firstProblem(bad, totals(bad, price), "vietQr")).toMatch(/số kg/);
  });
  it("thân yêu cầu VietQR: rest VietQr, tiền mặt phần đã thu, không gửi cờ ghi nợ/trừ nợ cũ", () => {
    const d = draft({ cash: "100.000", payLater: true });
    const body = buildRequest(d, { ...noAnswers, payLater: true, subtract: true }, id(7), price, "vietQr");
    expect(createInvoice.safeParse(body).success).toBe(true);
    expect(body.payment).toEqual({ cashAmount: 100_000, rest: "VietQr", subtractExtraFromDebt: null, payLaterOwnerAgreed: false });
  });
});

describe("câu hỏi xác nhận 409", () => {
  it("chỉ cho qua tên trường trong danh sách và các con số", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "payment.payLaterOwnerAgreed", laterAmount: 5, debtAmount: 9, detail: "bỏ qua" })).toEqual({ field: "payment.payLaterOwnerAgreed", laterAmount: 5, debtAmount: 9 });
    expect(projectInvoiceConfirmation(409, { confirmationField: "lines[2].priceDecidedByOwner", lineNumber: 3 })?.field).toBe("lines[2].priceDecidedByOwner");
    expect(projectInvoiceConfirmation(409, { confirmationField: "__proto__.x" })).toBeUndefined();
    expect(projectInvoiceConfirmation(400, { confirmationField: "wantsQrCode" })).toBeUndefined();
  });
  it("nhận ra loại câu hỏi", () => {
    expect(answerPatch("lines[2].priceDecidedByOwner")).toEqual({ kind: "line", index: 2 });
    expect(answerPatch("payment.subtractExtraFromDebt")).toEqual({ kind: "subtract" });
    expect(answerPatch("khac")).toBeUndefined();
  });
});
