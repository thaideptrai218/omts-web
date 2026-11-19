"use client";
import { useMemo, useState, type ReactNode } from "react";
import { BarChart } from "@/components/ui/charts/bar-chart";
import { formatMoneyShort } from "@/components/ui/charts/format-money-short";
import { ListStateMessage } from "@/components/ui/management-screen/management-table";
import type { Query } from "@/features/operations/repository";
import { foldVietnamese } from "@/shared/presentation/fold-text";
import type { SalesGroupBy, SalesReport } from "./contracts";
import { ReportViewToggle, type ReportView } from "./report-page";
import { ReportCard, ReportTable, ReportTiles, type ReportTile } from "./report-parts";
import { vnd } from "./report-format";
import s from "./report-live.module.css";
import { GROUP_LABEL, groupLabel, isTimeGroup, orderGroups, salesGroupColumns } from "./sales-report-columns";
import { SalesInvoicesCard } from "./sales-invoices-card";
import { useSalesInvoices, type SalesReportArea } from "./use-sales-report";

const TOP_N = 10;

type Props = Readonly<{
  area: SalesReportArea; report: SalesReport; params: Query; groupBy: SalesGroupBy; tiles: readonly ReportTile[]; tilesLabel: string;
  view: ReportView; onView(view: ReportView): void; search: string;
  /** Thêm cột Đã thu ròng / Còn nợ (gộp theo khách hàng). */
  withDebt?: boolean; firstHeader?: string; chartTitle: string; periodText: string;
  /** Khối chi tiết hiện trên danh sách hóa đơn của nhóm đang mở (ví dụ sản phẩm của khách). */
  detail?(open: Readonly<{ key: string; label: string }>): ReactNode;
}>;

/** Phần thân dùng chung của báo cáo bán hàng: dòng kỳ, ô chỉ số, biểu đồ doanh thu thuần hoặc bảng nhóm (có dòng tổng), bấm nhóm để xem hóa đơn. */
export function SalesGroupsPanel({ area, report, params, groupBy, tiles, tilesLabel, view, onView, search, withDebt, firstHeader, chartTitle, periodText, detail }: Props) {
  const [open, setOpen] = useState<{ key: string; label: string }>();
  const ordered = useMemo(() => orderGroups(report.groups, groupBy), [report.groups, groupBy]);
  const term = foldVietnamese(search.trim());
  const shown = useMemo(() => term ? ordered.filter((group) => foldVietnamese(groupLabel(group, groupBy)).includes(term)) : ordered, [ordered, term, groupBy]);
  const chartGroups = isTimeGroup(groupBy) ? shown : shown.slice(0, TOP_N);
  const points = useMemo(() => chartGroups.map((group) => ({ label: groupLabel(group, groupBy), values: [group.netRevenue] })), [chartGroups, groupBy]);
  const invoices = useSalesInvoices(area, params, open?.key);
  const columns = useMemo(() => salesGroupColumns({ groupBy, totals: report.totals, withDebt, firstHeader, openKey: open?.key,
    onOpen: (group) => setOpen((current) => current?.key === group.key ? undefined : { key: group.key, label: groupLabel(group, groupBy) }) }), [groupBy, report.totals, withDebt, firstHeader, open?.key]);
  return (
    <>
      <p className={s.period}>{periodText}</p>
      <ReportTiles label={tilesLabel} tiles={tiles} />
      <ReportCard title={view === "chart" ? chartTitle : `Số liệu theo ${GROUP_LABEL[groupBy].toLocaleLowerCase("vi")}`} actions={<ReportViewToggle view={view} onChange={onView} />}>
        {!shown.length ? <ListStateMessage>Không có nhóm nào khớp từ khóa tìm kiếm.</ListStateMessage>
          : view === "chart"
            ? <>
              <BarChart points={points} series={[{ name: "Doanh thu thuần" }]} valueFormat={vnd} axisFormat={formatMoneyShort} ariaLabel={`${chartTitle}, ${points.length} nhóm`} />
              {!isTimeGroup(groupBy) && shown.length > TOP_N && <p className={s.muted}>Biểu đồ hiện {TOP_N} nhóm có doanh thu thuần cao nhất; xem đủ trong bảng.</p>}
            </>
            : <ReportTable caption={`Số liệu theo ${GROUP_LABEL[groupBy].toLocaleLowerCase("vi")}`} columns={columns} rows={shown} rowKey={(group) => group.key} selectedKey={open?.key} />}
      </ReportCard>
      {view === "table" && open && <>
        {detail?.(open)}
        <SalesInvoicesCard label={open.label} data={invoices.data} loading={invoices.loading} error={invoices.error} onRetry={invoices.reload} />
      </>}
    </>
  );
}
