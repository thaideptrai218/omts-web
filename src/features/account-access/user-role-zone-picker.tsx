"use client";
import { useId, type ReactNode } from "react";
import type { GrantSelection } from "./user-grant-selection";
import type { UserZone } from "./use-user-accounts";

type RoleChoice = "ZONE_MANAGER" | "ACCOUNTANT" | "NONE";
const roleCards: readonly { value: RoleChoice; title: string; text: string }[] = [
  { value: "ZONE_MANAGER", title: "Quản lý vùng", text: "Làm việc ở các vùng được giao: phân công, chấm công, nuôi trồng." },
  { value: "ACCOUNTANT", title: "Kế toán", text: "Cả hợp tác xã: thanh toán, công nợ, báo cáo. Thường chỉ có một Kế toán." },
];
const noneCard = { value: "NONE" as const, title: "Chưa chọn vai trò", text: "Chọn sau. Chưa có vai trò thì chưa đăng nhập được." };
const chipBase = "inline-flex min-h-9 items-center gap-1 rounded-full border px-3 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:opacity-60";

/**
 * One place to choose role and zones, shared by "Cấp tài khoản đăng nhập" and its role and zone choice.
 * Roles are radio cards (native radios, so keyboard and screen readers work); zones are toggle chips shown only for Quản lý vùng.
 * `zonesNote` replaces the chips while zones are loading or failed to load.
 */
export function UserRoleZonePicker({ selection, zones, disabled, onChange, allowNone = true, zonesNote }: {
  selection: GrantSelection; zones: readonly UserZone[]; disabled?: boolean; onChange(next: GrantSelection): void; allowNone?: boolean; zonesNote?: ReactNode;
}) {
  const name = useId();
  const checked = (value: RoleChoice) => value === "NONE" ? !selection.zoneManager && !selection.accountant : value === "ZONE_MANAGER" ? selection.zoneManager : selection.accountant;
  // Radio semantics: choosing one role clears the other. Zones are remembered while the Owner flips between roles.
  const choose = (value: RoleChoice) => onChange({ ...selection, zoneManager: value === "ZONE_MANAGER", accountant: value === "ACCOUNTANT" });
  const toggleZone = (id: string) => onChange({ ...selection, allZones: false, zoneIds: selection.zoneIds.includes(id) ? selection.zoneIds.filter((zoneId) => zoneId !== id) : [...selection.zoneIds, id] });
  const chip = (pressed: boolean) => `${chipBase} ${pressed ? "border-primary bg-primary-soft font-semibold text-primary" : "border-border-strong bg-surface text-text hover:bg-surface-subtle"}`;
  return <div className="space-y-3">
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-semibold">Vai trò</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {[...roleCards, ...(allowNone ? [noneCard] : [])].map((card) => <label key={card.value} className={`relative flex cursor-pointer gap-3 rounded-card border border-border-strong bg-surface p-3 transition has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 ${card.value === "NONE" ? "sm:col-span-2" : ""}`}>
          <input type="radio" name={`${name}-role`} className="peer sr-only" checked={checked(card.value)} aria-labelledby={`${name}-${card.value}-title`} aria-describedby={`${name}-${card.value}-text`} onChange={() => choose(card.value)} />
          <span aria-hidden="true" className="mt-1 grid size-4 shrink-0 place-items-center rounded-full border border-border-strong peer-checked:border-primary peer-checked:after:size-2 peer-checked:after:rounded-full peer-checked:after:bg-primary" />
          <span className="min-w-0"><span id={`${name}-${card.value}-title`} className="block text-sm font-semibold">{card.title}</span><span id={`${name}-${card.value}-text`} className="block text-xs text-text-muted">{card.text}</span></span>
        </label>)}
      </div>
    </fieldset>
    {selection.zoneManager && <fieldset className="space-y-2" disabled={disabled}>
      <legend className="mb-1 text-sm font-semibold">Vùng phụ trách <span className="font-normal text-text-muted">(chọn một hoặc nhiều)</span></legend>
      {zonesNote ?? <div className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={selection.allZones} className={chip(selection.allZones)} onClick={() => onChange({ ...selection, allZones: !selection.allZones, zoneIds: [] })}>{selection.allZones && <span aria-hidden="true">✓</span>}Tất cả vùng</button>
        {zones.map((zone) => { const on = !selection.allZones && selection.zoneIds.includes(zone.id); return <button key={zone.id} type="button" aria-pressed={on} className={chip(on)} onClick={() => toggleZone(zone.id)}>{on && <span aria-hidden="true">✓</span>}{zone.name}</button>; })}
        {zones.length === 0 && <p className="text-sm text-text-muted">Chưa có vùng nào đang sử dụng.</p>}
      </div>}
    </fieldset>}
  </div>;
}
