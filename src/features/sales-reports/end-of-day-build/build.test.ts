import { describe, expect, it } from "vitest";
import { endOfDayReport, type EndOfDayReport } from "../end-of-day-contracts";
import { buildPaperHead } from "../end-of-day-head";
import { defaultFilters } from "../end-of-day-filters-model";
import { allOpen, flipOpen, setAllOpen, stampText, visibleRows } from "../end-of-day-model";
import { buildDocument, isReportEmpty } from "./index";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const emptyFilters = { zones: [], customers: [], products: [], categories: [], people: [], receivedBy: [], createdBy: [], types: [], paymentMethods: [], channels: [], paymentTerms: [], funds: [], sources: [], partyKinds: [] };
const base = { computedAt: "2026-11-19T10:05:00+07:00", from: "2026-11-19T00:00", to: "2026-11-19T23:59", message: null, messageCode: null, filters: emptyFilters };
const parse = (value: unknown) => endOfDayReport.parse(value);
const row = (n: number, extra = {}) => ({ id: id(n), code: `HD00000${n}`, at: "2026-11-19T09:15:00+07:00", customer: n % 2 ? { id: id(90), name: "Thương lái An" } : null, zoneName: "Vùng 1", quantityKg: 10, revenue: 1_000_000, discount: 50_000, otherCharges: 0, paid: 400_000, debt: 550_000, ...extra });
const figures = { quantityKg: 20, revenue: 2_000_000, discount: 100_000, otherCharges: 0, paid: 800_000, debt: 1_100_000 };

const sales = parse({
  ...base, concern: "sales",
  sales: {
    groups: [
      { kind: "Return", count: 1, ...figures, quantityKg: -2, revenue: -100_000, rows: [row(5, { code: "TL000001", quantityKg: -2, revenue: -100_000 })] },
      { kind: "Invoice", count: 2, ...figures, rows: [row(1), row(2)] },
      { kind: "Order", count: 0, ...figures, rows: [] },
    ],
    totals: { quantityKg: 18, revenue: 1_900_000, discount: 100_000, otherCharges: 0, paid: 800_000, debt: 1_100_000, netRevenue: 1_800_000 },
  },
});

describe("Bán hàng", () => {
  it("sắp nhóm Đặt hàng, Hóa đơn, Trả hàng; nhóm có dòng bấm ⊞/⊟ được, nhóm rỗng thì không", () => {
    const [table] = buildDocument(sales).tables;
    expect(table.rows.filter((r) => r.role === "group").map((r) => [r.cells[0].text, !!r.toggle])).toEqual([["Đặt hàng (0)", false], ["Hóa đơn (2)", true], ["Trả hàng (1)", true]]);
    expect(table.rows.map((r) => r.key).filter((key) => key.startsWith("sales:Invoice:"))).toHaveLength(2);
  });
  it("mã chứng từ là link bằng mã (hóa đơn, trả hàng); khách trống là Khách lẻ; thời gian dd/mm/yyyy HH:mm", () => {
    const rows = buildDocument(sales).tables[0].rows;
    const invoice = rows.find((r) => r.key.endsWith(id(1)))!, retail = rows.find((r) => r.key.endsWith(id(2)))!, back = rows.find((r) => r.cells[0].text === "TL000001")!;
    expect(invoice.cells[0]).toEqual({ text: "HD000001", href: "/operations/sales-invoice-list?code=HD000001" });
    expect(back.cells[0].href).toBe("/operations/sales-returns?code=TL000001");
    expect(invoice.cells[1].text).toBe("19/11/2026 09:15");
    expect(invoice.cells[2].text).toBe("Thương lái An");
    expect(retail.cells[2].text).toBe("Khách lẻ");
  });
  it("dòng tổng dùng totals của backend và ghi chú nói rõ Đặt hàng không cộng doanh thu", () => {
    const doc = buildDocument(sales);
    expect(doc.tables[0].total?.map((c) => c.text)).toEqual(["Tổng cộng", "", "", "", "18", "1.900.000", "100.000", "0", "800.000", "1.100.000"]);
    expect(doc.note).toMatch(/không cộng vào doanh thu/);
    expect(doc.tiles.find((t) => t.label === "Doanh thu")?.value).toBe("1.900.000 ₫");
  });
  it("đóng nhóm ẩn các dòng của nhóm đó", () => {
    const doc = buildDocument(sales), [table] = doc.tables;
    expect(visibleRows(table, {})).toHaveLength(table.rows.length);
    const closed = flipOpen(doc, {}, "sales:Invoice");
    expect(closed).toEqual({ "sales:Invoice": false });
    expect(visibleRows(table, closed).filter((r) => r.role === "item")).toHaveLength(1);
    expect(flipOpen(doc, closed, "sales:Invoice")).toEqual({ "sales:Invoice": true });
  });
});

