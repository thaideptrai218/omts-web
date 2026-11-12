import { describe, expect, it } from "vitest";
import { buildCorrection, initialCorrection } from "./invoice-correction-form";
import { invoiceDetail } from "./invoice-list-contracts";
import { detail } from "./invoice-list-test-fixtures";

const invoice = invoiceDetail.parse(detail({}, true));
const problem = (result: ReturnType<typeof buildCorrection>) => ("problem" in result ? result.problem : undefined);

describe("dựng thân yêu cầu giảm giá sau khiếu nại", () => {
  it("bắt buộc lý do", () => {
    expect(problem(buildCorrection({ ...initialCorrection(), cut: "1000" }, invoice))).toMatch(/lý do/);
    expect(problem(buildCorrection({ reason: "x".repeat(501), cut: "1000" }, invoice))).toMatch(/500/);
  });
  it("chỉ gửi khoản giảm, không gửi dòng hàng", () => {
    const form = { reason: " Khiếu nại CL-01 ", cut: "50.000" };
    expect(buildCorrection(form, invoice)).toEqual({ fields: { kind: "PriceCutAfterClaim", reason: "Khiếu nại CL-01", priceCutAmount: 50_000 } });
  });
  it("khoản giảm phải lớn hơn 0 và không vượt tổng cộng", () => {
    const form = { reason: "x", cut: "0" };
    expect(problem(buildCorrection(form, invoice))).toMatch(/lớn hơn 0/);
    expect(problem(buildCorrection({ ...form, cut: "abc" }, invoice))).toMatch(/lớn hơn 0/);
    expect(problem(buildCorrection({ ...form, cut: "99.999.999" }, invoice))).toMatch(/lớn hơn tổng cộng/);
  });
});
