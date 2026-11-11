"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { groupingLabel, groupingSchema, type Grouping } from "./contracts";
import type { ZoneOption } from "./use-yield-report";
import type { Filters } from "./yield-logic";
import s from "./yield-screen.module.css";

type Props = {
  filters: Filters; zones: ZoneOption[]; zonesLoading: boolean; zonesError?: string; problem: string | null; busy: boolean;
  onChange(patch: Partial<Filters>): void; onApply(): void; onReset(): void; onReloadZones(): void;
};

/** Cột lọc bên trái: kỳ báo cáo, vùng nuôi (nhiều vùng), cách gộp. Backend không lọc theo bè/làn nên không có ô đó. */
export function YieldFilterPanel({ filters, zones, zonesLoading, zonesError, problem, busy, onChange, onApply, onReset, onReloadZones }: Props) {
  const [time, setTime] = useState<TimeRangeValue>(() => presetValue("thisMonth"));
  const toggle = (id: string) => onChange({ zoneIds: filters.zoneIds.includes(id) ? filters.zoneIds.filter((z) => z !== id) : [...filters.zoneIds, id] });
  return (
    <form className={s.form} onSubmit={(e) => { e.preventDefault(); onApply(); }}>
      <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} onClick={() => { setTime(presetValue("thisMonth")); onReset(); }} disabled={busy}>Đặt lại</button></div>
      <TimeRangeFilter legend="Thời gian thu hoạch" value={time} onChange={(next) => { setTime(next); onChange({ from: next.from, to: next.to }); }} />
      <FilterGroup legend="Gộp theo">
        {groupingSchema.options.map((value: Grouping) => <label key={value} className={s.check}><input type="radio" name="groupBy" disabled={busy} checked={filters.groupBy === value} onChange={() => onChange({ groupBy: value })} />{groupingLabel[value]}</label>)}
      </FilterGroup>
      <fieldset className={s.group} disabled={busy || zonesLoading}><legend>Vùng nuôi</legend>
        {zonesLoading && <p className={s.muted} role="status">Đang tải danh sách vùng...</p>}
        {zonesError && <p className={s.error} role="alert">{zonesError} <button type="button" className={s.linkBtn} onClick={onReloadZones}>Tải lại</button></p>}
        {!zonesLoading && !zonesError && !zones.length && <p className={s.muted}>Chưa có vùng nuôi nào để lọc.</p>}
        {zones.map((zone) => <label key={zone.id} className={s.check}><input type="checkbox" checked={filters.zoneIds.includes(zone.id)} onChange={() => toggle(zone.id)} />{zone.label}</label>)}
        {zones.length > 0 && <p className={s.muted}>{filters.zoneIds.length ? `Đã chọn ${filters.zoneIds.length} vùng.` : "Không chọn vùng nào: xem tất cả vùng của bạn."}</p>}
      </fieldset>
      {problem && <p className={s.error} role="alert">{problem}</p>}
      <Button type="submit" className="w-full" disabled={busy || !!problem}>{busy ? "Đang tải..." : "Xem báo cáo"}</Button>
    </form>
  );
}
