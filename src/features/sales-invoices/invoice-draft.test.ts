import { describe, expect, it } from "vitest";
import { toKg, toMoney } from "./invoice-draft";
import { answerPatch, projectInvoiceConfirmation } from "./confirmation-problem";

describe("đọc số", () => {
  it("kg nhận dấu phẩy hoặc chấm thập phân, không nhầm thành nghìn", () => {
    expect(toKg("1,5")).toBe(1.5); expect(toKg("1.5")).toBe(1.5); expect(toKg("")).toBe(0); expect(toKg("abc")).toBeNaN();
  });
  it("tiền nhận chấm nghìn kiểu Việt Nam và từ chối số lẻ", () => {
    expect(toMoney("1.250.000")).toBe(1_250_000); expect(toMoney("85 000")).toBe(85_000); expect(toMoney("1,5")).toBeNaN();
  });
});

describe("câu hỏi xác nhận 409", () => {
  it("chỉ cho qua tên trường trong danh sách và các con số", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "payment.payLaterOwnerAgreed", laterAmount: 5, debtAmount: 9, detail: "bỏ qua" })).toEqual({ field: "payment.payLaterOwnerAgreed", laterAmount: 5, debtAmount: 9 });
    expect(projectInvoiceConfirmation(409, { confirmationField: "lines[2].priceDecidedByOwner", lineNumber: 3 })?.field).toBe("lines[2].priceDecidedByOwner");
    expect(projectInvoiceConfirmation(409, { confirmationField: "__proto__.x" })).toBeUndefined();
    expect(projectInvoiceConfirmation(400, { confirmationField: "wantsQrCode" })).toBeUndefined();
  });
  it("nhận ra loại câu hỏi, kể cả câu hỏi hợp tác xã nợ lại khách khi sửa hóa đơn", () => {
    expect(answerPatch("lines[2].priceDecidedByOwner")).toEqual({ kind: "line", index: 2 });
    expect(answerPatch("payment.subtractExtraFromDebt")).toEqual({ kind: "subtract" });
    expect(answerPatch("confirmOwedBack")).toEqual({ kind: "owedBack" });
    expect(answerPatch("khac")).toBeUndefined();
  });
});
