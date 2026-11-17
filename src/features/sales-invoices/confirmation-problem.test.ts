import { describe, expect, it } from "vitest";
import { projectInvoiceConfirmation } from "./confirmation-problem";

const guid = "00000000-0000-4000-8000-000000000009";

describe("câu hỏi xác nhận khi sửa / hủy hóa đơn (nhánh OMTS-224)", () => {
  it("giữ confirmOwedBack với số tiền và bỏ tên khách", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "confirmOwedBack", customerName: "Nguyễn Văn A", owedBackAmount: 120000 })).toEqual({ field: "confirmOwedBack", owedBackAmount: 120000 });
  });
  it("giữ customerId (khách lẻ cần hồ sơ) với số tiền cần trả lại", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "customerId", owedBackAmount: 50000 })).toEqual({ field: "customerId", owedBackAmount: 50000 });
  });
  it("giữ cashGivenBack kèm paymentId, số tiền và ngày", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "cashGivenBack", paymentId: guid, amount: 300000, paymentDate: "2026-11-02", message: "Did the Zone Manager..." }))
      .toEqual({ field: "cashGivenBack", paymentId: guid, amount: 300000, paymentDate: "2026-11-02" });
  });
  it("từ chối paymentId không phải GUID, tên trường lạ và trạng thái khác 409", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "cashGivenBack", paymentId: "x" })).toBeUndefined();
    expect(projectInvoiceConfirmation(409, { confirmationField: "somethingElse" })).toBeUndefined();
    expect(projectInvoiceConfirmation(400, { confirmationField: "confirmOwedBack" })).toBeUndefined();
  });
});

describe("câu hỏi xác nhận khi trả hàng bán (CLAIM-03)", () => {
  it("giữ ownerAgreed kèm giá trị phiếu trả", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "ownerAgreed", returnValue: 4250000, title: "x" })).toEqual({ field: "ownerAgreed", returnValue: 4250000 });
  });
  it("giữ thrownAwayLots kèm lô, số kg hủy và số kg còn lại", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "thrownAwayLots", harvestLotId: guid, lotCode: "LTH000008", discardedKg: 20, remainingKg: 40.5 }))
      .toEqual({ field: "thrownAwayLots", harvestLotId: guid, lotCode: "LTH000008", discardedKg: 20, remainingKg: 40.5 });
  });
  it("giữ confirmNegativeRemaining kèm các lô sẽ âm kho", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "confirmNegativeRemaining", lots: [{ lotCode: "LTH000007", remainingKg: -18, extra: 1 }] }))
      .toEqual({ field: "confirmNegativeRemaining", lots: [{ lotCode: "LTH000007", remainingKg: -18 }] });
  });
  it("từ chối mã lô lạ, GUID sai, số kg không hợp lệ", () => {
    expect(projectInvoiceConfirmation(409, { confirmationField: "thrownAwayLots", harvestLotId: "x", lotCode: "LTH1" })).toBeUndefined();
    expect(projectInvoiceConfirmation(409, { confirmationField: "thrownAwayLots", harvestLotId: guid, lotCode: "<script>" })).toBeUndefined();
    expect(projectInvoiceConfirmation(409, { confirmationField: "confirmNegativeRemaining", lots: [{ lotCode: "L1", remainingKg: "-1" }] })).toBeUndefined();
    expect(projectInvoiceConfirmation(409, { confirmationField: "ownerAgreed", returnValue: -5 })).toBeUndefined();
  });
});
