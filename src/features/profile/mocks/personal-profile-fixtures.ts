import type { PersonalProfile } from "@/features/profile/domain/personal-profile";
import {
  createMockStaffIdentity,
  mockIdentities,
} from "@/shared/mocks/mock-identities";

function createOwnerProfile(): PersonalProfile {
  const identity = mockIdentities.owner;

  return {
    accountId: identity.accountId,
    displayName: identity.displayName,
    email: { isVerified: true, value: "owner@omts.test" },
    phone: { isVerified: true, value: "0900000000" },
    recordVersion: "profile-owner-v1",
    roles: [
      {
        roleLabel: identity.primaryRoleLabel,
        scopeLabel: identity.scopeLabel,
      },
    ],
    username: identity.username,
  };
}

function createStaffProfile(username: string): PersonalProfile {
  const identity = createMockStaffIdentity(username);

  return {
    accountId: identity.accountId,
    displayName: identity.displayName,
    email: { isVerified: true, value: "an.nguyen@omts.test" },
    phone: { isVerified: true, value: "0901234567" },
    recordVersion: `profile-${username}-v1`,
    roles: [
      {
        roleLabel: identity.primaryRoleLabel,
        scopeLabel: identity.scopeLabel,
        zoneId: "zone-east",
      },
    ],
    username,
  };
}

function createSystemAdminProfile(): PersonalProfile {
  const identity = mockIdentities.systemAdmin;

  return {
    accountId: identity.accountId,
    displayName: identity.displayName,
    email: { isVerified: true, value: "sysadmin@omts.test" },
    phone: { isVerified: true, value: "0908888888" },
    recordVersion: "profile-system-admin-v1",
    roles: [
      {
        roleLabel: identity.primaryRoleLabel,
        scopeLabel: identity.scopeLabel,
      },
    ],
    username: identity.username,
  };
}

export function getMockPersonalProfile(accountId: string): PersonalProfile | null {
  if (accountId === mockIdentities.owner.accountId) return createOwnerProfile();
  if (accountId === mockIdentities.systemAdmin.accountId) {
    return createSystemAdminProfile();
  }
  if (accountId.startsWith("account-staff-")) {
    return createStaffProfile(accountId.replace(/^account-/, ""));
  }

  return null;
}

export function requireMockPersonalProfile(accountId: string): PersonalProfile {
  const profile = getMockPersonalProfile(accountId);
  if (!profile) {
    throw new Error(`Mock profile not found for account: ${accountId}`);
  }

  return profile;
}
