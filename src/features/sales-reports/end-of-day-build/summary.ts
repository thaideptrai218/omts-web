import { formatVnd } from "@/shared/format/vnd";
import type { EndOfDayReport } from "../end-of-day-contracts";
import { cell, type EodColumn, type EodDocument, type EodRow, type EodTable } from "../end-of-day-model";
import { count, plainKg, vnd } from "../report-format";
import { fundTable } from "./money";

const money = (value: number) => formatVnd(value);
const COLUMNS: readonly EodColumn[] = [{ key: "label", header: "Chỉ tiêu", width: 3 }, { key: "value", header: "Giá trị", numeric: true, width: 1.6 }];
const keyValueTable = (id: string, title: string, lines: readonly (readonly [string, string])[]): EodTable => ({
  id, title, columns: COLUMNS, emptyText: "", rows: lines.map(([label, value], index): EodRow => ({ key: `${id}:${index}`, role: "item", cells: [cell(label), cell(value)] })),
});

/** Tổng hợp: ô chỉ số đầu trang và ba bảng nhỏ (bán hàng, thu chi theo quỹ, hàng hóa). */
export function buildSummary(summary: NonNullable<EndOfDayReport["summary"]>): EodDocument {
  const { sales, money: cash, goods } = summary;
  return {
    tiles: [
      { label: "Doanh thu thuần", value: vnd(sales.netRevenue) }, { label: "Thực thu", value: vnd(sales.paid) }, { label: "Công nợ", value: vnd(sales.debt) },
      { label: "Tổng thu", value: vnd(cash.totals.receipts) }, { label: "Tổng chi", value: vnd(cash.totals.payments) }, { label: "Khối lượng bán", value: `${plainKg(goods.soldKg)} kg` },
    ],
    tables: [
      keyValueTable("summary-sales", "Bán hàng", [
        ["Số đặt hàng", count(sales.orderCount)], ["Giá trị đặt hàng", money(sales.orderValue)], ["Tiền cọc nhận trong kỳ", money(sales.deposits)],
        ["Số hóa đơn", count(sales.invoiceCount)], ["Doanh thu", money(sales.revenue)], ["Giảm giá", money(sales.discount)],
        ["Số phiếu trả hàng", count(sales.returnCount)], ["Giá trị trả hàng", money(sales.returnValue)], ["Doanh thu thuần", money(sales.netRevenue)],
        ["Thực thu", money(sales.paid)], ["Công nợ", money(sales.debt)],
      ]),
      fundTable(cash.byFund, cash.totals),
      keyValueTable("summary-goods", "Hàng hóa", [
        ["Số sản phẩm đã bán", count(goods.productCount)], ["Khối lượng bán (kg)", plainKg(goods.soldKg)], ["Khối lượng trả (kg)", plainKg(goods.returnedKg)],
        ["Số lô đã cân", count(goods.lotCount)], ["Khối lượng cân (kg)", plainKg(goods.weighedKg)],
      ]),
    ],
    note: "Đặt hàng không cộng vào doanh thu; tiền cọc của đặt hàng chỉ tính vào thực thu của kỳ nhận tiền.",
  };
}
