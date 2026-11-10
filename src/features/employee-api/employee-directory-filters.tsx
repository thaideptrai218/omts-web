import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import styles from "./employee-directory.module.css";

export function EmployeeDirectoryFilters({ statusId, setStatusId, zoneId, setZoneId, zones, onReset, hasFilters }: {
  statusId: string; setStatusId(value: string): void; zoneId: string; setZoneId(value: string): void;
  zones: ApiRecord[]; onReset(): void; hasFilters: boolean;
}) {
  return <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilters} onClick={onReset}>Đặt lại</button></div>
    <FilterPills legend="Tình trạng làm việc" name="employee-status" value={statusId} options={[["401", "Đang làm việc"], ["402", "Đã nghỉ việc"]]} onChange={setStatusId} />
    <FilterGroup legend="Vùng làm việc"><select aria-label="Vùng làm việc" className={styles.zoneSelect} value={zoneId} onChange={event => setZoneId(event.target.value)}>
      <option value="">Tất cả vùng</option>
      {zones.map(zone => <option key={zone.id} value={zone.id}>{String(zone.code)} · {String(zone.name)}{zone.statusId === 102 || zone.status === "Discontinued" ? " (đã ngừng)" : ""}</option>)}
    </select></FilterGroup>
  </>;
}
