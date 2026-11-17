"use client";
/*
 * FRAME ONLY: no data source yet. Wire to the price-trend report API
 * (products, period, time unit, zones; file export) once available.
 * SCR-REPORT-02 "Xu hướng giá". Layout shell: no fetch, no mock data.
 */
import { useState } from "react";
import { ChartFrame } from "./chart-frame";
import { FrameSection, FrameTable } from "./frame-parts";
import { ChecklistFilter, PeriodFilter, RadioFilter, type FilterOption } from "./report-filter-parts";
import { ReportScreenShell } from "./report-screen-shell";
import s from "./report-frame.module.css";

const UNIT_OPTIONS: readonly (FilterOption & { bucket: string; chart: string })[] = [
  { value: "day", label: "Theo ngày", bucket: "Ngày", chart: "ngày" },
  { value: "week", label: "Theo tuần", bucket: "Tuần", chart: "tuần" },
  { value: "month", label: "Theo tháng", bucket: "Tháng", chart: "tháng" },
];

const DETAIL_HEADINGS = ["Mã hóa đơn", "Ngày", "Khách hàng", "kg", "Đơn giá (₫/kg)"];

export function PriceTrendScreen() {
  const [unit, setUnit] = useState("week");
  const current = UNIT_OPTIONS.find((option) => option.value === unit) ?? UNIT_OPTIONS[1];
  const headings = ["Sản phẩm", current.bucket, "kg bán", "Giá bình quân (₫/kg)", "Giá thấp nhất (₫/kg)", "Giá cao nhất (₫/kg)"];
  return (
    <ReportScreenShell
      title="Xu hướng giá"
      description="Giá bán bình quân, thấp nhất và cao nhất của từng sản phẩm theo ngày, tuần hoặc tháng."
      icon="product"
      filters={
        <>
          {/* TODO(api): product and zone options come from the backend lists; values feed the report query. */}
          <ChecklistFilter legend="Sản phẩm" />
          <PeriodFilter />
          <RadioFilter legend="Đơn vị thời gian" name="price-trend-unit" options={UNIT_OPTIONS} value={unit} onChange={setUnit} />
          <ChecklistFilter legend="Vùng nuôi" />
        </>
      }
    >
      <p className={s.period}>Kỳ báo cáo: — · theo {current.chart} · giá bình quân tính theo kg</p>
      {/* TODO(api): one line series per selected product; plot points from the report response. */}
      <ChartFrame title={`Giá bán bình quân theo ${current.chart} (₫/kg)`} kind="line" legend={["Giá bán bình quân của từng sản phẩm đã chọn"]} valueAxis="Giá bán bình quân (₫/kg)" categoryAxis={current.bucket} />
      <FrameSection title="Số liệu theo sản phẩm">
        {/* TODO(api): price rows per product and time bucket; row expansion lists invoice lines. */}
        <FrameTable caption="Giá bán theo sản phẩm và kỳ" headings={headings} rightAligned={[2, 3, 4, 5]} />
      </FrameSection>
      <FrameSection title="Dòng hóa đơn của kỳ đã chọn">
        {/* TODO(api): invoice lines of the selected product and time bucket. */}
        <FrameTable caption="Dòng hóa đơn của kỳ đã chọn" headings={DETAIL_HEADINGS} rightAligned={[3, 4]} />
      </FrameSection>
      <p className={s.muted}>Không tính hóa đơn đã hủy và hóa đơn đã có phiếu trả hàng; đơn giá của dòng hóa đơn không bị giảm giá, giảm giá sau bán hay thu khác chia vào.</p>
    </ReportScreenShell>
  );
}
