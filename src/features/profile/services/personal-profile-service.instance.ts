import { createMockPersonalProfileEnvironment } from "@/features/profile/repositories/mock-personal-profile-environment";
import { getMockPersonalProfile } from "@/features/profile/mocks/personal-profile-fixtures";
import { mockAccountDirectory } from "@/shared/mocks/mock-account-directory.instance";
import { managedMockAuth } from "@/shared/mocks/managed-mock-auth.instance";
import { mockManagementEnvironment } from "@/shared/mocks/mock-management-environment.instance";

type ProfileEnvironment = ReturnType<typeof createMockPersonalProfileEnvironment>;

const environments = new Map<string, ProfileEnvironment>();

export function getPersonalProfileEnvironment(accountId: string) {
  const existingEnvironment = environments.get(accountId);
  if (existingEnvironment) return existingEnvironment;

  const base = getMockPersonalProfile(accountId) ?? managedMockAuth.profile(accountId);
  if (!base) return null;
  const identity = mockAccountDirectory.findAccount(accountId);
  const email = identity?.contacts?.find((contact) => contact.kind === "email");
  const phone = identity?.contacts?.find((contact) => contact.kind === "phone");
  const profile = identity?.contacts ? { ...base, displayName: identity.displayName,
    email: email ? { value: email.value, isVerified: email.isVerified } : null,
    phone: phone ? { value: phone.value, isVerified: phone.isVerified } : null } : base;

  const environment = createMockPersonalProfileEnvironment({
    initialProfile: profile,
    getRoles: () => managedMockAuth.profile(accountId)?.roles ?? profile.roles.map((role) => ({
      ...role, scopeLabel: role.zoneId ? mockManagementEnvironment.zones.snapshotOptions().find((zone) => zone.id === role.zoneId)?.label ?? role.scopeLabel : role.scopeLabel,
    })),
    isIdentifierTaken: (value) => mockAccountDirectory.isIdentifierTaken(value, accountId)
      || mockManagementEnvironment.accounts.snapshotAccounts().some((account) => account.id !== accountId
        && (account.email === value || account.phone === value)),
    onProfileSaved: (saved) => { mockAccountDirectory.updateIdentity({
      accountId, username: saved.username, displayName: saved.displayName,
      contacts: [saved.email ? { kind: "email" as const, ...saved.email } : undefined,
        saved.phone ? { kind: "phone" as const, ...saved.phone } : undefined].filter((contact) => contact !== undefined),
      identifiers: [saved.email, saved.phone].flatMap((contact) => contact?.isVerified ? [contact.value] : []),
    }); mockManagementEnvironment.accounts.recordMockProfile(saved); },
  });
  environments.set(accountId, environment);
  return environment;
}
