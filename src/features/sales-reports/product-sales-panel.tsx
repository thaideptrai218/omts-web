"use client";
import { useMemo } from "react";
import Link from "next/link";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { formatMoneyShort } from "@/components/ui/charts/format-money-short";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { productHref } from "@/features/products/product-helpers";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { SalesReport } from "./contracts";
import type { ProductSalesRow } from "./product-sales-rows";
import { count, kg, vnd } from "./report-format";
import s from "./report-live.module.css";
import { ReportViewToggle, type ReportView } from "./report-page";
import { ReportCard, ReportTable, ReportTiles, type ReportColumn } from "./report-parts";

const TOP_N = 10;

type Props = Readonly<{ report: SalesReport; rows: readonly ProductSalesRow[]; merge: boolean; view: ReportView; onView(view: ReportView): void; search: string }>;

/** Phần thân "Bán hàng" của báo cáo Hàng hóa: ô chỉ số, biểu đồ top 10 theo doanh thu thuần hoặc bảng theo hàng hóa/nhóm hàng; mã hàng dẫn sang chi tiết sản phẩm. */
export function ProductSalesPanel({ report, rows, merge, view, onView, search }: Props) {
  const totals = report.totals, term = foldVietnamese(search.trim());
  const shown = useMemo(() => term ? rows.filter((row) => foldVietnamese(`${row.label} ${row.code ?? ""}`).includes(term)) : rows, [rows, term]);
  const top = useMemo(() => shown.filter((row) => !row.adjustment).slice(0, TOP_N), [shown]);
  const subject = merge ? "nhóm hàng" : "hàng hóa";
  const columns = useMemo<ReportColumn<ProductSalesRow>[]>(() => [
    { key: "label", header: merge ? "Nhóm hàng" : "Tên hàng", cell: (row) => row.label, total: "Tổng" },
    ...(merge ? [] : [{ key: "code", header: "Mã hàng", cell: (row: ProductSalesRow) => row.code ? <Link href={productHref(row.code)} className="font-semibold text-primary underline">{row.code}</Link> : "—" }]),
    { key: "kg", header: "Kg bán", numeric: true, cell: (row) => kg(row.soldKg), total: kg(totals.soldKg) },
    { key: "revenue", header: "Doanh thu", numeric: true, cell: (row) => vnd(row.revenue), total: vnd(totals.revenue) },
    { key: "cuts", header: "Giảm giá sau bán", numeric: true, cell: (row) => vnd(row.priceCuts), total: vnd(totals.priceCuts) },
    { key: "returns", header: "Hàng trả", numeric: true, cell: (row) => vnd(row.salesReturns), total: vnd(totals.salesReturns) },
    { key: "net", header: "Doanh thu thuần", numeric: true, cell: (row) => vnd(row.netRevenue), total: vnd(totals.netRevenue) },
    { key: "avg", header: "Giá bán TB/kg", numeric: true, cell: (row) => row.soldKg > 0 ? vnd(row.netRevenue / row.soldKg) : "—", total: totals.soldKg > 0 ? vnd(totals.netRevenue / totals.soldKg) : "—" },
  ], [merge, totals]);
  const chartTitle = `Top ${TOP_N} ${subject} theo doanh thu thuần`;
  return (
    <>
      <p className={s.period}>{formatVietnameseDate(report.from)} – {formatVietnameseDate(report.to)} · không tính hóa đơn đã hủy</p>
      <ReportTiles label="Tổng hợp toàn kỳ" tiles={[
        { label: "Số hóa đơn", value: count(totals.invoiceCount) }, { label: "Kg đã bán", value: kg(totals.soldKg) },
        { label: "Doanh thu", value: vnd(totals.revenue) }, { label: "Doanh thu thuần", value: vnd(totals.netRevenue) },
      ]} />
      <ReportCard title={view === "chart" ? chartTitle : `Số liệu theo ${subject}`} actions={<ReportViewToggle view={view} onChange={onView} />}>
        {!shown.length ? <ListStateMessage>Không có {subject} nào khớp từ khóa tìm kiếm.</ListStateMessage>
          : view === "chart"
            ? <BarChart points={top.map((row) => ({ label: row.label, values: [row.netRevenue] }))} series={[{ name: "Doanh thu thuần" }]} valueFormat={vnd} axisFormat={formatMoneyShort} ariaLabel={`${chartTitle}, ${top.length} dòng`} />
            : <ReportTable caption={`Bán hàng theo ${subject}`} columns={columns} rows={shown} rowKey={(row) => row.key} />}
      </ReportCard>
    </>
  );
}
