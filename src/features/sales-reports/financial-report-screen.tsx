"use client";
import { Suspense, useMemo } from "react";
import { LineChart } from "@/components/ui/charts/line-chart";
import { formatMoneyShort } from "@/components/ui/charts/format-money-short";
import { ListSkeleton } from "@/features/farming-management/detail-parts";
import { formatVietnameseDate } from "@/shared/format/date-only";
import { columnLabel, FinancialReportTable } from "./financial-report-table";
import f from "./financial-report.module.css";
import type { FinancialUnit } from "./financial-report-contracts";
import { ReportChoice, ReportFilterRail, useReportZones } from "./report-filter-rail";
import { vnd } from "./report-format";
import s from "./report-live.module.css";
import { ReportPage } from "./report-page";
import { ReportCard, ReportTiles } from "./report-parts";
import { UNIT_OPTIONS, useFinancialFilters, useFinancialReport } from "./use-financial-report";

/** Báo cáo Tài chính (kết quả kinh doanh): doanh thu thuần trừ chi phí thực phát sinh trong kỳ, theo tháng, quý hoặc năm. Dành cho Chủ hợp tác xã và Kế toán. */
export function FinancialReportScreen() {
  return <Suspense fallback={<ListSkeleton />}><FinancialWorkspace /></Suspense>;
}

function FinancialWorkspace() {
  const filters = useFinancialFilters(), zones = useReportZones("financial-report");
  const { applied, draft } = filters;
  const financial = useFinancialReport({ from: filters.query.from, to: filters.query.to, unit: applied.extra.unit as FinancialUnit });
  const { report } = financial, data = report.data;
  const rows = useMemo(() => new Map((data?.rows ?? []).map((row) => [row.code, row])), [data]);
  const points = useMemo(() => (data?.columns ?? []).map((column, index) => ({
    label: columnLabel(column.label), values: [rows.get("net-revenue")?.values[index] ?? 0, rows.get("profit")?.values[index] ?? 0],
  })), [data, rows]);
  const cost = (data?.rows ?? []).filter((row) => row.section === "cost").reduce((sum, row) => sum + row.total, 0);
  return (
    <ReportPage storageKey="financial-report" icon="payment" title="Tài chính" filterLabel="Bộ lọc báo cáo tài chính" canView={financial.canView}
      filters={<ReportFilterRail time={draft.time} onTime={(time) => filters.change({ time })} zoneIds={draft.zoneIds} onZones={(zoneIds) => filters.change({ zoneIds })} zones={zones}
        showZones={false} problem={filters.problem} busy={report.loading} onApply={filters.apply} onReset={filters.reset}>
        <ReportChoice legend="Cột theo" value={draft.extra.unit} options={UNIT_OPTIONS} onChange={(unit) => filters.applyNow({ unit })} />
      </ReportFilterRail>}
      onExport={financial.canExport ? financial.exportFile : undefined} exporting={financial.exporting} exportError={financial.exportError}
      loading={report.loading} error={report.error} onRetry={report.reload} hasData={!!data}
      emptyMessage={data && !data.rows.length ? data.message ?? "Chưa có số liệu nào trong kỳ đã chọn." : undefined}>
      {data && <>
        <p className={s.period}>{formatVietnameseDate(data.from)} – {formatVietnameseDate(data.to)} · thu chi không chia theo vùng nuôi</p>
        <ReportTiles label="Tổng hợp toàn kỳ" tiles={[
          { label: "Doanh thu thuần", value: vnd(rows.get("net-revenue")?.total ?? 0) }, { label: "Tổng chi phí", value: vnd(-cost) },
          { label: "Thu nhập khác", value: vnd(rows.get("other-income")?.total ?? 0) }, { label: "Lợi nhuận", value: vnd(rows.get("profit")?.total ?? 0) },
        ]} />
        <ReportCard title="Doanh thu thuần và lợi nhuận theo kỳ">
          <LineChart points={points} series={[{ name: "Doanh thu thuần" }, { name: "Lợi nhuận" }]} valueFormat={vnd} axisFormat={formatMoneyShort} ariaLabel={`Doanh thu thuần và lợi nhuận, ${points.length} kỳ`} />
        </ReportCard>
        <ReportCard title="Kết quả kinh doanh">
          <FinancialReportTable report={data} />
          <p className={f.note}>Chi phí tính theo phát sinh trong kỳ, chưa phân bổ giá vốn theo từng kg hàu. Nhân công là lương thực nhận của các bảng lương đã chốt; tiền nhập hàng không tính riêng vì đã nằm trong vật tư đã xuất dùng.</p>
        </ReportCard>
      </>}
    </ReportPage>
  );
}
