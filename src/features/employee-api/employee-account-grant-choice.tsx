"use client";
import { useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { loadOptions } from "@/features/operations/lookups";
import { ErrorNotice, useRemote } from "@/features/operations/ui";
import { type GrantSelection } from "@/features/account-access/user-grant-selection";
import { grantSummaryLine } from "@/features/account-access/user-grant-summary";
import { UserRoleZonePicker } from "@/features/account-access/user-role-zone-picker";
import { EmployeeAccountCopyGrants } from "./employee-account-copy-grants";

/**
 * Role cards and zone chips used by "Cấp tài khoản đăng nhập" and "Tạo tài khoản đăng nhập khi lưu".
 * Zones are read only once Quản lý vùng is chosen, so a dialog that never needs zones makes no extra request.
 * `onZones` receives the loaded zone names so a failed pair can later be reported by name; `username` (when given) adds the live summary line.
 */
export function EmployeeAccountGrantChoice({ selection, onChange, disabled, onZones, username }: {
  selection: GrantSelection; onChange(next: GrantSelection): void; disabled?: boolean; onZones?(names: Map<string, string>): void; username?: string;
}) {
  const wanted = selection.zoneManager;
  const remote = useRemote(useCallback((signal: AbortSignal) => wanted ? loadOptions("zones", signal) : Promise.resolve({ status: "success" as const, data: [] }), [wanted]));
  const zones = useMemo(() => (remote.data ?? []).filter(zone => zone.statusId === 101).map(zone => ({ id: zone.id, name: String(zone.name ?? zone.code ?? "") })), [remote.data]);
  useEffect(() => { onZones?.(new Map(zones.map(zone => [zone.id, zone.name]))); }, [zones, onZones]);
  const note = wanted && remote.loading ? <p className="text-sm text-text-muted" role="status">Đang tải danh sách vùng…</p>
    : wanted && remote.error ? <div className="space-y-2"><ErrorNotice error={remote.error} /><Button type="button" className="w-auto" variant="secondary" onClick={remote.reload}>Tải lại danh sách vùng</Button></div> : undefined;
  return <div className="space-y-3">
    <UserRoleZonePicker selection={selection} zones={zones} disabled={disabled} onChange={onChange} zonesNote={note} />
    <EmployeeAccountCopyGrants onPick={onChange} disabled={disabled} />
    {username !== undefined && <p className="rounded-control bg-surface-subtle p-2 text-sm" aria-live="polite">{grantSummaryLine(username, selection, zones)}</p>}
  </div>;
}
