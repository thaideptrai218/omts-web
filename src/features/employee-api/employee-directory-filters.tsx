import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import { fixedRoleLabels } from "@/features/account-access/user-account-model";
import type { AccountFilters } from "./employee-account-filter";
import styles from "./employee-directory.module.css";

export type EmployeeDirectoryFilterProps = {
  employeeType: string; setEmployeeType(value: string): void;
  statusId: string; setStatusId(value: string): void;
  zoneId: string; setZoneId(value: string): void; zones: ApiRecord[];
  jobTypeId: string; setJobTypeId(value: string): void; jobTypes: { id: string; name: string }[];
  /** Login, role and zone of the login: the Owner only (`accountFilters` absent for everyone else). */
  accountFilters?: AccountFilters; setAccountFilters?(value: AccountFilters): void;
  onReset(): void; hasFilters: boolean;
};

/** Classification first (Loại nhân viên), then status, zone and job type; every change drives the server query. */
export function EmployeeDirectoryFilters({ employeeType, setEmployeeType, statusId, setStatusId, zoneId, setZoneId, zones, jobTypeId, setJobTypeId, jobTypes, onReset, hasFilters, accountFilters, setAccountFilters }: EmployeeDirectoryFilterProps) {
  // The logins no employee holds have none of the employee filters (type, status, zone, job), so only the login filter stays.
  const unlinked = accountFilters?.account === "unlinked";
  return <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilters} onClick={onReset}>Đặt lại</button></div>
    {!unlinked && <>
    <FilterPills legend="Loại nhân viên" name="employee-type" value={employeeType} options={[["SeasonalWorker", "Thời vụ"], ["Staff", "Nội bộ"]]} onChange={setEmployeeType} />
    <FilterPills legend="Tình trạng làm việc" name="employee-status" value={statusId} options={[["401", "Đang làm việc"], ["402", "Đã nghỉ việc"]]} onChange={setStatusId} />
    <FilterGroup legend="Vùng làm việc"><SelectBox aria-label="Vùng làm việc" className={styles.zoneSelect} value={zoneId} onChange={event => setZoneId(event.target.value)}>
      <option value="">Tất cả vùng</option>
      {zones.map(zone => <option key={zone.id} value={zone.id}>{String(zone.code)} · {String(zone.name)}{zone.statusId === 102 || zone.status === "Discontinued" ? " (đã ngừng)" : ""}</option>)}
    </SelectBox></FilterGroup>
    <FilterGroup legend="Loại công việc"><SelectBox aria-label="Loại công việc" className={styles.zoneSelect} value={jobTypeId} onChange={event => setJobTypeId(event.target.value)}>
      <option value="">Tất cả loại công việc</option>
      {jobTypes.map(job => <option key={job.id} value={job.id}>{job.name}</option>)}
    </SelectBox></FilterGroup>
    </>}
    {accountFilters && setAccountFilters && <>
      <FilterPills legend="Tài khoản đăng nhập" name="employee-account" value={accountFilters.account}
        options={[["has", "Đã có tài khoản"], ["none", "Chưa có tài khoản"], ["unlinked", "Tài khoản chưa gắn nhân viên"]]}
        onChange={value => setAccountFilters(value === "none" || value === "unlinked" ? { account: value, role: "", grantZoneId: "" } : { ...accountFilters, account: value as AccountFilters["account"] })} />
      {(accountFilters.account === "" || accountFilters.account === "has") && <>
        <FilterPills legend="Vai trò" name="employee-role" value={accountFilters.role} options={[["ZONE_MANAGER", fixedRoleLabels.ZONE_MANAGER], ["ACCOUNTANT", fixedRoleLabels.ACCOUNTANT], ["NONE", "Chưa có vai trò"]]} onChange={value => setAccountFilters({ ...accountFilters, role: value })} />
        <FilterGroup legend="Vùng phụ trách"><SelectBox aria-label="Vùng phụ trách" className={styles.zoneSelect} value={accountFilters.grantZoneId} onChange={event => setAccountFilters({ ...accountFilters, grantZoneId: event.target.value })}>
          <option value="">Tất cả vùng</option>
          {zones.filter(zone => zone.statusId !== 102 && zone.status !== "Discontinued").map(zone => <option key={zone.id} value={zone.id}>{String(zone.name)}</option>)}
        </SelectBox></FilterGroup>
      </>}
    </>}
  </>;
}
