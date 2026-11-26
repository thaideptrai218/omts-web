"use client";
import { SelectBox } from "@/components/ui/select-box";
import { ACCOUNTANT_ROLE, ZONE_MANAGER_ROLE, roleLabel } from "./user-account-model";
import { allZonesTakenByOthers, newGrantRow, zonesTakenByOthers, type GrantRow } from "./user-create-model";
import type { UserZone } from "./use-user-accounts";

const chipBase = "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-50";
const chip = (on: boolean) => `${chipBase} ${on ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border-strong bg-surface text-text hover:bg-surface-subtle"}`;

/**
 * "Phân quyền" of the create form: one row per role. A row has the zones (Quản lý vùng: chips for some zones or "Tất cả vùng"; Kế toán
 * always covers every zone) and a role list with the two fixed roles only. A zone shows once across the rows. "+ Thêm phân quyền" adds a row.
 */
export function UserCreateGrantRows({ rows, zones, disabled, zonesNote, onChange }: {
  rows: readonly GrantRow[]; zones: readonly UserZone[]; disabled?: boolean; zonesNote?: string; onChange(next: GrantRow[]): void;
}) {
  const update = (key: number, patch: Partial<GrantRow>) => onChange(rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  const nextKey = () => Math.max(0, ...rows.map((row) => row.key)) + 1;
  return <fieldset className="space-y-3" disabled={disabled}>
    <legend className="mb-1 text-sm font-semibold">Phân quyền</legend>
    {rows.map((row, index) => {
      const taken = zonesTakenByOthers(rows, row.key), allTaken = allZonesTakenByOthers(rows, row.key);
      return <div key={row.key} className="grid gap-2 rounded-card border border-border p-3 sm:grid-cols-[minmax(0,1fr)_12rem]" data-grant-row>
        <div className="order-2 min-w-0 sm:order-1">
          <p className="mb-1 text-xs font-medium text-text-muted">Vùng làm việc</p>
          {row.role === ZONE_MANAGER_ROLE ? <div className="flex flex-wrap gap-2">
            <button type="button" aria-pressed={row.allZones} disabled={allTaken || (!row.allZones && rows.some((other) => other.key !== row.key && other.role === ZONE_MANAGER_ROLE))} className={chip(row.allZones)}
              onClick={() => update(row.key, { allZones: !row.allZones, zoneIds: [] })}>{row.allZones && <span aria-hidden="true">✓</span>}Tất cả vùng</button>
            {zones.filter((zone) => !taken.has(zone.id)).map((zone) => { const on = !row.allZones && row.zoneIds.includes(zone.id); return <button key={zone.id} type="button" aria-pressed={on} disabled={row.allZones}
              className={chip(on)} onClick={() => update(row.key, { zoneIds: on ? row.zoneIds.filter((id) => id !== zone.id) : [...row.zoneIds, zone.id] })}>{on && <span aria-hidden="true">✓</span>}{zone.name}</button>; })}
            {!zones.length && <p className="text-sm text-text-muted">{zonesNote ?? "Chưa có vùng nào đang sử dụng."}</p>}
          </div> : <p className="flex min-h-9 items-center text-sm text-text-muted">{row.role === ACCOUNTANT_ROLE ? "Kế toán làm việc ở tất cả vùng." : "Chọn vai trò trước."}</p>}
        </div>
        <div className="order-1 flex items-start gap-2 sm:order-2">
          <label className="min-w-0 flex-1 text-xs font-medium text-text-muted">Vai trò
            <SelectBox aria-label={`Vai trò của dòng ${index + 1}`} className="omts-control mt-1" value={row.role}
              onChange={(event) => update(row.key, { role: event.target.value as GrantRow["role"], allZones: false, zoneIds: [] })}>
              <option value="">Chọn vai trò</option>
              <option value={ZONE_MANAGER_ROLE}>{roleLabel(ZONE_MANAGER_ROLE)}</option>
              <option value={ACCOUNTANT_ROLE}>{roleLabel(ACCOUNTANT_ROLE)}</option>
            </SelectBox>
          </label>
          {rows.length > 1 && <button type="button" className="mt-6 grid size-9 shrink-0 place-items-center rounded-full border border-border-strong text-lg leading-none hover:bg-surface-subtle" aria-label={`Bỏ dòng phân quyền ${index + 1}`}
            onClick={() => onChange(rows.filter((other) => other.key !== row.key))}>×</button>}
        </div>
      </div>;
    })}
    <button type="button" className="text-sm font-semibold text-primary underline" onClick={() => onChange([...rows, newGrantRow(nextKey())])}>+ Thêm phân quyền</button>
    <p className="text-xs text-text-muted">Chưa chọn phân quyền thì tài khoản chưa đăng nhập được. Có thể thêm sau.</p>
  </fieldset>;
}
