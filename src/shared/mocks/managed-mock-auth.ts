import type { AuthAccount } from "@/features/auth/domain/auth-types";
import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import type { VerificationRecipientInput } from "@/features/verification/domain/verification-types";
import { maskVerificationRecipient } from "@/features/verification/lib/mask-verification-recipient";
import { mockManagedAccounts } from "@/features/account-management/mocks/account-management-fixtures";
import { resolveMockZoneAccess } from "./mock-zone-access";
import { vietnameseBusinessDate } from "@/shared/format/date-only";
import type { EffectivePermission } from "@/features/access/domain/access-types";
import { trungNamCooperativeName } from "./mock-identities";
import type { createMockManagementEnvironment } from "./mock-management-environment";

export type ManagedMockLogin = Readonly<{
  account: AuthAccount; locked: boolean; requiresOnboarding: boolean;
  credentialVersion: number;
  requiresContactVerification: boolean;
  contacts: readonly VerificationRecipientInput[];
  verifiedIdentifiers: readonly string[];
}>;

export function createManagedMockAuth(environment: ReturnType<typeof createMockManagementEnvironment>) {
  function project(accountId: string): ManagedMockLogin | undefined {
    const row = environment.accounts.snapshotAccounts().find((account) => account.id === accountId && account.accountType === "internal");
    if (!row) return;
    const roles = environment.roles.snapshotRoles();
    const today = vietnameseBusinessDate();
    const grants = row.grants.filter((grant) => grant.status === "effective" && grant.effectiveFrom <= today && (!grant.effectiveTo || grant.effectiveTo >= today) && roles.some((role) => role.id === grant.roleId && role.status === "in-use"));
    const allZones = grants.some((grant) => grant.zoneId === null);
    const zoneOptions = environment.zones.snapshotOptions();
    const zones = zoneOptions.filter((zone) => grants.some((grant) => grant.zoneId === null || grant.zoneId === zone.id));
    const zoneAccess = resolveMockZoneAccess(row.id, environment.accounts.snapshotAccounts(), roles, zoneOptions, today);
    const permissions: EffectivePermission[] = zones.length ? [{ key: "workspace.overview.view", scope: allZones ? { kind: "all-zones" } : { kind: "zones", zoneIds: zones.map((zone) => zone.id) } }] : [];
    if (zoneAccess) permissions.push({ key: "farming.zones.view", scope: zoneAccess.visibleZoneIds === null ? { kind: "all-zones" } : { kind: "zones", zoneIds: zoneAccess.visibleZoneIds } });
    const roleNames = [...new Set(grants.flatMap((grant) => roles.find((role) => role.id === grant.roleId)?.name ?? []))];
    const contacts: VerificationRecipientInput[] = [];
    if (row.email) contacts.push({ channel: "email", value: row.email, maskedValue: maskVerificationRecipient("email", row.email) });
    if (row.phone) contacts.push({ channel: "sms", value: row.phone, maskedValue: maskVerificationRecipient("sms", row.phone) });
    return {
      account: { accountId: row.id, username: row.username, displayName: row.displayName,
        organizationName: trungNamCooperativeName, primaryRoleLabel: roleNames.join(" · ") || "Chưa được phân công",
        scopeLabel: allZones ? "Toàn hợp tác xã" : zones.map((zone) => zone.label).join(", ") || "Chưa có vùng",
        // Existing mock Staff navigation only. Never elevate internal accounts
        // to Owner screens from a custom role name; real mapping remains W1/W3.
        access: { permissions } },
      locked: row.status === "locked",
      credentialVersion: environment.accounts.mockCredentialVersion(row.id),
      requiresContactVerification: !row.emailVerified && !row.phoneVerified,
      requiresOnboarding: !mockManagedAccounts.some((seed) => seed.id === row.id), contacts,
      verifiedIdentifiers: [row.emailVerified ? row.email : "", row.phoneVerified ? row.phone : ""].filter(Boolean),
    };
  }
  return {
    resolve(identifier: string) {
      const alias = identifier === "staff-verified" ? "nguyen.an" : identifier;
      const row = environment.accounts.snapshotAccounts().find((account) => account.accountType === "internal"
        && (account.username === alias || (account.emailVerified && account.email === alias) || (account.phoneVerified && account.phone === alias)));
      return row ? project(row.id) : undefined;
    },
    profile(accountId: string): PersonalProfile | undefined {
      const projected = project(accountId);
      const row = environment.accounts.snapshotAccounts().find((account) => account.id === accountId);
      if (!projected || !row) return;
      return { accountId, username: row.username, displayName: row.displayName, recordVersion: `profile-${row.id}-v1`,
        email: row.email ? { value: row.email, isVerified: row.emailVerified } : null,
        phone: row.phone ? { value: row.phone, isVerified: row.phoneVerified } : null,
        roles: [{ roleLabel: projected.account.primaryRoleLabel, scopeLabel: projected.account.scopeLabel }] };
    },
  };
}
