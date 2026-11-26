"use client";
import { SelectBox } from "@/components/ui/select-box";
import { Switch } from "@/components/ui/switch";
import { TimeRangeMenu } from "@/components/ui/management-screen/time-range-menu";
import type { TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import type { WaterFilters } from "./water-history-model";
import local from "./water-screen.module.css";

type Props = {
  time: TimeRangeValue; filters: WaterFilters; rafts: readonly (readonly [string, string])[]; canReset: boolean; note?: string;
  onTime(value: TimeRangeValue): void; onFilter<K extends keyof WaterFilters>(key: K, value: WaterFilters[K]): void; onReset(): void;
};

/** One row in the header of the measurement card: time and status go to the backend; raft and "chỉ vượt ngưỡng" narrow the rows already read. */
export function WaterFilterStrip({ time, filters, rafts, canReset, note, onTime, onFilter, onReset }: Props) {
  return <div className={local.strip}>
    <TimeRangeMenu label="Thời gian đo" value={time} onChange={onTime} allLabel="3 tháng gần nhất" />
    <SelectBox aria-label="Bè đo" className={local.stripSelect} value={filters.raftId} onChange={event => onFilter("raftId", event.target.value)}>
      <option value="">Tất cả bè</option>
      {rafts.map(([id, code]) => <option key={id} value={id}>{code}</option>)}
    </SelectBox>
    <SelectBox aria-label="Trạng thái" className={local.stripSelect} value={filters.status} onChange={event => onFilter("status", event.target.value)}>
      <option value="Active">Đang hiệu lực</option><option value="Voided">Đã hủy</option><option value="">Tất cả trạng thái</option>
    </SelectBox>
    <label className={local.stripSwitch}><Switch checked={filters.exceeded} onChange={event => onFilter("exceeded", event.target.checked)} />Chỉ vượt ngưỡng</label>
    {canReset && <button type="button" className={local.stripLink} onClick={onReset}>Đặt lại</button>}
    {note && <span role="status">{note}</span>}
  </div>;
}
