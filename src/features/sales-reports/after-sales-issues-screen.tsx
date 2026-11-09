"use client";
/*
 * FRAME ONLY: no data source yet. Wire to the after-sales issues report API
 * (period, group-by, zones, customer; file export) once available.
 * SCR-REPORT-03 "Vấn đề sau bán". Layout shell: no fetch, no mock data.
 */
import { useState } from "react";
import { ChartFrame } from "./chart-frame";
import { FrameSection, FrameTable, FrameTiles } from "./frame-parts";
import { AllOptionSelect, ChecklistFilter, PeriodFilter, RadioFilter, type FilterOption } from "./report-filter-parts";
import { ReportScreenShell } from "./report-screen-shell";
import s from "./report-frame.module.css";

const GROUP_OPTIONS: readonly FilterOption[] = [
  { value: "customer", label: "Khách hàng" },
  { value: "zone", label: "Vùng nuôi" },
  { value: "harvest", label: "Lô thu hoạch" },
];

const TILE_LABELS = ["Khiếu nại đã gửi", "Phiếu trả hàng", "Giảm giá sau bán (₫)", "Hóa đơn đã hủy"];
const COLUMNS = [
  "Đã gửi", "Chờ phản hồi", "Từ chối", "Chấp nhận",
  "Số phiếu", "kg trả", "kg hủy", "Giá trị (₫)",
  "Số lần", "Số tiền (₫)",
  "Số hóa đơn", "Tổng tiền (₫)",
];
const COLUMN_GROUPS = [
  { label: "Khiếu nại", span: 4 },
  { label: "Hàng trả", span: 4 },
  { label: "Giảm giá sau bán", span: 2 },
  { label: "Hóa đơn đã hủy", span: 2 },
] as const;
const DETAIL_HEADINGS = ["Ngày", "Loại", "Hóa đơn", "Khách hàng", "Ghi chú hoặc lý do", "Số tiền (₫)"];

export function AfterSalesIssuesScreen() {
  const [groupBy, setGroupBy] = useState("customer");
  const group = GROUP_OPTIONS.find((option) => option.value === groupBy)?.label ?? "Nhóm";
  const lower = group.toLocaleLowerCase("vi");
  return (
    <ReportScreenShell
      title="Vấn đề sau bán"
      description="Khiếu nại, hàng trả, giảm giá sau bán và hóa đơn đã hủy theo kỳ, gộp theo khách hàng, vùng nuôi hoặc lô thu hoạch."
      icon="inbox"
      filters={
        <>
          {/* TODO(api): filter values feed the report query; zone and customer options come from the backend lists. */}
          <PeriodFilter name="after-sales-period" />
          <RadioFilter legend="Nhóm theo" name="after-sales-group" options={GROUP_OPTIONS} value={groupBy} onChange={setGroupBy} />
          <ChecklistFilter legend="Vùng nuôi" />
          <AllOptionSelect label="Khách hàng" allLabel="Tất cả khách hàng" />
        </>
      }
    >
      <p className={s.period}>Kỳ báo cáo: — · nhóm theo {lower} · mỗi vấn đề tính vào kỳ của ngày xảy ra</p>
      <FrameTiles label="Tổng hợp toàn kỳ" labels={TILE_LABELS} />
      <ChartFrame title={`Giá trị vấn đề sau bán theo ${lower} (hàng trả + giảm giá + hóa đơn hủy)`} kind="bar" legend={["Giá trị vấn đề sau bán (₫)"]} valueAxis="Giá trị vấn đề sau bán (₫)" categoryAxis={group} />
      <FrameSection title="Số liệu theo nhóm">
        {/* TODO(api): grouped rows, totals row and row expansion come from the report response. */}
        <FrameTable caption="Vấn đề sau bán theo nhóm" headings={[group, ...COLUMNS]} groups={COLUMN_GROUPS} groupStart={1} rightAligned={Array.from({ length: COLUMNS.length }, (_, index) => index + 1)} />
      </FrameSection>
      <FrameSection title="Các vấn đề của nhóm đã chọn">
        {/* TODO(api): issue rows of the selected group; invoice code links to the sales invoice screen. */}
        <FrameTable caption="Các vấn đề của nhóm đã chọn" headings={DETAIL_HEADINGS} rightAligned={[5]} />
      </FrameSection>
    </ReportScreenShell>
  );
}
