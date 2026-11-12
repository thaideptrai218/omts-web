import { describe, expect, it } from "vitest";
import type { LotForSale } from "@/features/sales-invoices/contracts";
import { invoiceDraft, type DraftLine } from "./contracts";
import {
  buildCreateBody, buildUpdateBody, discountShare, firstProblem, invoiceTotals, lineFromDraft, lineMoney, lotOptions, noAnswers, withAnswer, withQuantity,
  type EditorLine, type Form,
} from "./invoice-editor-logic";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const lot = (n: number, over: Partial<LotForSale> = {}): LotForSale => ({
  id: id(n), lotCode: `B0${n}-1`, raftId: id(90), raftCode: "B0", zoneId: id(91), zoneCode: "VP01", zoneName: "Vùng", harvestDate: "2026-11-01", remainingKg: 100, statusId: 1, status: "Open", originState: "NotPublished", withdrawnAt: null, ...over,
});
const kgLine: DraftLine = { salesOrderLineId: id(11), productId: id(1), productCode: "SP1", productName: "Hàu sữa", unitId: id(21), unitCode: "K", unitName: "kg", factor: 1, orderedQuantity: 100, deliveredQuantity: 40, quantity: 60, unitPrice: 50_000, listPrice: 52_000, suggestedLotId: id(31), suggestedLotCode: "B01-1", suggestedByPlan: true };
const cageLine: DraftLine = { salesOrderLineId: id(12), productId: id(2), productCode: "SP2", productName: "Hàu lồng", unitId: id(22), unitCode: "L", unitName: "Lồng", factor: 15, orderedQuantity: 2, deliveredQuantity: 0, quantity: 2, unitPrice: 1_200_000, listPrice: null };
const kg = (over: Partial<EditorLine> = {}) => ({ ...lineFromDraft(kgLine, "a", []), ...over });
const cage = (over: Partial<EditorLine> = {}) => ({ ...lineFromDraft(cageLine, "b", []), lotId: id(32), lotCode: "B02-1", kg: "28,5", ...over });
const form = (over: Partial<Form> = {}): Form => ({ lines: [kg(), cage()], code: "", note: "", discount: 0, otherCharges: 0, cash: 0, payLater: false, notWholeLots: new Set(), walkIn: false, ...over });

describe("tiền theo đơn vị của dòng", () => {
  it("dòng kg: kg × giá/kg; dòng Lồng: số lượng × giá/lồng, kg cân không đổi tiền", () => {
    expect(lineMoney(kg())).toBe(60 * 50_000);
    expect(lineMoney(cage())).toBe(2 * 1_200_000);
    expect(lineMoney(cage({ quantity: "1,5" }))).toBe(1_800_000);
    expect(lineMoney(cage({ kg: "99" }))).toBe(2_400_000);
  });
  it("làm tròn nửa lên theo đồng", () => {
    expect(lineMoney(kg({ kg: "0,5", quantity: "0,5", unitPrice: 33_333 }))).toBe(16_667);
  });
  it("dòng kg: gõ số lượng là gõ cả kg cân; dòng đơn vị khác thì hai ô độc lập", () => {
    expect(withQuantity(kg(), "75")).toMatchObject({ quantity: "75", kg: "75" });
    expect(withQuantity(cage(), "3")).toMatchObject({ quantity: "3", kg: "28,5" });
  });
  it("dòng từ đơn: số còn lại, giá và đơn vị của dòng đơn, lô gợi ý đầu tiên đã chọn; dòng đã đủ để trống số lượng", () => {
    expect(kg()).toMatchObject({ quantity: "60", kg: "60", unitPrice: 50_000, referencePrice: 50_000, lotId: id(31), orderLineId: id(11), ordered: 100, delivered: 40 });
    expect(lineFromDraft({ ...cageLine, deliveredQuantity: 2, quantity: 0 }, "c", [])).toMatchObject({ quantity: "", kg: "", unitName: "Lồng", lotId: "" });
  });
});

