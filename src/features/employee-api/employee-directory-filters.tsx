import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import type { ApiRecord } from "@/features/api-workspace/workspace-repository";
import styles from "./employee-directory.module.css";

export type EmployeeDirectoryFilterProps = {
  employeeType: string; setEmployeeType(value: string): void;
  statusId: string; setStatusId(value: string): void;
  zoneId: string; setZoneId(value: string): void; zones: ApiRecord[];
  jobTypeId: string; setJobTypeId(value: string): void; jobTypes: { id: string; name: string }[];
  onReset(): void; hasFilters: boolean;
};

/** Classification first (Loại nhân viên), then status, zone and job type; every change drives the server query. */
export function EmployeeDirectoryFilters({ employeeType, setEmployeeType, statusId, setStatusId, zoneId, setZoneId, zones, jobTypeId, setJobTypeId, jobTypes, onReset, hasFilters }: EmployeeDirectoryFilterProps) {
  return <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasFilters} onClick={onReset}>Đặt lại</button></div>
    <FilterPills legend="Loại nhân viên" name="employee-type" value={employeeType} options={[["SeasonalWorker", "Thời vụ"], ["Staff", "Nhân viên"]]} onChange={setEmployeeType} />
    <FilterPills legend="Tình trạng làm việc" name="employee-status" value={statusId} options={[["401", "Đang làm việc"], ["402", "Đã nghỉ việc"]]} onChange={setStatusId} />
    <FilterGroup legend="Vùng làm việc"><SelectBox aria-label="Vùng làm việc" className={styles.zoneSelect} value={zoneId} onChange={event => setZoneId(event.target.value)}>
      <option value="">Tất cả vùng</option>
      {zones.map(zone => <option key={zone.id} value={zone.id}>{String(zone.code)} · {String(zone.name)}{zone.statusId === 102 || zone.status === "Discontinued" ? " (đã ngừng)" : ""}</option>)}
    </SelectBox></FilterGroup>
    <FilterGroup legend="Loại công việc"><SelectBox aria-label="Loại công việc" className={styles.zoneSelect} value={jobTypeId} onChange={event => setJobTypeId(event.target.value)}>
      <option value="">Tất cả loại công việc</option>
      {jobTypes.map(job => <option key={job.id} value={job.id}>{job.name}</option>)}
    </SelectBox></FilterGroup>
  </>;
}
