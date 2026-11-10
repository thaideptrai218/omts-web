"use client";
/*
 * FRAME ONLY: no data source yet. Wire to the sales-performance report API
 * (period, group-by, zones, customer, product; file export) once available.
 * SCR-REPORT-01 "Hiệu quả bán hàng". Layout shell: no fetch, no mock data.
 */
import { useState } from "react";
import { ChartFrame } from "./chart-frame";
import { FrameSection, FrameTable, FrameTiles } from "./frame-parts";
import { AllOptionSelect, ChecklistFilter, PeriodFilter, RadioFilter, type FilterOption } from "./report-filter-parts";
import { ReportScreenShell } from "./report-screen-shell";
import s from "./report-frame.module.css";

const GROUP_OPTIONS: readonly FilterOption[] = [
  { value: "customer", label: "Khách hàng" },
  { value: "product", label: "Sản phẩm" },
  { value: "zone", label: "Vùng nuôi" },
  { value: "day", label: "Thời gian: theo ngày" },
  { value: "week", label: "Thời gian: theo tuần" },
  { value: "month", label: "Thời gian: theo tháng" },
];

const TILE_LABELS = ["Số hóa đơn", "Doanh thu thuần (₫)", "kg đã bán", "Tiền thực thu ròng (₫)", "Công nợ cuối kỳ (₫)"];
const DETAIL_HEADINGS = ["Mã hóa đơn", "Ngày", "Khách hàng", "Vùng nuôi", "Tổng tiền (₫)", "Giá trị hàng trả (₫)", "Thành tiền ròng (₫)"];

/** First-column label: time groupings share one "Thời gian" heading. */
function groupHeading(value: string): string {
  return value === "day" || value === "week" || value === "month" ? "Thời gian" : GROUP_OPTIONS.find((option) => option.value === value)?.label ?? "Nhóm";
}

export function SalesPerformanceScreen() {
  const [groupBy, setGroupBy] = useState("customer");
  const group = groupHeading(groupBy);
  const headings = [group, "Số hóa đơn", "kg lập hóa đơn", "Doanh thu (₫)", "Giảm giá sau bán (₫)", "Hàng trả (₫)", "Doanh thu thuần (₫)", "kg đã bán", "Tiền thực thu ròng (₫)", "Công nợ cuối kỳ (₫)"];
  return (
    <ReportScreenShell
      title="Hiệu quả bán hàng"
      description="Doanh thu thuần, hàng trả, giảm giá và công nợ của các hóa đơn bán theo kỳ đã chọn, không tính hóa đơn đã hủy."
      icon="receipt"
      filters={
        <>
          {/* TODO(api): filter values feed the report query once the endpoint exists. */}
          <PeriodFilter name="sales-performance-period" />
          <RadioFilter legend="Nhóm theo" name="sales-performance-group" options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} />
          {/* TODO(api): zone, customer and product options come from the backend lists. */}
          <ChecklistFilter legend="Vùng nuôi" />
          <AllOptionSelect label="Khách hàng" allLabel="Tất cả khách hàng" />
          <AllOptionSelect label="Sản phẩm" allLabel="Tất cả sản phẩm" />
        </>
      }
    >
      <p className={s.period}>Kỳ báo cáo: — · nhóm theo {group.toLocaleLowerCase("vi")}</p>
      <FrameTiles label="Tổng hợp toàn kỳ" labels={TILE_LABELS} />
      <ChartFrame title={`Doanh thu thuần theo ${group.toLocaleLowerCase("vi")}`} kind="bar" legend={["Doanh thu thuần (₫)"]} valueAxis="Doanh thu thuần (₫)" categoryAxis={group} />
      <FrameSection title="Số liệu theo nhóm">
        {/* TODO(api): rows, totals row and row expansion come from the report response. */}
        <FrameTable caption="Hiệu quả bán hàng theo nhóm" headings={headings} rightAligned={[1, 2, 3, 4, 5, 6, 7, 8, 9]} />
      </FrameSection>
      <FrameSection title="Hóa đơn của nhóm đã chọn">
        {/* TODO(api): invoice rows of the selected group; invoice code links to the sales invoice screen. */}
        <FrameTable caption="Hóa đơn của nhóm đã chọn" headings={DETAIL_HEADINGS} rightAligned={[4, 5, 6]} />
        <p className={s.muted}>Thành tiền ròng = Tổng tiền trừ giá trị hàng trả.</p>
      </FrameSection>
    </ReportScreenShell>
  );
}
