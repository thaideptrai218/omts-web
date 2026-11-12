"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import { allTime, presetValue, type TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { businessToday } from "@/features/operations/ui";
import { viewGroupingLabel, viewGroupings } from "./contracts";
import type { ZoneOption } from "./use-yield-report";
import { widestYieldFrom, type Filters } from "./yield-logic";
import { statusLabel, type StatusKey } from "./yield-rows";
import s from "./yield-screen.module.css";

type Props = {
  filters: Filters; zones: ZoneOption[]; zonesLoading: boolean; zonesError?: string; problem: string | null; busy: boolean;
  onChange(patch: Partial<Filters>): void; onApply(): void; onReset(): void; onReloadZones(): void;
  /** Bộ lọc áp dụng ngay ở trình duyệt (không gọi lại API): bè lấy từ dữ liệu báo cáo, trạng thái chọn nhiều. */
  scope?: { raftId: string; statuses: StatusKey[] }; rafts?: { id: string; label: string }[]; onScope?(patch: Partial<{ raftId: string; statuses: StatusKey[] }>): void;
};

/** Cột lọc bên trái: kỳ báo cáo, vùng nuôi (nhiều vùng), cách gộp. Backend không lọc theo bè/làn nên không có ô đó. */
export function YieldFilterPanel({ filters, zones, zonesLoading, zonesError, problem, busy, onChange, onApply, onReset, onReloadZones, scope, rafts = [], onScope }: Props) {
  const [time, setTime] = useState<TimeRangeValue>(() => {
    if (filters.from <= widestYieldFrom(filters.to)) return allTime;
    const month = presetValue("thisMonth");
    return filters.from === month.from && filters.to === month.to ? month : { kind: "custom", from: filters.from, to: filters.to };
  });
  return (
    <form className={s.form} onSubmit={(e) => { e.preventDefault(); onApply(); }}>
      <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} onClick={() => { setTime(presetValue("thisMonth")); onReset(); }} disabled={busy}>Đặt lại</button></div>
      <TimeRangeFilter legend="Thời gian thu hoạch" value={time} onChange={(next) => { setTime(next); { const to = next.to || businessToday(); onChange({ from: next.from || widestYieldFrom(to), to }); }; }} />
      <FilterGroup legend="Gộp theo">
        <div className={s.pills}>{viewGroupings.map((value) => <button key={value} type="button" className={s.pill} aria-pressed={filters.groupBy === value} onClick={() => onChange({ groupBy: value })}>{viewGroupingLabel[value]}</button>)}</div>
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
      {scope && onScope && <>
        <fieldset className={s.group}><legend>Bè nuôi</legend>
          <SelectBox aria-label="Lọc theo bè" className="omts-control" value={scope.raftId} onChange={event => onScope({ raftId: event.target.value })}>
            <option value="">Tất cả bè</option>
            {rafts.map(raft => <option key={raft.id} value={raft.id}>{raft.label}</option>)}
          </SelectBox>
        </fieldset>
        <fieldset className={s.group}><legend>Trạng thái số liệu</legend>
          <div className={s.pills}>{(Object.keys(statusLabel) as StatusKey[]).map(key => <button key={key} type="button" className={s.pill} aria-pressed={scope.statuses.includes(key)}
            onClick={() => onScope({ statuses: scope.statuses.includes(key) ? scope.statuses.filter(value => value !== key) : [...scope.statuses, key] })}>{statusLabel[key]}</button>)}</div>
        </fieldset>
      </>}
      {problem && <p className={s.error} role="alert">{problem}</p>}
      <Button type="submit" className="w-full" disabled={busy || !!problem}>{busy ? "Đang tải..." : "Xem báo cáo"}</Button>
    </form>
  );
}