describe("giảm giá chia theo tỷ lệ tiền hàng", () => {
  // The draft proposes 72.973 of the 100.000 discount for the 5.400.000 of goods it lists.
  const draft = { orderDiscount: 100_000, discountShare: 72_973, subtotal: 5_400_000 };
  it("giữ đúng phần backend đề xuất khi số lượng không đổi", () => expect(discountShare(draft, 5_400_000)).toBe(72_973));
  it("theo tỷ lệ tiền hàng khi đổi số lượng: 3.000.000 nhận 40.541", () => expect(discountShare(draft, 3_000_000)).toBe(40_541));
  it("không vượt giảm giá của đơn", () => expect(discountShare(draft, 9_000_000)).toBe(100_000));
  it("không có giảm giá, hóa đơn rỗng hoặc đề xuất rỗng thì bằng 0; số lớn không mất chữ số", () => {
    expect(discountShare({ ...draft, discountShare: 0 }, 3_000_000)).toBe(0);
    expect(discountShare(draft, 0)).toBe(0);
    expect(discountShare({ ...draft, subtotal: 0 }, 3_000_000)).toBe(0);
    expect(discountShare({ orderDiscount: 999_999_999_999, discountShare: 999_999_999_999, subtotal: 999_999_999_999 }, 999_999_999_998)).toBe(999_999_999_998);
  });
});

describe("tổng tiền, tiền ứng và phần còn lại", () => {
  const input = { lines: [kg({ kg: "60", quantity: "60" })], discount: 40_541, otherCharges: 0, advanceLeft: 500_000, cash: 0 };
  it("tiền ứng của đơn tự trừ vào hóa đơn", () => {
    expect(invoiceTotals(input)).toMatchObject({ subtotal: 3_000_000, total: 2_959_459, advance: 500_000, due: 2_459_459, rest: 2_459_459, extra: 0 });
  });
  it("tiền mặt trả bớt phần còn lại; dư thì tách ra", () => {
    expect(invoiceTotals({ ...input, cash: 1_000_000 })).toMatchObject({ rest: 1_459_459, extra: 0 });
    expect(invoiceTotals({ ...input, cash: 3_000_000 })).toMatchObject({ rest: 0, extra: 540_541 });
  });
  it("tiền ứng không vượt tổng hóa đơn; dòng bỏ trống không tính; chi phí khác cộng vào", () => {
    expect(invoiceTotals({ ...input, advanceLeft: 9_000_000 })).toMatchObject({ advance: 2_959_459, due: 0, rest: 0 });
    expect(invoiceTotals({ ...input, lines: [...input.lines, cage({ quantity: "", kg: "" })], otherCharges: 10_000 }).total).toBe(2_969_459);
  });
});

describe("lô thu hoạch được gợi ý", () => {
  const lots = [lot(30), lot(31, { harvestPlanCode: "KHT000001", suggested: true }), lot(32, { products: [{ productId: id(2), productCode: "SP2", productName: "x", harvestedKg: 10, remainingKg: 10 }] }),
    lot(33, { suggested: true, harvestPlanCode: "KHT000002", products: [{ productId: id(1), productCode: "SP1", productName: "y", harvestedKg: 10, remainingKg: 10 }] })];
  it("lô của kế hoạch phục vụ đơn đứng đầu, kèm mã kế hoạch; các lô khác vẫn chọn được", () => {
    const options = lotOptions(kg(), lots);
    expect(options.map((o) => o.id)).toEqual([id(31), id(33), id(30)]);
    expect(options[0]).toMatchObject({ suggested: true, planCode: "KHT000001" });
    expect(options[2]).toMatchObject({ suggested: false, planCode: null });
  });
  it("chỉ lô có sản phẩm đó (lô chưa tách theo sản phẩm bán được mọi sản phẩm)", () => {
    expect(lotOptions(cage({ lotId: "" }), lots).map((o) => o.id)).toEqual([id(31), id(30), id(32)]);
  });
  it("lô đã nằm trên dòng nhưng không còn trong danh sách bán vẫn hiện", () => {
    const options = lotOptions(kg({ lotId: id(77), lotCode: "CU-1" }), [lot(30)]);
    expect(options.find((o) => o.id === id(77))).toMatchObject({ code: "CU-1", lot: null });
    expect(lotOptions(kg(), [lot(30)]).map((o) => o.id)).toEqual([id(30), id(31)]);
  });
});