const goods = parse({
  ...base, concern: "goods",
  goods: {
    products: [
      { productId: id(1), code: "SP000001", name: "Hàu sữa", unit: "kg", soldKg: 30, revenue: 3_000_000, returnedKg: 2, returnValue: 200_000, netRevenue: 2_800_000,
        details: [{ documentId: id(11), code: "HD000011", kind: "Invoice", at: "2026-11-19T09:00:00+07:00", customerName: "Thương lái An", kg: 30, value: 3_000_000 }, { documentId: id(12), code: "TL000012", kind: "Return", at: "2026-11-19T11:00:00+07:00", customerName: null, kg: 2, value: 200_000 }] },
      { productId: id(2), code: null, name: "Hàu béo", unit: "kg", soldKg: 5, revenue: 600_000, returnedKg: 0, returnValue: 0, netRevenue: 600_000, details: [] },
    ],
    totals: { soldKg: 35, revenue: 3_600_000, returnedKg: 2, returnValue: 200_000, netRevenue: 3_400_000, lotCount: 1, weighedKg: 120.5 },
    lots: [{ id: id(21), lotCode: "LO000001", zoneName: "Vùng 1", weighedKg: 120.5, weighedAt: "2026-11-19T06:30:00+07:00" }],
  },
});

describe("Hàng hóa", () => {
  it("sản phẩm có chi tiết đóng sẵn, mở ra thấy hóa đơn và phiếu trả của sản phẩm", () => {
    const doc = buildDocument(goods), [products] = doc.tables;
    expect(products.rows.filter((r) => r.toggle).map((r) => r.key)).toEqual([`goods:${id(1)}`]);
    expect(visibleRows(products, {}).map((r) => r.role)).toEqual(["item", "item"]);
    const open = flipOpen(doc, {}, `goods:${id(1)}`);
    expect(visibleRows(products, open).map((r) => r.role)).toEqual(["item", "detail", "detail", "item"]);
    const detail = visibleRows(products, open)[1];
    expect(detail.cells[0]).toEqual({ text: "HD000011", href: "/operations/sales-invoice-list?code=HD000011" });
    expect(visibleRows(products, open)[2].cells[0].href).toBe("/operations/sales-returns?code=TL000012");
    expect(detail.cells[3].text).toBe("30");
  });
  it("mã hàng là link tới sản phẩm; hàng không có mã hiện gạch; dòng tổng cộng đúng", () => {
    const [products, lots] = buildDocument(goods).tables;
    expect(products.rows[0].cells[0]).toMatchObject({ text: "SP000001", href: "/sales/products?code=SP000001" });
    expect(products.rows.find((r) => r.key === `goods:${id(2)}`)?.cells[0].text).toBe("—");
    expect(products.total?.map((c) => c.text)).toEqual(["Tổng cộng", "", "", "35", "3.600.000", "2", "200.000", "3.400.000"]);
    expect(lots.total?.[3].text).toBe("120,5");
  });
  it("mở/đóng tất cả và nhận biết đã mở hết (tham số expanded khi xuất)", () => {
    const doc = buildDocument(goods);
    expect(allOpen(doc, {})).toBe(false);
    expect(allOpen(doc, setAllOpen(doc, true))).toBe(true);
    expect(allOpen(doc, setAllOpen(doc, false))).toBe(false);
    expect(allOpen(buildDocument(parse({ ...base, concern: "goods", goods: { products: [], lots: [], totals: { soldKg: 0, revenue: 0, returnedKg: 0, returnValue: 0, netRevenue: 0, lotCount: 0, weighedKg: 0 } } })), {})).toBe(false);
  });
});

const fund = (name: "Cash" | "Bank", receipts: number, payments: number) => ({ fund: name, receipts, payments, net: receipts - payments });
const money = parse({
  ...base, concern: "money",
  money: {
    entries: [
      { source: "CashVoucher", code: "PT000001", at: "2026-11-19T08:00:00+07:00", direction: "Receipt", fund: "Cash", typeName: "Thu khác", partyKind: "Customer", partyName: "An", amount: 500_000, note: null, createdByName: "Kế toán" },
      { source: "SupplierPayment", code: null, at: "2026-11-19T09:00:00+07:00", direction: "Payment", fund: "Bank", typeName: null, partyKind: null, partyName: null, amount: 200_000, note: "Trả tiền giống", createdByName: null },
    ],
    byFund: [fund("Cash", 500_000, 0), fund("Bank", 0, 200_000)], totals: { receipts: 500_000, payments: 200_000, net: 300_000 },
  },
});

describe("Thu chi", () => {
  it("dòng thu vào cột Thu, dòng chi vào cột Chi; mã phiếu link sang Sổ quỹ theo mã", () => {
    const [funds, entries] = buildDocument(money).tables;
    expect(funds.rows.map((r) => r.cells.map((c) => c.text))).toEqual([["Tiền mặt", "500.000", "0", "500.000"], ["Ngân hàng", "0", "200.000", "-200.000"]]);
    const [receipt, payment] = entries.rows;
    expect(receipt.cells[0]).toEqual({ text: "PT000001", href: "/operations/cash-book?search=PT000001" });
    expect([receipt.cells[6].text, receipt.cells[7].text]).toEqual(["500.000", ""]);
    expect([payment.cells[6].text, payment.cells[7].text]).toEqual(["", "200.000"]);
    expect(receipt.cells[5].text).toBe("Khách hàng: An");
    expect(payment.cells[0].text).toBe("—");
    expect(payment.cells[2].text).toBe("Chi trả nhà cung cấp");
  });
});

