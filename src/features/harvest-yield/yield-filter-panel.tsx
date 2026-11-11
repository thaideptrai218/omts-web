"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { businessToday } from "@/features/operations/ui";
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
  const [time, setTime] = useState<TimeRangeValue>(() => {
    if (filters.from === "0001-01-01") return allTime;
    const month = presetValue("thisMonth");
    return filters.from === month.from && filters.to === month.to ? month : { kind: "custom", from: filters.from, to: filters.to };
  });
  return (
    <form className={s.form} onSubmit={(e) => { e.preventDefault(); onApply(); }}>
      <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} onClick={() => { setTime(presetValue("thisMonth")); onReset(); }} disabled={busy}>Đặt lại</button></div>
      <TimeRangeFilter legend="Thời gian thu hoạch" value={time} onChange={(next) => { setTime(next); onChange({ from: next.from || "0001-01-01", to: next.to || businessToday() }); }} />
      <FilterGroup legend="Gộp theo">
        <div className={s.pills}>{groupingSchema.options.map((value: Grouping) => <button key={value} type="button" className={s.pill} aria-pressed={filters.groupBy === value} disabled={busy} onClick={() => onChange({ groupBy: value })}>{groupingLabel[value]}</button>)}</div>
      </FilterGroup>
      <fieldset className={s.group} disabled={busy || zonesLoading}><legend>Vùng nuôi</legend>
        {zonesLoading && <p className={s.muted} role="status">Đang tải danh sách vùng...</p>}
        {zonesError && <p className={s.error} role="alert">{zonesError} <button type="button" className={s.linkBtn} onClick={onReloadZones}>Tải lại</button></p>}
        {!zonesLoading && !zonesError && !zones.length && <p className={s.muted}>Chưa có vùng nuôi nào để lọc.</p>}
        {zones.length > 0 && <>
          <SelectBox aria-label="Thêm vùng nuôi vào bộ lọc" className="omts-control" value="" onChange={event => { const id = event.target.value; if (id && !filters.zoneIds.includes(id)) onChange({ zoneIds: [...filters.zoneIds, id] }); }}>
            <option value="">{filters.zoneIds.length ? "Chọn thêm vùng" : "Tất cả vùng"}</option>
            {zones.filter(zone => !filters.zoneIds.includes(zone.id)).map(zone => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
          </SelectBox>
          <div className={s.pills}>{filters.zoneIds.map(id => <button key={id} type="button" className={s.pill} aria-label={`Bỏ lọc vùng ${zones.find(zone => zone.id === id)?.label ?? id}`} onClick={() => onChange({ zoneIds: filters.zoneIds.filter(value => value !== id) })}>{zones.find(zone => zone.id === id)?.label ?? id} ×</button>)}</div>
        </>}
      </fieldset>
      {problem && <p className={s.error} role="alert">{problem}</p>}
      <Button type="submit" className="w-full" disabled={busy || !!problem}>{busy ? "Đang tải..." : "Xem báo cáo"}</Button>
    </form>
  );
}
