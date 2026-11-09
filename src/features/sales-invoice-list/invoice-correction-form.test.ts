import { describe, expect, it } from "vitest";
import { buildCorrection, initialCorrection } from "./invoice-correction-form";
import { invoiceDetail } from "./invoice-list-contracts";
import { detail } from "./invoice-list-test-fixtures";

const invoice = invoiceDetail.parse(detail({}, true));
const problem = (result: ReturnType<typeof buildCorrection>) => ("problem" in result ? result.problem : undefined);

describe("dựng thân yêu cầu sửa hóa đơn", () => {
  it("bắt buộc lý do và chặn lần sửa không thay đổi gì", () => {
    expect(problem(buildCorrection(initialCorrection(invoice), invoice))).toMatch(/lý do/);
    expect(problem(buildCorrection({ ...initialCorrection(invoice), reason: "x" }, invoice))).toMatch(/Chưa có thay đổi/);
  });
  it("lỗi nhập liệu: gửi đủ dòng, giảm giá, thu khác và các lô chưa đánh dấu bán hết", () => {
    const form = initialCorrection(invoice);
    const result = buildCorrection({ ...form, reason: " Nhập sai kg ", lines: [{ ...form.lines[0], kg: "125,5" }], notWholeLots: [invoice.lines[0].harvestLotId] }, invoice);
    expect(result).toEqual({ fields: { kind: "DataEntryError", reason: "Nhập sai kg", discount: 0, otherCharges: 0, notSoldWholeLotIds: [invoice.lines[0].harvestLotId],
      lines: [{ productId: invoice.lines[0].productId, harvestLotId: invoice.lines[0].harvestLotId, kg: 125.5, unitPrice: 85_000 }] } });
  });
  it("kiểm tra kg, đơn giá, số dòng", () => {
    const form = { ...initialCorrection(invoice), reason: "x" };
    expect(problem(buildCorrection({ ...form, lines: [{ ...form.lines[0], kg: "0" }] }, invoice))).toMatch(/Dòng 1: số kg/);
    expect(problem(buildCorrection({ ...form, lines: [{ ...form.lines[0], kg: "1,2345" }] }, invoice))).toMatch(/3 chữ số/);
    expect(problem(buildCorrection({ ...form, lines: [{ ...form.lines[0], unitPrice: "abc" }] }, invoice))).toMatch(/đơn giá/);
    expect(problem(buildCorrection({ ...form, lines: [] }, invoice))).toMatch(/ít nhất một dòng/);
    expect(problem(buildCorrection({ ...form, discount: "-5", lines: form.lines.map((l) => ({ ...l, kg: "130" })) }, invoice))).toMatch(/Giảm giá và thu khác/);
  });
  it("giảm giá sau khiếu nại: chỉ gửi khoản giảm, không gửi dòng hàng", () => {
    const form = { ...initialCorrection(invoice), kind: "PriceCutAfterClaim" as const, reason: "Khiếu nại CL-01" };
    expect(buildCorrection({ ...form, cut: "50.000" }, invoice)).toEqual({ fields: { kind: "PriceCutAfterClaim", reason: "Khiếu nại CL-01", priceCutAmount: 50_000 } });
    expect(problem(buildCorrection({ ...form, cut: "0" }, invoice))).toMatch(/lớn hơn 0/);
    expect(problem(buildCorrection({ ...form, cut: "99.999.999" }, invoice))).toMatch(/lớn hơn tổng cộng/);
  });
});
