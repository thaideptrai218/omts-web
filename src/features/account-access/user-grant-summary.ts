import type { GrantSelection } from "./user-grant-selection";
import type { UserZone } from "./use-user-accounts";

/** Plain-words description of the chosen role and zones, e.g. "Quản lý vùng, vùng DEMO-01, DEMO-02". */
export function describeGrantSelection(selection: GrantSelection, zones: readonly UserZone[]): string {
  const roles = [selection.zoneManager && "Quản lý vùng", selection.accountant && "Kế toán"].filter(Boolean).join(" và ");
  if (!roles) return "chưa có vai trò";
  const parts = [roles];
  if (selection.zoneManager) {
    const names = selection.allZones ? ["tất cả vùng"] : selection.zoneIds.map((id) => zones.find((zone) => zone.id === id)?.name ?? "vùng đã chọn");
    parts.push(names.length ? (selection.allZones ? names[0] : `vùng ${names.join(", ")}`) : "chưa chọn vùng");
  }
  if (selection.accountant) parts.push("cả hợp tác xã");
  return parts.join(", ");
}

/** "Tài khoản qua_ten: Quản lý vùng, vùng DEMO-01, DEMO-02." */
export const grantSummaryLine = (username: string, selection: GrantSelection, zones: readonly UserZone[]) =>
  `Tài khoản ${username.trim() || "mới"}: ${describeGrantSelection(selection, zones)}.`;
