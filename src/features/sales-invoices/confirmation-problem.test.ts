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
