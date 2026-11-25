import type { CreateUserGrant } from "./account-credential-contract";
import { ACCOUNTANT_ROLE, ZONE_MANAGER_ROLE } from "./user-account-model";

/**
 * What the "Tạo người dùng" form lets the Owner pick, in the words of the business: a Zone Manager for some zones (or all),
 * and/or the Accountant, who is always whole-cooperative (AC-03) so no zone is chosen for it.
 */
export type GrantSelection = { zoneManager: boolean; allZones: boolean; zoneIds: string[]; accountant: boolean };
export const emptyGrantSelection: GrantSelection = { zoneManager: false, allZones: false, zoneIds: [], accountant: false };

export function selectionToGrants(selection: GrantSelection): CreateUserGrant[] {
  const grants: CreateUserGrant[] = [];
  if (selection.zoneManager) {
    if (selection.allZones) grants.push({ zoneId: null, role: ZONE_MANAGER_ROLE });
    else for (const zoneId of [...new Set(selection.zoneIds)]) grants.push({ zoneId, role: ZONE_MANAGER_ROLE });
  }
  if (selection.accountant) grants.push({ zoneId: null, role: ACCOUNTANT_ROLE });
  return grants;
}

export function grantsToSelection(grants: readonly CreateUserGrant[]): GrantSelection {
  const zoneManager = grants.filter((grant) => grant.role === ZONE_MANAGER_ROLE);
  return {
    zoneManager: zoneManager.length > 0,
    allZones: zoneManager.some((grant) => grant.zoneId === null),
    zoneIds: zoneManager.flatMap((grant) => grant.zoneId ? [grant.zoneId] : []),
    accountant: grants.some((grant) => grant.role === ACCOUNTANT_ROLE),
  };
}

/** A Zone Manager must have a zone (or all zones); otherwise the account would be created with a role that grants nothing. */
export const selectionError = (selection: GrantSelection) =>
  selection.zoneManager && !selection.allZones && selection.zoneIds.length === 0 ? "Chọn ít nhất một vùng cho Quản lý vùng, hoặc chọn Tất cả vùng." : undefined;
