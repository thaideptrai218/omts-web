"use client";
import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import type { TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { RailHead } from "@/features/farming-management/detail-parts";
import styles from "@/features/farming-management/farming-management.module.css";
import type { WaterFilters } from "./water-history-model";
import local from "./water-screen.module.css";

type Props = {
  zones: readonly ApiRecord[]; zoneId: string; time: TimeRangeValue; filters: WaterFilters; rafts: readonly (readonly [string, string])[]; canReset: boolean;
  onZone(zoneId: string): void; onTime(value: TimeRangeValue): void; onFilter<K extends keyof WaterFilters>(key: K, value: WaterFilters[K]): void; onReset(): void;
};

/** Filter column: zone and time range go to the backend; status, raft and "vượt ngưỡng" narrow the rows already read. */
export function WaterZoneFilters({ zones, zoneId, time, filters, rafts, canReset, onZone, onTime, onFilter, onReset }: Props) {
  return <>
    <RailHead canReset={canReset} onReset={onReset} />
    <FilterGroup legend="Vùng nuôi"><select aria-label="Vùng nuôi" className={styles.railSelect} value={zoneId} onChange={event => onZone(event.target.value)}>
      <option value="">Tất cả vùng (tổng quan)</option>
      {zones.map(zone => <option key={zone.id} value={zone.id}>{String(zone.name)}{zone.statusId === 102 ? " (ngừng sử dụng)" : ""}</option>)}
    </select></FilterGroup>
    {zoneId && <>
      <TimeRangeFilter legend="Thời gian đo" value={time} onChange={onTime} />
      {time.kind === "preset" && time.preset === "all" && <p className={local.railHint}>Chưa chọn mốc: danh sách lấy 3 tháng gần nhất, biểu đồ 12 tháng.</p>}
      <FilterPills legend="Trạng thái" name="water-status" value={filters.status} options={[["Active", "Đang hiệu lực"], ["Voided", "Đã hủy"]]} onChange={value => onFilter("status", value)} />
      <FilterGroup legend="Bè đo"><select aria-label="Bè đo" className={styles.railSelect} value={filters.raftId} onChange={event => onFilter("raftId", event.target.value)}>
        <option value="">Tất cả bè</option>
        {rafts.map(([id, code]) => <option key={id} value={id}>{code}</option>)}
      </select></FilterGroup>
      <FilterGroup legend="Cảnh báo"><label className={local.check}><input type="checkbox" checked={filters.exceeded} onChange={event => onFilter("exceeded", event.target.checked)} />Chỉ số vượt ngưỡng</label></FilterGroup>
    </>}
  </>;
}
