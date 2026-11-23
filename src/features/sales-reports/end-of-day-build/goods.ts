import { invoiceHref } from "@/features/customers/customer-links";
import { productHref } from "@/features/products/product-helpers";
import { salesReturnHref } from "@/features/sales-returns/return-labels";
import { formatVnd } from "@/shared/format/vnd";
import type { EndOfDayReport, GoodsProduct } from "../end-of-day-contracts";
import { cell, stampText, type EodColumn, type EodDocument, type EodRow } from "../end-of-day-model";
import { count, plainKg } from "../report-format";

const money = (value: number) => formatVnd(value);
const bold = (text: string) => cell(text, { strong: true });
const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

const PRODUCT_COLUMNS: readonly EodColumn[] = [
  { key: "code", header: "Mã hàng / Chứng từ", width: 1.35 }, { key: "name", header: "Tên hàng / Diễn giải", width: 2.6 }, { key: "unit", header: "ĐVT", width: 0.55 },
  { key: "soldKg", header: "SL bán (kg)", numeric: true, width: 1 }, { key: "revenue", header: "Doanh thu", numeric: true, width: 1.15 }, { key: "returnedKg", header: "SL trả (kg)", numeric: true, width: 1 },
  { key: "returnValue", header: "Giá trị trả", numeric: true, width: 1.1 }, { key: "net", header: "Doanh thu thuần", numeric: true, width: 1.2 },
];
const LOT_COLUMNS: readonly EodColumn[] = [
  { key: "lot", header: "Mã lô", width: 1.4 }, { key: "zone", header: "Vùng nuôi", width: 1.6 }, { key: "at", header: "Thời gian cân", width: 1.4 }, { key: "kg", header: "KL cân (kg)", numeric: true, width: 1.1 },
];

function productRows(product: GoodsProduct): EodRow[] {
  const key = `goods:${product.productId}`;
  const head: EodRow = {
    key, role: "item", toggle: product.details.length ? { defaultOpen: false } : undefined,
    cells: [product.code ? cell(product.code, { href: productHref(product.code), strong: true }) : bold("—"), bold(product.name), cell(product.unit), cell(plainKg(product.soldKg)), cell(money(product.revenue)),
      cell(plainKg(product.returnedKg)), cell(money(product.returnValue)), cell(money(product.netRevenue))],
  };
  const details = product.details.map((detail, index): EodRow => {
    const invoice = detail.kind === "Invoice";
    return {
      key: `${key}:${detail.documentId}:${index}`, role: "detail", parent: key,
      cells: [cell(detail.code, { href: invoice ? invoiceHref(detail.code) : salesReturnHref(detail.code) }), cell(`${invoice ? "Hóa đơn" : "Trả hàng"} · ${detail.customerName ?? "Khách lẻ"} · ${stampText(detail.at)}`), cell(""),
        cell(invoice ? plainKg(detail.kg) : ""), cell(invoice ? money(detail.value) : ""), cell(invoice ? "" : plainKg(detail.kg)), cell(invoice ? "" : money(detail.value)), cell("")],
    };
  });
  return [head, ...details];
}

/** Hàng hóa: bán theo sản phẩm (⊞ mở các hóa đơn / phiếu trả của sản phẩm) và các lô đã cân trong kỳ. */
export function buildGoods(goods: NonNullable<EndOfDayReport["goods"]>): EodDocument {
  const { products, lots } = goods;
  const soldKg = sum(products.map((row) => row.soldKg)), returnedKg = sum(products.map((row) => row.returnedKg));
  const revenue = sum(products.map((row) => row.revenue)), returnValue = sum(products.map((row) => row.returnValue)), net = sum(products.map((row) => row.netRevenue));
  const weighedKg = sum(lots.map((row) => row.weighedKg));
  return {
    tiles: [
      { label: "Sản phẩm đã bán", value: count(products.length) }, { label: "Khối lượng bán", value: `${plainKg(soldKg)} kg` }, { label: "Khối lượng trả", value: `${plainKg(returnedKg)} kg` },
      { label: "Lô đã cân", value: count(lots.length), hint: `${plainKg(weighedKg)} kg` },
    ],
    tables: [
      {
        id: "goods-products", title: "Hàng bán theo sản phẩm", columns: PRODUCT_COLUMNS, rows: products.flatMap(productRows), emptyText: "Không có hàng bán nào trong khoảng thời gian đã chọn.",
        total: [bold("Tổng cộng"), cell(""), cell(""), bold(plainKg(soldKg)), bold(money(revenue)), bold(plainKg(returnedKg)), bold(money(returnValue)), bold(money(net))],
      },
      {
        id: "goods-lots", title: "Lô thu hoạch đã cân", columns: LOT_COLUMNS, emptyText: "Không có lô thu hoạch nào được cân trong khoảng thời gian đã chọn.",
        rows: lots.map((lot): EodRow => ({ key: `lot:${lot.id}`, role: "item", cells: [cell(lot.lotCode), cell(lot.zoneName), cell(stampText(lot.weighedAt)), cell(plainKg(lot.weighedKg))] })),
        total: [bold("Tổng cộng"), cell(""), cell(""), bold(plainKg(weighedKg))],
      },
    ],
    note: "Doanh thu đã phân bổ giảm giá hóa đơn theo tỷ lệ thành tiền của từng dòng hàng.",
  };
}
