import type { z } from "zod";
import type { grantRowSchema } from "@/features/personal-api/grant-contract";
import { fixedRoleLabels } from "@/features/personal-api/role-display-name";
import { ACCOUNTANT_ROLE, ZONE_MANAGER_ROLE } from "./user-account-model";

export type GrantRow = z.infer<typeof grantRowSchema>;
export type HeldGrant = { id: string; role: string; zoneId: string | null; zoneName: string | null; allZones: boolean };
/** What the Owner wants the account to hold after "Lưu thay đổi": Quản lý vùng in all zones or in a set of zones, and/or Kế toán. */
export type DesiredGrants = { allZones: boolean; zoneIds: string[]; accountant: boolean };
export type PlanItem = { kind: "add" | "remove"; role: string; zoneId: string | null; label: string; grantId?: string; detail?: string };

/** Role code of a grant row: the code the backend sends, else the (English or Vietnamese) role name mapped back to a code. */
function roleCodeOf(row: GrantRow): string {
  if (row.role) return row.role;
  const byLabel = Object.entries(fixedRoleLabels).find(([, label]) => label === row.roleName)?.[0];
  return byLabel ?? row.roleName.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

/** Only Effective rows count as "held"; expired, future and revoked rows are history. */
export const heldGrants = (rows: readonly GrantRow[]): HeldGrant[] =>
  rows.filter((row) => row.state === "Effective").map((row) => ({ id: row.id, role: roleCodeOf(row), zoneId: row.zoneId, zoneName: row.zoneName, allZones: row.allZones }));

/** The editor starts from what the account holds today, so nothing already granted is ever re-sent. */
export function heldToDesired(held: readonly HeldGrant[]): DesiredGrants {
  const manager = held.filter((grant) => grant.role === ZONE_MANAGER_ROLE);
  return { allZones: manager.some((grant) => grant.allZones), zoneIds: manager.flatMap((grant) => grant.zoneId ? [grant.zoneId] : []), accountant: held.some((grant) => grant.role === ACCOUNTANT_ROLE) };
}

/**
 * The difference between what is held and what is wanted, and only that: a pair the account already holds is never an "add".
 * Choosing "Tất cả vùng" replaces the single-zone grants (adds the all-zones grant, revokes each zone grant still held); leaving
 * that mode revokes the all-zones grant and adds the ticked zones; unticking a zone revokes that zone's grant. Adds come before removals.
 */
export function planGrantChanges(held: readonly HeldGrant[], desired: DesiredGrants, zoneName: (id: string) => string): PlanItem[] {
  const adds: PlanItem[] = [], removes: PlanItem[] = [];
  const manager = held.filter((grant) => grant.role === ZONE_MANAGER_ROLE);
  const heldAll = manager.find((grant) => grant.allZones);
  if (desired.allZones) {
    // Replace, not stack: the all-zones grant covers every zone, so each zone grant still held would be redundant and is revoked with it.
    if (!heldAll) adds.push({ kind: "add", role: ZONE_MANAGER_ROLE, zoneId: null, label: "Tất cả vùng" });
    for (const grant of manager) if (grant.zoneId) removes.push({ kind: "remove", role: ZONE_MANAGER_ROLE, zoneId: grant.zoneId, label: grant.zoneName ?? zoneName(grant.zoneId), grantId: grant.id, detail: "đã có trong tất cả vùng" });
  } else {
    if (heldAll) removes.push({ kind: "remove", role: ZONE_MANAGER_ROLE, zoneId: null, label: "Tất cả vùng", grantId: heldAll.id });
    const heldIds = new Set(manager.flatMap((grant) => grant.zoneId ? [grant.zoneId] : []));
    for (const zoneId of new Set(desired.zoneIds)) if (!heldIds.has(zoneId)) adds.push({ kind: "add", role: ZONE_MANAGER_ROLE, zoneId, label: zoneName(zoneId) });
    for (const grant of manager) if (grant.zoneId && !desired.zoneIds.includes(grant.zoneId)) removes.push({ kind: "remove", role: ZONE_MANAGER_ROLE, zoneId: grant.zoneId, label: grant.zoneName ?? zoneName(grant.zoneId), grantId: grant.id });
  }
  const accountants = held.filter((grant) => grant.role === ACCOUNTANT_ROLE);
  if (desired.accountant && !accountants.length) adds.push({ kind: "add", role: ACCOUNTANT_ROLE, zoneId: null, label: "Kế toán" });
  if (!desired.accountant) for (const grant of accountants) removes.push({ kind: "remove", role: ACCOUNTANT_ROLE, zoneId: null, label: "Kế toán", grantId: grant.id });
  return [...adds, ...removes];
}

/**
 * The change in one plain sentence for the summary box: "Khi lưu: thêm vùng Minh Châu, Thái. Bỏ vùng Ngọc Vừng."
 * A half with nothing in it is left out; "" when nothing changes.
 */
export function planSentence(plan: readonly PlanItem[]): string {
  const say = (kind: PlanItem["kind"]) => {
    const items = plan.filter((item) => item.kind === kind);
    const zones = items.filter((item) => item.role === ZONE_MANAGER_ROLE && item.zoneId).map((item) => item.detail ? `${item.label} (${item.detail})` : item.label);
    return [zones.length && `vùng ${zones.join(", ")}`, items.some((item) => item.role === ZONE_MANAGER_ROLE && !item.zoneId) && "tất cả vùng", items.some((item) => item.role === ACCOUNTANT_ROLE) && "vai trò Kế toán"].filter(Boolean).join(" và ");
  };
  const halves = [["thêm", say("add")], ["bỏ", say("remove")]].filter(([, text]) => text).map(([verb, text], index) => {
    const phrase = `${verb} ${text}`;
    return index ? phrase.charAt(0).toLocaleUpperCase("vi") + phrase.slice(1) : phrase;
  });
  return halves.length ? `Khi lưu: ${halves.join(". ")}.` : "";
}
