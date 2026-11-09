"use client";
import { Button } from "@/components/ui/button";
import { FilterWorkspace } from "@/components/ui/filter-workspace";
import { Field } from "@/features/operations/ui";
import { groupingLabel, groupingSchema, type Grouping } from "./contracts";
import type { ZoneOption } from "./use-yield-report";
import type { Filters } from "./yield-logic";
import s from "./yield-screen.module.css";

type Props = {
  filters: Filters; zones: ZoneOption[]; zonesLoading: boolean; zonesError?: string; problem: string | null; busy: boolean;
  canExport: boolean; exporting: boolean; onChange(patch: Partial<Filters>): void; onApply(): void; onReset(): void; onExport(): void; onReloadZones(): void;
  children: React.ReactNode;
};

/** Cột lọc bên trái: kỳ báo cáo, vùng nuôi (nhiều vùng), cách gộp. Backend không lọc theo bè/làn nên không có ô đó. */
export function YieldFilterPanel({ filters, zones, zonesLoading, zonesError, problem, busy, canExport, exporting, onChange, onApply, onReset, onExport, onReloadZones, children }: Props) {
  const toggle = (id: string) => onChange({ zoneIds: filters.zoneIds.includes(id) ? filters.zoneIds.filter((z) => z !== id) : [...filters.zoneIds, id] });
  return (
    <FilterWorkspace label="Bộ lọc báo cáo" reset={<button type="button" className={s.linkBtn} onClick={onReset} disabled={busy}>Đặt lại</button>}
      filters={<form className={s.form} onSubmit={(e) => { e.preventDefault(); onApply(); }}>
        {canExport && <Button type="button" className="w-full" variant="secondary" disabled={exporting || busy} onClick={onExport}>{exporting ? "Đang xuất file..." : "Xuất Excel"}</Button>}
        <fieldset className={s.group} disabled={busy}><legend>Thời gian thu hoạch</legend>
          <Field type="date" label="Từ ngày" value={filters.from} max={filters.to || undefined} onChange={(e) => onChange({ from: e.target.value })} />
          <Field type="date" label="Đến ngày" value={filters.to} min={filters.from || undefined} onChange={(e) => onChange({ to: e.target.value })} />
        </fieldset>
        <fieldset className={s.group} disabled={busy || zonesLoading}><legend>Vùng nuôi</legend>
          {zonesLoading && <p className={s.muted} role="status">Đang tải danh sách vùng...</p>}
          {zonesError && <p className={s.error} role="alert">{zonesError} <button type="button" className={s.linkBtn} onClick={onReloadZones}>Tải lại</button></p>}
          {!zonesLoading && !zonesError && !zones.length && <p className={s.muted}>Chưa có vùng nuôi nào để lọc.</p>}
          {zones.map((zone) => <label key={zone.id} className={s.check}><input type="checkbox" checked={filters.zoneIds.includes(zone.id)} onChange={() => toggle(zone.id)} />{zone.label}</label>)}
          {zones.length > 0 && <p className={s.muted}>{filters.zoneIds.length ? `Đã chọn ${filters.zoneIds.length} vùng.` : "Không chọn vùng nào: xem tất cả vùng của bạn."}</p>}
        </fieldset>
        <fieldset className={s.group} disabled={busy}><legend>Gộp theo</legend>
          {groupingSchema.options.map((value: Grouping) => <label key={value} className={s.check}><input type="radio" name="groupBy" checked={filters.groupBy === value} onChange={() => onChange({ groupBy: value })} />{groupingLabel[value]}</label>)}
        </fieldset>
        {problem && <p className={s.error} role="alert">{problem}</p>}
        <Button type="submit" className="w-full" disabled={busy || !!problem}>{busy ? "Đang tải..." : "Xem báo cáo"}</Button>
      </form>}>
      {children}
    </FilterWorkspace>
  );
}
