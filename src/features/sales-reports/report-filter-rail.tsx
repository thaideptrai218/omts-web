"use client";
import { useCallback, useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FilterGroup } from "@/components/ui/management-screen/management-layout";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import type { TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { SelectBox } from "@/components/ui/select-box";
import { useApiWorkspace } from "@/features/api-workspace/api-workspace-shell";
import { loadOptions } from "@/features/operations/lookups";
import { operationAllowed, type OperationArea } from "@/features/operations/permissions";
import { useRemote } from "@/features/operations/ui";
import s from "./report-live.module.css";

export type ReportZoneOption = Readonly<{ id: string; label: string }>;

/** Vùng nuôi mà tài khoản được xem báo cáo `area` (đúng quyền theo vùng); dùng cho ô lọc vùng và để biết có bao nhiêu vùng. */
export function useReportZones(area: OperationArea) {
  const workspace = useApiWorkspace();
  const zones = useRemote(useCallback((signal: AbortSignal) => loadOptions("zones", signal), []));
  const options = useMemo<ReportZoneOption[]>(() => (zones.data ?? [])
    .filter((zone) => operationAllowed(area, workspace.identity, workspace.permissions.functionPermissions, "View", zone.id))
    .map((zone) => ({ id: zone.id, label: String(zone.name ?? zone.code ?? zone.id) })), [zones.data, area, workspace.identity, workspace.permissions.functionPermissions]);
  return { options, loading: zones.loading, error: zones.error, reload: zones.reload };
}

type RailProps = Readonly<{
  /** Khoảng thời gian; bỏ trống (cùng `onTime`) cho báo cáo theo một ngày, khi đó ô chọn ngày truyền qua `lead`. */
  time?: TimeRangeValue; onTime?(value: TimeRangeValue): void;
  /** Bộ lọc đặt trước cả vùng nuôi (ví dụ ô chọn ngày). */
  lead?: ReactNode;
  zoneIds: readonly string[]; onZones(ids: string[]): void; zones: ReturnType<typeof useReportZones>;
  problem: string | null; busy: boolean; onApply(): void; onReset(): void;
  /** Ẩn ô vùng nuôi cho dữ liệu không chia theo vùng (ví dụ công nợ). */
  showZones?: boolean;
  /** Tiêu chí riêng của từng báo cáo (cách xem, khách hàng, sản phẩm...). */
  children?: ReactNode;
}>;

/** Cột lọc trái dùng chung: kỳ, vùng nuôi (nhiều vùng), tiêu chí riêng, "Xem báo cáo" và "Đặt lại". Đổi ô nào cũng chỉ sửa bản nháp. */
export function ReportFilterRail({ time, onTime, lead, zoneIds, onZones, zones, problem, busy, onApply, onReset, showZones = true, children }: RailProps) {
  const label = (id: string) => zones.options.find((zone) => zone.id === id)?.label ?? id;
  return (
    <form className={s.form} onSubmit={(event) => { event.preventDefault(); onApply(); }}>
      <div className={s.railHead}><strong>Bộ lọc</strong><button type="button" className={s.linkButton} disabled={busy} onClick={onReset}>Đặt lại</button></div>
      {time && onTime && <TimeRangeFilter legend="Thời gian" value={time} onChange={onTime} />}
      {lead}
      {showZones && <FilterGroup legend="Vùng nuôi">
        {zones.loading && <p className={s.muted} role="status">Đang tải danh sách vùng...</p>}
        {zones.error && <p className={s.error} role="alert">{zones.error} <button type="button" className={s.linkButton} onClick={zones.reload}>Tải lại</button></p>}
        {!zones.loading && !zones.error && !zones.options.length && <p className={s.muted}>Chưa có vùng nuôi nào để lọc.</p>}
        {zones.options.length > 0 && <>
          <SelectBox aria-label="Thêm vùng nuôi vào bộ lọc" className="omts-control" value="" disabled={busy} onChange={(event) => { const id = event.target.value; if (id && !zoneIds.includes(id)) onZones([...zoneIds, id]); }}>
            <option value="">{zoneIds.length ? "Chọn thêm vùng" : "Tất cả vùng"}</option>
            {zones.options.filter((zone) => !zoneIds.includes(zone.id)).map((zone) => <option key={zone.id} value={zone.id}>{zone.label}</option>)}
          </SelectBox>
          <div className={s.pills}>{zoneIds.map((id) => <button key={id} type="button" className={s.pill} aria-label={`Bỏ lọc vùng ${label(id)}`} onClick={() => onZones(zoneIds.filter((value) => value !== id))}>{label(id)} ×</button>)}</div>
        </>}
      </FilterGroup>}
      {children}
      {problem && <p className={s.error} role="alert">{problem}</p>}
      <Button type="submit" className="w-full" disabled={busy || !!problem}>{busy ? "Đang tải..." : "Xem báo cáo"}</Button>
    </form>
  );
}

/** Nhóm nút chọn một giá trị trong tập ngắn cố định (cách xem, cách gộp). */
export function ReportChoice({ legend, value, options, onChange }: Readonly<{ legend: string; value: string; options: readonly (readonly [string, string])[]; onChange(value: string): void }>) {
  return <FilterGroup legend={legend}><div className={s.pills}>{options.map(([key, text]) => <button key={key} type="button" className={s.pill} aria-pressed={value === key} onClick={() => onChange(key)}>{text}</button>)}</div></FilterGroup>;
}
