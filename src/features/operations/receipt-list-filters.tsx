"use client";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { TimeRangeFilter } from "@/components/ui/management-screen/time-range-filter";
import type { TimeRangeValue } from "@/components/ui/management-screen/time-range-model";
import { Field, FilterPanel, Select, statusLabel } from "./ui";

export type ReceiptListFilterValues = {
  code: string;
  zoneId: string;
  supplierId: string;
  raftId: string;
  itemId: string;
  itemGroup: string;
  statusId: string;
};

/** Filter bar of the receipt list; the raft filter only appears after a zone is chosen. */
export function ReceiptListFilters({
  filters,
  filter,
  time,
  onTime,
  zones,
  narrowed,
  suppliers,
  items,
  rafts,
}: {
  filters: ReceiptListFilterValues;
  filter(key: keyof ReceiptListFilterValues, value: string): void;
  time: TimeRangeValue;
  onTime(value: TimeRangeValue): void;
  zones: ApiRecord[] | undefined;
  /** True when the zone picker already narrowed the list to specific zones. */
  narrowed: boolean;
  suppliers: ApiRecord[] | undefined;
  items: ApiRecord[] | undefined;
  rafts: ApiRecord[] | undefined;
}) {
  return (
    <FilterPanel>
      <Field label="Mã phiếu" value={filters.code} onChange={(e) => filter("code", e.target.value)} />
      <Select label="Vùng nuôi" value={filters.zoneId} onChange={(e) => filter("zoneId", e.target.value)}>
        {!narrowed && <option value="">Tất cả vùng được cấp</option>}
        {zones?.map((row) => (
          <option key={row.id} value={row.id}>
            {String(row.name)}
          </option>
        ))}
      </Select>
      <Select label="Nhà cung cấp" value={filters.supplierId} onChange={(e) => filter("supplierId", e.target.value)}>
        <option value="">Tất cả</option>
        {suppliers?.map((row) => (
          <option key={row.id} value={row.id}>
            {String(row.name)}
          </option>
        ))}
      </Select>
      <Select label="Trạng thái" value={filters.statusId} onChange={(e) => filter("statusId", e.target.value)}>
        <option value="">Tất cả</option>
        {[1701, 1702, 1703].map((id) => (
          <option key={id} value={id}>
            {statusLabel(id)}
          </option>
        ))}
      </Select>
      <TimeRangeFilter legend="Thời gian nhập" value={time} onChange={onTime} />
      <Select label="Nhóm vật tư" value={filters.itemGroup} onChange={(e) => filter("itemGroup", e.target.value)}>
        <option value="">Tất cả</option>
        <option value="Seed">Giống</option>
        <option value="Material">Vật tư</option>
        <option value="Other">Khác</option>
      </Select>
      <Select label="Vật tư" value={filters.itemId} onChange={(e) => filter("itemId", e.target.value)}>
        <option value="">Tất cả</option>
        {items?.map((row) => (
          <option key={row.id} value={row.id}>
            {String(row.name)}
          </option>
        ))}
      </Select>
      {filters.zoneId && (
        <Select label="Bè" value={filters.raftId} onChange={(e) => filter("raftId", e.target.value)}>
          <option value="">Tất cả bè</option>
          {rafts?.map((row) => (
            <option key={row.id} value={row.id}>
              {String(row.code)}
            </option>
          ))}
        </Select>
      )}
    </FilterPanel>
  );
}
