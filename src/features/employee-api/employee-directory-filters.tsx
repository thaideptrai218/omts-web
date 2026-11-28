import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { ZoneFilterField, type ZoneFilter } from "@/features/api-workspace/zone-filter";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { EmployeeTypeFilter } from "./employee-type-filter";
import type { AccountFilter } from "./employee-account-filter";
import styles from "./employee-directory.module.css";

export type EmployeeDirectoryFilterProps = {
  employeeType: string; setEmployeeType(value: string): void;
  statusId: string; setStatusId(value: string): void;
  /** The zone filter is the header selection; `onZoneChange` lets the screen guard unsaved edits and reset paging first. */
  zoneFilter: ZoneFilter; onZoneChange(apply: () => void): void;
  /** A zone the header does not list (a discontinued one named by a link): shown as a read-only choice until the rail is set back to the header. */
  pinnedZone?: ApiRecord; onClearPinnedZone(): void;
  /** Whether the employee has an account: the Owner only (`accountFilter` absent for everyone else). */
  accountFilter?: AccountFilter; setAccountFilter?(value: AccountFilter): void;
  onReset(): void; hasFilters: boolean;
};

/** Tình trạng first like KiotViet, then the kind of employee and the working zone; every change drives the server query. */
export function EmployeeDirectoryFilters({ employeeType, setEmployeeType, statusId, setStatusId, zoneFilter, onZoneChange, pinnedZone, onClearPinnedZone, onReset, hasFilters, accountFilter, setAccountFilter }: EmployeeDirectoryFilterProps) {
  return <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilters} onClick={onReset}>Đặt lại</button></div>
    <FilterPills legend="Tình trạng" name="employee-status" value={statusId} options={[["401", "Đang làm việc"], ["402", "Đã nghỉ"]]} onChange={setStatusId} />
    <EmployeeTypeFilter value={employeeType} onChange={setEmployeeType} />
    {pinnedZone ? <FilterGroup legend="Vùng làm việc"><SelectBox aria-label="Vùng làm việc" className={styles.zoneSelect} value={String(pinnedZone.id)} onChange={event => { if (!event.target.value) onClearPinnedZone(); }}>
      <option value="">Vùng đang chọn ở thanh trên</option>
      <option value={String(pinnedZone.id)}>{String(pinnedZone.code)} · {String(pinnedZone.name)} (ngừng sử dụng)</option>
    </SelectBox></FilterGroup>
      : <ZoneFilterField filter={zoneFilter} legend="Vùng làm việc" className={styles.zoneSelect} beforeChange={onZoneChange} />}
    {accountFilter !== undefined && setAccountFilter && <FilterPills legend="Tài khoản đăng nhập" name="employee-account" value={accountFilter}
      options={[["has", "Có tài khoản"], ["none", "Chưa có tài khoản"]]} onChange={value => setAccountFilter(value as AccountFilter)} />}
  </>;
}