describe("kiểm tra nhập liệu", () => {
  const totalsOf = (f: Form, advanceLeft = 0) => invoiceTotals({ lines: f.lines, discount: f.discount, otherCharges: f.otherCharges, advanceLeft, cash: f.cash });
  const problem = (f: Form, mode: "standard" | "vietQr" = "standard", payment = true, advanceLeft = 0) => firstProblem(f, totalsOf(f, advanceLeft), { payment, mode });
  const paid = (over: Partial<Form> = {}) => form({ cash: 3_000_000 + 2_400_000, ...over });
  it("hợp lệ khi có đủ lô, kg cân, giá và tiền", () => expect(problem(paid())).toBeUndefined());
  it("cần ít nhất một dòng có số lượng", () => expect(problem(form({ lines: [kg({ kg: "", quantity: "" })] }))).toMatch(/ít nhất một dòng/));
  it("mỗi dòng cần lô, kg cân và đơn giá; dòng Lồng bắt buộc kg cân", () => {
    expect(problem(paid({ lines: [kg({ lotId: "" })] }))).toMatch(/Dòng 1: chọn lô/);
    expect(problem(paid({ lines: [cage({ kg: "" })] }))).toMatch(/Dòng 1: nhập số kg cân/);
    expect(problem(paid({ lines: [cage({ kg: "1,2345" })] }))).toMatch(/3 chữ số/);
    expect(problem(paid({ lines: [kg({ unitPrice: null })] }))).toMatch(/đơn giá/);
    expect(problem(paid({ lines: [cage({ quantity: "0" })] }))).toMatch(/số lượng/);
  });
  it("mã hóa đơn đúng dạng; VietQR giới hạn 25 ký tự", () => {
    expect(problem(paid({ code: "HD 1" }))).toMatch(/Mã hóa đơn/);
    expect(problem(form({ code: "A".repeat(26) }), "vietQr")).toMatch(/25/);
    expect(problem(paid({ code: "A".repeat(26) }))).toBeUndefined();
  });
  it("giảm giá không lớn hơn tiền hàng", () => expect(problem(paid({ discount: 9_000_000 }))).toMatch(/Giảm giá/));
  it("còn lại phải trả sau (khách có hồ sơ) hoặc VietQR; khách lẻ không trả sau", () => {
    expect(problem(form())).toMatch(/Trả sau/);
    expect(problem(form({ payLater: true }))).toBeUndefined();
    expect(problem(form({ payLater: true, walkIn: true }))).toMatch(/Khách lẻ/);
    expect(problem(form(), "vietQr")).toBeUndefined();
    expect(problem(paid(), "vietQr")).toMatch(/Không còn số tiền/);
  });
  it("tiền ứng đủ thì không cần tiền mặt", () => expect(problem(form(), "standard", true, 9_000_000)).toBeUndefined());
  it("sửa hóa đơn không kiểm tra thanh toán", () => expect(problem(form(), "standard", false)).toBeUndefined());
});