describe("Tổng hợp", () => {
  const summary = parse({
    ...base, concern: "summary",
    summary: {
      sales: { orderCount: 3, orderValue: 9_000_000, deposits: 1_000_000, invoiceCount: 2, revenue: 2_000_000, discount: 100_000, returnCount: 1, returnValue: 100_000, netRevenue: 1_900_000, paid: 800_000, debt: 1_100_000 },
      money: { byFund: [fund("Cash", 500_000, 0)], totals: { receipts: 500_000, payments: 0, net: 500_000 } },
      goods: { productCount: 2, soldKg: 35, returnedKg: 2, lotCount: 1, weighedKg: 120.5 },
    },
  });
  it("ô chỉ số và ba bảng nhỏ", () => {
    const doc = buildDocument(summary);
    expect(doc.tiles.map((t) => t.label)).toEqual(["Doanh thu thuần", "Thực thu", "Công nợ", "Tổng thu", "Tổng chi", "Khối lượng bán"]);
    expect(doc.tables.map((t) => t.title)).toEqual(["Bán hàng", "Thu chi theo quỹ", "Hàng hóa"]);
    expect(doc.tables[0].rows.find((r) => r.cells[0].text === "Tiền cọc nhận trong kỳ")?.cells[1].text).toBe("1.000.000");
  });
});

describe("báo cáo rỗng và đầu trang", () => {
  it("nhận biết rỗng theo mối quan tâm hoặc MSG-GEN-10", () => {
    expect(isReportEmpty(sales)).toBe(false);
    expect(isReportEmpty(goods)).toBe(false);
    expect(isReportEmpty(parse({ ...base, concern: "sales", sales: { groups: [{ kind: "Invoice", count: 0, ...figures, rows: [] }], totals: { ...figures, netRevenue: 1_900_000 } } }))).toBe(true);
    expect(isReportEmpty(parse({ ...base, concern: "money", money: { entries: [], byFund: [], totals: { receipts: 0, payments: 0, net: 0 } } }))).toBe(true);
    expect(isReportEmpty({ ...sales, messageCode: "MSG-GEN-10" } as EndOfDayReport)).toBe(true);
    expect(isReportEmpty(parse({ ...base, concern: "goods" }))).toBe(true);
  });
  it("khối của mối quan tâm khác là null (như backend trả) vẫn đọc được", () => {
    expect(parse({ ...base, concern: "summary", sales: null, money: null, goods: null, summary: null }).sales).toBeNull();
  });
  it("khối vắng mặt cho tài liệu rỗng thay vì lỗi", () => {
    expect(buildDocument(parse({ ...base, concern: "summary" }))).toEqual({ tiles: [], tables: [] });
  });
  it("đầu trang: tiêu đề theo mối quan tâm, thời gian, vùng và chỉ các tiêu chí đã chọn bằng tên", () => {
    const report = parse({ ...base, concern: "sales", filters: { ...emptyFilters, zones: [{ id: id(1), name: "Vùng Cần Giờ" }], customers: [{ id: id(2), name: "Thương lái An" }], createdBy: [{ id: id(3), name: "Kế toán Lan" }] } });
    const head = buildPaperHead(report, { ...defaultFilters("2026-11-19"), zoneIds: [id(1)], customerIds: [id(2)], createdBy: [id(3)], paymentMethods: ["Cash", "OtherTransfer"], channels: ["AtPort"] });
    expect(head.title).toBe("Báo cáo cuối ngày về bán hàng");
    expect(head.createdAt).toBe("19/11/2026 10:05");
    expect(head.lines).toEqual([
      "Thời gian: 19/11/2026 00:00 - 19/11/2026 23:59", "Vùng nuôi: Vùng Cần Giờ", "Khách hàng: Thương lái An", "Người tạo: Kế toán Lan",
      "Phương thức thanh toán: Tiền mặt, Chuyển khoản khác", "Kênh bán: Tại cảng",
    ]);
    const moneyHead = buildPaperHead(parse({ ...base, concern: "money", filters: { ...emptyFilters, types: [{ id: id(7), name: "Thu khác" }] } }), { ...defaultFilters("2026-11-19"), concern: "money", typeIds: [id(7)], funds: ["Bank"] });
    expect(moneyHead.title).toBe("Báo cáo cuối ngày về thu chi");
    expect(moneyHead.lines).toEqual(["Thời gian: 19/11/2026 00:00 - 19/11/2026 23:59", "Quỹ: Ngân hàng", "Loại thu chi: Thu khác"]);
  });
  it("stampText: mốc có múi giờ về giờ Việt Nam, mốc yyyy-MM-ddTHH:mm giữ nguyên, mốc lỗi là gạch", () => {
    expect(stampText("2026-11-19T02:30:00Z")).toBe("19/11/2026 09:30");
    expect(stampText("2026-11-19T23:59")).toBe("19/11/2026 23:59");
    expect(stampText("không phải ngày")).toBe("—");
  });
});
