import type { GrantSelection } from "./user-grant-selection";
import type { UserZone } from "./use-user-accounts";

/** Plain-words description of the chosen role and zones, e.g. "vai trò Quản lý vùng, vùng DEMO-01, DEMO-02". */
export function describeGrantSelection(selection: GrantSelection, zones: readonly UserZone[]): string {
  const roles = [selection.zoneManager && "Quản lý vùng", selection.accountant && "Kế toán"].filter(Boolean).join(" và ");
  if (!roles) return "chưa phân quyền (cấp sau)";
  const parts = [`vai trò ${roles}`];
  if (selection.zoneManager) {
    const names = selection.allZones ? ["tất cả vùng"] : selection.zoneIds.map((id) => zones.find((zone) => zone.id === id)?.name ?? "vùng đã chọn");
    parts.push(names.length ? `vùng ${names.join(", ")}` : "chưa chọn vùng");
  }
  if (selection.accountant) parts.push("cả hợp tác xã");
  return parts.join(", ");
}

/** "Sẽ cấp: tài khoản qua_ten, vai trò Quản lý vùng, vùng DEMO-01, DEMO-02". */
export const grantSummaryLine = (username: string, selection: GrantSelection, zones: readonly UserZone[]) =>
  `Sẽ cấp: tài khoản ${username.trim() || "(chưa đặt tên)"}, ${describeGrantSelection(selection, zones)}`;
