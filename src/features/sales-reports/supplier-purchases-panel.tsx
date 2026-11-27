"use client";
import { useMemo, useState } from "react";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { formatMoneyShort } from "@/components/ui/charts/format-money-short";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import type { Query } from "@/features/operations/repository";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import { PurchaseDocumentsCard } from "./purchase-documents-card";
import { count, vnd } from "./report-format";
import s from "./report-live.module.css";
import { ReportViewToggle, type ReportView } from "./report-page";
import { ReportCard, ReportTable, ReportTiles, RowLinkButton, type ReportColumn } from "./report-parts";
import type { PurchaseGroup, PurchaseGroupBy, PurchaseReport } from "./supplier-report-contracts";
import { usePurchaseLines } from "./use-purchase-report";

const TOP_N = 10;
const quantityFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const quantity = (value: number | null) => value == null ? "—" : quantityFormat.format(value);
/** Nhóm chiết khấu cả phiếu của cách xem theo mặt hàng không phải mặt hàng thật. */
const isDiscountGroup = (group: PurchaseGroup) => group.key === "receipt-discounts";
const nameOf = (group: PurchaseGroup) => isDiscountGroup(group) ? "Chiết khấu cả phiếu nhập" : group.label;

type Props = Readonly<{ report: PurchaseReport; params: Query; groupBy: PurchaseGroupBy; view: ReportView; onView(view: ReportView): void; search: string }>;

/** Phần thân "Hàng nhập theo NCC": ô chỉ số, biểu đồ top 10 theo nhập thuần hoặc bảng (có dòng tổng), bấm dòng để xem phiếu nhập/trả của nhóm đó. */
export function SupplierPurchasesPanel({ report, params, groupBy, view, onView, search }: Props) {
  const [open, setOpen] = useState<{ key: string; label: string }>();
  const totals = report.totals, term = foldVietnamese(search.trim()), bySupplier = groupBy === "supplier", subject = bySupplier ? "nhà cung cấp" : "mặt hàng";
  const shown = useMemo(() => {
    const matches = term ? report.groups.filter((group) => foldVietnamese(`${nameOf(group)} ${group.code ?? ""}`).includes(term)) : report.groups;
    return [...matches].sort((a, b) => b.netValue - a.netValue);
  }, [report.groups, term]);
  const top = useMemo(() => shown.filter((group) => !isDiscountGroup(group)).slice(0, TOP_N), [shown]);
  const documents = usePurchaseLines(params, open?.key);
  const columns = useMemo<ReportColumn<PurchaseGroup>[]>(() => [
    { key: "label", header: bySupplier ? "Nhà cung cấp" : "Mặt hàng", total: "Tổng",
      cell: (group) => <RowLinkButton pressed={open?.key === group.key} onClick={() => setOpen((current) => current?.key === group.key ? undefined : { key: group.key, label: nameOf(group) })}>{nameOf(group)}</RowLinkButton> },
    ...(bySupplier ? [] : [
      { key: "code", header: "Mã", cell: (group: PurchaseGroup) => group.code ?? "—" },
      { key: "unit", header: "Đơn vị", cell: (group: PurchaseGroup) => group.unit ?? "—" },
      { key: "qty", header: "SL nhập", numeric: true, cell: (group: PurchaseGroup) => quantity(group.receivedQuantity), total: quantity(totals.receivedQuantity) },
      { key: "retQty", header: "SL trả", numeric: true, cell: (group: PurchaseGroup) => quantity(group.returnedQuantity), total: quantity(totals.returnedQuantity) },
    ]),
    { key: "receipts", header: "Số phiếu nhập", numeric: true, cell: (group) => count(group.receiptCount), total: count(totals.receiptCount) },
    { key: "returns", header: "Số phiếu trả", numeric: true, cell: (group) => count(group.returnCount), total: count(totals.returnCount) },
    { key: "received", header: "Tiền hàng", numeric: true, cell: (group) => vnd(group.receivedValue), total: vnd(totals.receivedValue) },
    { key: "vat", header: "Thuế GTGT", numeric: true, cell: (group) => vnd(group.vatAmount ?? 0), total: vnd(totals.vatAmount ?? 0) },
    { key: "returned", header: "Giá trị trả", numeric: true, cell: (group) => vnd(group.returnedValue), total: vnd(totals.returnedValue) },
    { key: "net", header: "Tổng trả NCC", numeric: true, cell: (group) => vnd(group.netValue), total: vnd(totals.netValue) },
  ], [bySupplier, totals, open?.key]);
  const chartTitle = `Top ${TOP_N} ${subject} theo tổng trả NCC`;
  return (
    <>
      <p className={s.period}>{formatVietnameseDate(report.from)} – {formatVietnameseDate(report.to)} · phiếu nhập đã hoàn tất, tổng trả NCC đã gồm thuế GTGT · không chia theo vùng</p>
      <ReportTiles label="Tổng hợp toàn kỳ" tiles={[
        { label: "Số phiếu nhập", value: count(totals.receiptCount) }, { label: "Tiền hàng", value: vnd(totals.receivedValue) }, { label: "Thuế GTGT", value: vnd(totals.vatAmount ?? 0) },
        { label: "Giá trị trả", value: vnd(totals.returnedValue), hint: `${count(totals.returnCount)} phiếu trả` }, { label: "Tổng trả NCC", value: vnd(totals.netValue) },
      ]} />
      <ReportCard title={view === "chart" ? chartTitle : `Hàng nhập theo ${subject}`} actions={<ReportViewToggle view={view} onChange={onView} />}>
        {!shown.length ? <ListStateMessage>Không có {subject} nào khớp từ khóa tìm kiếm.</ListStateMessage>
          : view === "chart"
            ? <BarChart points={top.map((group) => ({ label: nameOf(group), values: [group.netValue] }))} series={[{ name: "Tổng trả NCC" }]} valueFormat={vnd} axisFormat={formatMoneyShort} ariaLabel={`${chartTitle}, ${top.length} dòng`} />
            : <ReportTable caption={`Hàng nhập theo ${subject}`} columns={columns} rows={shown} rowKey={(group) => group.key} selectedKey={open?.key} />}
      </ReportCard>
      {view === "table" && open && <PurchaseDocumentsCard label={open.label} data={documents.data} loading={documents.loading} error={documents.error} onRetry={documents.reload} />}
    </>
  );
}
