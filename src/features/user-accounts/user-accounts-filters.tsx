"use client";
import { SelectBox } from "@/components/ui/select-box";
import { FilterGroup, FilterPills } from "@/components/ui/management-screen/management-layout";
import { managementStyles } from "@/components/ui/management-screen/management-table";
import { accountStateLabel, hasUserFilters, type AccountState, type UserFilters } from "@/features/account-access/user-account-list-model";
import { fixedRoleLabels } from "@/features/account-access/user-account-model";
import type { UserZone } from "@/features/account-access/use-user-accounts";
import styles from "./user-accounts.module.css";

/** Filters of the account list: role, zone, state, whether an employee is linked (deleted accounts are never listed). */
export function UserAccountsFilters({ filters, setFilters, zones, onReset }: {
  filters: UserFilters; setFilters(next: UserFilters): void; zones: readonly UserZone[]; onReset(): void;
}) {
  const set = (patch: Partial<UserFilters>) => setFilters({ ...filters, ...patch });
  const keys: AccountState[] = ["active", "pending", "locked"];
  const states = keys.map((key) => [key, accountStateLabel[key]] as const);
  return <>
    <div className={styles.railHead}><strong>Bộ lọc</strong><button type="button" className={managementStyles.linkButton} disabled={!hasUserFilters(filters)} onClick={onReset}>Đặt lại</button></div>
    <FilterPills legend="Vai trò" name="account-role" value={filters.role} options={[["ZONE_MANAGER", fixedRoleLabels.ZONE_MANAGER], ["ACCOUNTANT", fixedRoleLabels.ACCOUNTANT], ["NONE", "Chưa có vai trò"]]} onChange={(role) => set({ role })} />
    <FilterGroup legend="Vùng"><SelectBox aria-label="Vùng" className={styles.select} value={filters.zoneId} onChange={(event) => set({ zoneId: event.target.value })}>
      <option value="">Tất cả vùng</option>
      {zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
    </SelectBox></FilterGroup>
    <FilterPills legend="Trạng thái" name="account-state" value={filters.state} options={states} onChange={(state) => set({ state: state as UserFilters["state"] })} />
    <FilterPills legend="Gắn nhân viên" name="account-employee" value={filters.employee} options={[["yes", "Có"], ["no", "Không"]]} onChange={(employee) => set({ employee: employee as UserFilters["employee"] })} />
  </>;
}