describe("thân yêu cầu", () => {
  const totals = (f: Form) => invoiceTotals({ lines: f.lines, discount: f.discount, otherCharges: f.otherCharges, advanceLeft: 0, cash: f.cash });
  it("lập hóa đơn: dòng kg không gửi số lượng, dòng Lồng gửi đơn vị và số lượng, luôn gửi kg cân và dòng đơn", () => {
    const f = form({ cash: 5_400_000, discount: 40_541 });
    expect(buildCreateBody(id(50), f, noAnswers, totals(f), id(60))).toEqual({
      salesOrderId: id(50), code: null, note: null, discount: 40_541, discountDecidedByOwner: false, otherCharges: null, notSoldWholeLotIds: [], deduplicationKey: id(60),
      lines: [
        { productId: id(1), harvestLotId: id(31), kg: 60, salesOrderLineId: id(11), unitId: id(21), unitPrice: 50_000 },
        { productId: id(2), harvestLotId: id(32), kg: 28.5, salesOrderLineId: id(12), unitId: id(22), quantity: 2, unitPrice: 1_200_000 },
      ],
      payment: { cashAmount: 5_400_000, rest: "None", subtractExtraFromDebt: null, payLaterOwnerAgreed: false },
    });
  });
  it("bỏ qua dòng không có số lượng; lô không đánh dấu bán hết được liệt kê", () => {
    const f = form({ lines: [kg(), cage({ quantity: "", kg: "" })], notWholeLots: new Set([id(31), id(99)]) });
    const body = buildCreateBody(id(50), f, noAnswers, totals(f), id(60));
    expect(body.lines).toHaveLength(1);
    expect(body.notSoldWholeLotIds).toEqual([id(31)]);
  });
  it("giá khác giá đã định mang cờ Chủ HTX theo vị trí dòng đã gửi, chỉ khi đã trả lời", () => {
    const f = form({ lines: [kg({ quantity: "", kg: "" }), cage({ unitPrice: 1_100_000 })] });
    expect(buildCreateBody(id(50), f, noAnswers, totals(f), id(60)).lines[0]).toMatchObject({ unitPrice: 1_100_000, priceDecidedByOwner: false });
    expect(buildCreateBody(id(50), f, withAnswer(noAnswers, { kind: "line", index: 0 }, true), totals(f), id(60)).lines[0].priceDecidedByOwner).toBe(true);
    expect("priceDecidedByOwner" in buildCreateBody(id(50), form(), noAnswers, totals(form()), id(60)).lines[0]).toBe(false);
  });
  it("trả sau và VietQR", () => {
    const f = form({ cash: 1_000_000, payLater: true }), t = totals(f);
    expect(buildCreateBody(id(50), f, withAnswer(noAnswers, { kind: "payLater" }, true), t, id(60)).payment).toEqual({ cashAmount: 1_000_000, rest: "PayLater", subtractExtraFromDebt: null, payLaterOwnerAgreed: true });
    expect(buildCreateBody(id(50), f, noAnswers, t, id(60), "vietQr").payment).toEqual({ cashAmount: 1_000_000, rest: "VietQr", subtractExtraFromDebt: null, payLaterOwnerAgreed: false });
    expect(buildCreateBody(id(50), form({ cash: 6_000_000 }), withAnswer(noAnswers, { kind: "subtract" }, false), totals(form({ cash: 6_000_000 })), id(60)).payment.subtractExtraFromDebt).toBe(false);
  });
  it("sửa hóa đơn: gửi lại toàn bộ nội dung với rowVersion, không có đơn hàng và thanh toán; dòng cũ không có đơn vị giữ tính theo kg", () => {
    const old = kg({ unitId: null, orderLineId: null, lineId: "x" }), f = form({ lines: [old], code: " HD000009 ", note: " ghi chú " });
    const body = buildUpdateBody("AAAA", f, withAnswer(noAnswers, { kind: "owedBack" }, true), totals(f));
    expect(body).toEqual({ code: "HD000009", note: "ghi chú", rowVersion: "AAAA", confirmOwedBack: true, discount: 0, discountDecidedByOwner: false, otherCharges: 0, notSoldWholeLotIds: [],
      lines: [{ productId: id(1), harvestLotId: id(31), kg: 60, unitPrice: 50_000 }] });
    expect(buildUpdateBody("AAAA", form(), noAnswers, totals(form())).lines[0]).toMatchObject({ unitId: id(21), salesOrderLineId: id(11) });
    expect("confirmOwedBack" in buildUpdateBody("AAAA", f, noAnswers, totals(f))).toBe(false);
    // The API keeps what is left out: clearing the note, the discount and the other charges must be sent as "" and 0.
    expect(buildUpdateBody("AAAA", form({ note: "  " }), noAnswers, totals(form()))).toMatchObject({ note: "", discount: 0, otherCharges: 0 });
  });
  it("hợp đồng của form xử lý đặt hàng khớp phản hồi của backend, dòng đã đủ không có lô gợi ý", () => {
    const draft = invoiceDraft.parse({
      order: { id: id(50), code: "DH000001", statusId: 4101, status: "Draft", canFinish: false }, zone: { id: id(91), code: "VP01", name: "V" }, customer: null, walkInCustomer: true,
      lines: [{ salesOrderLineId: id(11), lineNumber: 1, productId: id(1), productCode: "SP1", productName: "H", unitId: id(21), unitCode: "K", unitName: "kg", factor: 1, orderedQuantity: 1, deliveredQuantity: 1, quantity: 0, unitPrice: 5, listPrice: 5, amount: 0,
        suggestedLotId: null, suggestedLotCode: null, suggestedByPlan: false }],
      subtotal: 0, orderDiscount: 0, discountShare: 0, total: 0, advanceLeft: 0, advanceUse: 0, nextCode: "HD000002",
    });
    expect(draft).toMatchObject({ advanceLeft: 0, nextCode: "HD000002" });
    expect(lineFromDraft(draft.lines[0], "k", [])).toMatchObject({ quantity: "", lotId: "" });
    expect(invoiceDraft.safeParse({ ...draft, lines: [{ ...draft.lines[0], unitId: "x" }] }).success).toBe(false);
  });
});
