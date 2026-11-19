"use client";
import { useState } from "react";
import { DatePickerField } from "@/components/ui/management-screen/date-picker-field";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import screen from "@/components/ui/management-screen/management-screen.module.css";
import { DateRangeField } from "@/components/ui/management-screen/time-range-filter";
import { customRange } from "@/components/ui/management-screen/time-range-limits";
import type { EndOfDayConcern, EndOfDayOrientation } from "./end-of-day-contracts";
import { ConcernFields, usePeopleOptions } from "./end-of-day-filter-fields";
import { CONCERN_OPTIONS, ORIENTATION_OPTIONS, type EndOfDayFilters, type EndOfDayLayout } from "./end-of-day-filters-model";
import { ReportChoice, ReportFilterRail, type useReportZones } from "./report-filter-rail";
import s from "./report-live.module.css";

const LAYOUT_OPTIONS: readonly (readonly [EndOfDayLayout, string])[] = [["table", "Dạng bảng"], ["paper", "Báo cáo"]];

/** Giờ gõ tay dạng HH:mm (tự chèn dấu hai chấm); giá trị sai khi rời ô thì trả lại giờ cũ. Nhãn Từ/Đến luôn hiện trong ô nền riêng như lọc khoảng số. */
function ClockInput({ prefix, label, value, fallback, onChange }: Readonly<{ prefix: string; label: string; value: string; fallback: string; onChange(value: string): void }>) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const match = /^(\d{1,2}):?(\d{2})$/.exec(draft.trim());
    if (match && Number(match[1]) < 24 && Number(match[2]) < 60) onChange(`${match[1].padStart(2, "0")}:${match[2]}`);
    setDraft(null);
  };
  const mask = (raw: string) => { const digits = raw.replace(/\D/g, "").slice(0, 4); return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits; };
  return (
    <label className={screen.rangeField}><span>{prefix}</span>
      <input aria-label={label} inputMode="numeric" maxLength={5} placeholder={fallback} value={draft ?? (value || fallback)}
        onChange={(event) => setDraft(mask(event.target.value))} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); }} />
    </label>
  );
}

type TimeProps = Readonly<{ filters: EndOfDayFilters; today: string; onChange(patch: Partial<EndOfDayFilters>): void }>;

/**
 * Thời gian như KiotViet: (1) một ngày, ngay dưới là giờ Từ/Đến (luôn hiện, mặc định cả ngày); (2) một khoảng ngày mở lịch hai tháng.
 * Bấm vào ô nào thì chọn luôn kiểu đó. Không chọn được ngày sau hôm nay.
 */
function TimeFields({ filters, today, onChange }: TimeProps) {
  const day = filters.timeMode === "day";
  return (
    <FilterGroup legend="Thời gian">
      <div className={s.timeRow} onFocusCapture={() => { if (!day) onChange({ timeMode: "day" }); }}>
        <input type="radio" name="eod-time-mode" className="omts-check" aria-label="Theo một ngày" checked={day} onChange={() => onChange({ timeMode: "day" })} />
        <DatePickerField label="Ngày báo cáo" value={filters.day} max={today} onChange={(value) => onChange({ timeMode: "day", day: value })} />
      </div>
      <div className={s.clockRow} data-inactive={!day || undefined} onFocusCapture={() => { if (!day) onChange({ timeMode: "day" }); }}>
        <ClockInput prefix="Từ" label="Từ giờ" value={filters.startTime} fallback="00:00" onChange={(startTime) => onChange({ timeMode: "day", startTime })} />
        <ClockInput prefix="Đến" label="Đến giờ" value={filters.endTime} fallback="23:59" onChange={(endTime) => onChange({ timeMode: "day", endTime })} />
      </div>
      <div className={s.timeRow}>
        <input type="radio" name="eod-time-mode" className="omts-check" aria-label="Khoảng ngày tùy chỉnh" checked={!day} onChange={() => onChange({ timeMode: "range" })} />
        <DateRangeField label="Khoảng ngày" value={filters.range} max={today} onOpen={() => onChange({ timeMode: "range" })} onChange={(from, to) => onChange({ timeMode: "range", range: customRange(from, to) })} />
      </div>
    </FilterGroup>
  );
}

type RailProps = Readonly<{
  draft: EndOfDayFilters; today: string; zones: ReturnType<typeof useReportZones>; problem: string | null; busy: boolean;
  onChange(patch: Partial<EndOfDayFilters>): void; onApplyNow(patch: Partial<EndOfDayFilters>): void; onApply(): void; onReset(): void;
}>;

/** Cột lọc của báo cáo Cuối ngày (theo DESIGN_GUIDELINES 1.3): mối quan tâm (nhóm phân loại) đầu tiên, rồi kiểu hiển thị, hướng giấy (dạng Báo cáo), thời gian, vùng nuôi và tiêu chí riêng. Lựa chọn ít và cố định dùng pills. */
export function EndOfDayFilterRail({ draft, today, zones, problem, busy, onChange, onApplyNow, onApply, onReset }: RailProps) {
  const people = usePeopleOptions();
  return (
    <ReportFilterRail zoneIds={draft.zoneIds} onZones={(zoneIds) => onChange({ zoneIds })} zones={zones} showZones={draft.concern !== "money"} problem={problem} busy={busy} onApply={onApply} onReset={onReset}
      lead={<>
        <ReportChoice legend="Mối quan tâm" value={draft.concern} options={CONCERN_OPTIONS} onChange={(concern) => onApplyNow({ concern: concern as EndOfDayConcern })} />
        <ReportChoice legend="Kiểu hiển thị" value={draft.layout} options={LAYOUT_OPTIONS} onChange={(layout) => onApplyNow({ layout: layout as EndOfDayLayout })} />
        {draft.layout === "paper" && <ReportChoice legend="Hướng giấy" value={draft.orientation} options={ORIENTATION_OPTIONS} onChange={(orientation) => onApplyNow({ orientation: orientation as EndOfDayOrientation })} />}
        <TimeFields filters={draft} today={today} onChange={onChange} />
      </>}>
      <ConcernFields concern={draft.concern} filters={draft} people={people} onChange={onChange} />
      <p className={s.muted}>Đổi kiểu hiển thị, hướng giấy hoặc mối quan tâm có hiệu lực ngay; các lọc còn lại áp dụng khi bấm Xem báo cáo.</p>
    </ReportFilterRail>
  );
}
