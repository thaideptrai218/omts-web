import type {
  AccessGrant,
  ManagedAccount,
  SaveAccountInput,
} from "@/features/account-management/domain/account-management";
import type { AccountEditorValues } from "@/features/account-management/schemas/account-editor-schema";
import { mockIdentities } from "@/shared/mocks/mock-identities";

/** Turns validated grant drafts into effective grants issued by the mock owner. */
export function buildAddedGrants(
  newGrants: SaveAccountInput["newGrants"],
  nextGrantId: () => string,
): readonly AccessGrant[] {
  return newGrants.map((grant) => ({
    effectiveFrom: grant.effectiveFrom,
    effectiveTo: grant.effectiveTo || null,
    grantedBy: mockIdentities.owner.displayName,
    id: nextGrantId(),
    revocationReason: null,
    revokedAt: null,
    roleId: grant.roleId,
    status: "effective",
    zoneId: grant.zoneId === "all-zones" ? null : grant.zoneId,
  }));
}

/**
 * Builds the account to publish: an update keeps history and resets contact
 * verification only for changed values; a create starts active and unverified.
 */
export function buildSavedAccount({
  addedGrants,
  current,
  data,
  nextAccountId,
  recordVersion,
  username,
}: Readonly<{
  addedGrants: readonly AccessGrant[];
  current: ManagedAccount | undefined;
  data: AccountEditorValues;
  nextAccountId: () => string;
  recordVersion: string;
  username: string;
}>): ManagedAccount {
  return current
    ? {
        ...current,
        credentialDeliveryChannel: data.deliveryChannel,
        displayName: data.fullName,
        email: data.email,
        emailVerified:
          current.email === data.email ? current.emailVerified : false,
        grants: [...current.grants, ...addedGrants],
        phone: data.phone,
        phoneVerified:
          current.phone === data.phone ? current.phoneVerified : false,
        recordVersion,
        username,
      }
    : {
        accountType: "internal",
        credentialDeliveryChannel: data.deliveryChannel,
        displayName: data.fullName,
        email: data.email,
        emailVerified: false,
        grants: addedGrants,
        id: nextAccountId(),
        phone: data.phone,
        phoneVerified: false,
        recordVersion,
        status: "active",
        username,
      };
}
