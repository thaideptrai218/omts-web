"use client";
import { useMemo } from "react";
import Link from "next/link";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import { productHref } from "@/features/products/product-helpers";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { ProductStockGroup, ProductStockReport } from "./product-stock-contracts";
import { kg, plainKg, vnd } from "./report-format";
import s from "./report-live.module.css";
import { ReportViewToggle, type ReportView } from "./report-page";
import { ReportCard, ReportTable, ReportTiles, type ReportColumn } from "./report-parts";

const TOP_N = 10;
const UNCATEGORIZED = "Chưa phân nhóm";

const label = (group: ProductStockGroup) => group.key === "uncategorized" ? UNCATEGORIZED : group.label;

type Props = Readonly<{ report: ProductStockReport; byCategory: boolean; view: ReportView; onView(view: ReportView): void; search: string }>;

/** Phần thân "Xuất nhập tồn" (kg) của báo cáo Hàng hóa: ô chỉ số, biểu đồ cột chồng nhập/xuất của 10 dòng có biến động lớn nhất hoặc bảng đầy đủ có dòng tổng. */
export function ProductStockPanel({ report, byCategory, view, onView, search }: Props) {
  const totals = report.totals, term = foldVietnamese(search.trim()), subject = byCategory ? "nhóm hàng" : "hàng hóa";
  const shown = useMemo(() => {
    const matches = term ? report.groups.filter((group) => foldVietnamese(`${label(group)} ${group.code ?? ""}`).includes(term)) : report.groups;
    return [...matches].sort((a, b) => b.closingKg - a.closingKg);
  }, [report.groups, term]);
  const top = useMemo(() => [...shown].sort((a, b) => b.receivedKg + b.soldKg + b.disposedKg - (a.receivedKg + a.soldKg + a.disposedKg)).slice(0, TOP_N), [shown]);
  const columns = useMemo<ReportColumn<ProductStockGroup>[]>(() => [
    { key: "label", header: byCategory ? "Nhóm hàng" : "Tên hàng", cell: label, total: "Tổng" },
    ...(byCategory ? [] : [{ key: "code", header: "Mã hàng", cell: (group: ProductStockGroup) => group.code ? <Link href={productHref(group.code)} className="font-semibold text-primary underline">{group.code}</Link> : "—" }]),
    { key: "opening", header: "Tồn đầu kỳ", numeric: true, cell: (group) => kg(group.openingKg), total: kg(totals.openingKg) },
    { key: "received", header: "Nhập", numeric: true, cell: (group) => kg(group.receivedKg), total: kg(totals.receivedKg) },
    { key: "sold", header: "Xuất bán", numeric: true, cell: (group) => kg(group.soldKg), total: kg(totals.soldKg) },
    { key: "disposed", header: "Hủy", numeric: true, cell: (group) => kg(group.disposedKg), total: kg(totals.disposedKg) },
    { key: "adjust", header: "Điều chỉnh", numeric: true, cell: (group) => kg(group.adjustmentKg), total: kg(totals.adjustmentKg) },
    { key: "closing", header: "Tồn cuối kỳ", numeric: true, cell: (group) => kg(group.closingKg), total: kg(totals.closingKg) },
    { key: "value", header: "Giá trị tồn cuối", numeric: true, cell: (group) => vnd(group.closingValue), total: vnd(totals.closingValue) },
  ], [byCategory, totals]);
  const chartTitle = `Nhập và xuất của ${top.length} ${subject} có biến động lớn nhất`;
  return (
    <>
      <p className={s.period}>{formatVietnameseDate(report.from)} – {formatVietnameseDate(report.to)} · khối lượng theo kg · giá trị tồn tính theo giá bán niêm yết hiện tại</p>
      <ReportTiles label="Tổng hợp toàn kỳ" tiles={[
        { label: "Tồn đầu kỳ", value: kg(totals.openingKg) }, { label: "Nhập", value: kg(totals.receivedKg) }, { label: "Xuất bán", value: kg(totals.soldKg) },
        { label: "Tồn cuối kỳ", value: kg(totals.closingKg) }, { label: "Giá trị tồn cuối", value: vnd(totals.closingValue), hint: "Theo giá bán niêm yết" },
      ]} />
      <ReportCard title={view === "chart" ? chartTitle : `Xuất nhập tồn theo ${subject}`} actions={<ReportViewToggle view={view} onChange={onView} />}>
        {!shown.length ? <ListStateMessage>Không có {subject} nào khớp từ khóa tìm kiếm.</ListStateMessage>
          : view === "chart"
            ? <BarChart stacked points={top.map((group) => ({ label: label(group), values: [group.receivedKg, group.soldKg, group.disposedKg] }))}
              series={[{ name: "Nhập" }, { name: "Xuất bán" }, { name: "Hủy" }]} valueFormat={(value) => `${plainKg(value)} kg`} ariaLabel={`${chartTitle}, ${top.length} dòng`} />
            : <ReportTable caption={`Xuất nhập tồn theo ${subject}`} columns={columns} rows={shown} rowKey={(group) => group.key} />}
      </ReportCard>
    </>
  );
}
