import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { EmployeeTypeFilter } from "./employee-type-filter";
import type { AccountFilter } from "./employee-account-filter";
import styles from "./employee-directory.module.css";

export type EmployeeDirectoryFilterProps = {
  employeeType: string; setEmployeeType(value: string): void;
  statusId: string; setStatusId(value: string): void;
  zoneId: string; setZoneId(value: string): void; zones: ApiRecord[];
  /** Whether the employee has an account: the Owner only (`accountFilter` absent for everyone else). */
  accountFilter?: AccountFilter; setAccountFilter?(value: AccountFilter): void;
  onReset(): void; hasFilters: boolean;
};

/** Tình trạng first like KiotViet, then the kind of employee and the working zone; every change drives the server query. */
export function EmployeeDirectoryFilters({ employeeType, setEmployeeType, statusId, setStatusId, zoneId, setZoneId, zones, onReset, hasFilters, accountFilter, setAccountFilter }: EmployeeDirectoryFilterProps) {
  return <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilters} onClick={onReset}>Đặt lại</button></div>
    <FilterPills legend="Tình trạng" name="employee-status" value={statusId} options={[["401", "Đang làm việc"], ["402", "Đã nghỉ"]]} onChange={setStatusId} />
    <EmployeeTypeFilter value={employeeType} onChange={setEmployeeType} />
    <FilterGroup legend="Vùng làm việc"><SelectBox aria-label="Vùng làm việc" className={styles.zoneSelect} value={zoneId} onChange={event => setZoneId(event.target.value)}>
      <option value="">Tất cả vùng</option>
      {zones.map(zone => <option key={zone.id} value={zone.id}>{String(zone.code)} · {String(zone.name)}{zone.statusId === 102 ? " (ngừng sử dụng)" : ""}</option>)}
    </SelectBox></FilterGroup>
    {accountFilter !== undefined && setAccountFilter && <FilterPills legend="Tài khoản đăng nhập" name="employee-account" value={accountFilter}
      options={[["has", "Có tài khoản"], ["none", "Chưa có tài khoản"]]} onChange={value => setAccountFilter(value as AccountFilter)} />}
  </>;
}
