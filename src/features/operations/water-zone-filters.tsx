"use client";
import { FilterChecks } from "@/components/ui/filter-checks";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { Field, Select } from "./ui";

const STATUS_FILTER_OPTIONS: [string, string][] = [
  ["Confirmed", "Đã xác nhận"],
  ["Draft", "Nháp"],
  ["Corrected", "Đã hiệu chỉnh"],
  ["Voided", "Đã hủy"],
];

type WaterZoneFiltersProps = {
  availableZones: ApiRecord[];
  filters: { from: string; to: string; status: string };
  zoneId: string;
  onDateChange(key: "from" | "to", value: string): void;
  onStatusChange(status: string): void;
  onZoneChange(zoneId: string): void;
};

/** Zone, date range and status filters shown in the water screen's filter workspace. */
export function WaterZoneFilters({ availableZones, filters, zoneId, onDateChange, onStatusChange, onZoneChange }: WaterZoneFiltersProps) {
  return <>
    <Select label="Vùng nuôi *" value={zoneId} onChange={(e) => onZoneChange(e.target.value)}>
      <option value="">Chọn vùng được cấp</option>
      {availableZones.map((row) => (
        <option key={row.id} value={row.id}>{String(row.name)}{row.statusId === 102 ? " (ngừng dùng)" : ""}</option>
      ))}
    </Select>
    <Field label="Từ ngày" type="date" value={filters.from} onChange={(e) => onDateChange("from", e.target.value)} />
    <Field label="Đến ngày" type="date" value={filters.to} onChange={(e) => onDateChange("to", e.target.value)} />
    <FilterChecks
      label="Trạng thái"
      value={filters.status === "All" ? "" : filters.status}
      options={STATUS_FILTER_OPTIONS}
      onChange={onStatusChange}
    />
  </>;
}
