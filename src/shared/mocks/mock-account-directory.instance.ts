import { getMockPersonalProfile } from "@/features/profile/mocks/personal-profile-fixtures";
import { createMockAccountDirectory } from "./mock-account-directory";
import { mockIdentities } from "./mock-identities";

// Public mock credential already documented in README; never a backend secret.
const publicReviewPassword = "demo123";
export const mockAccountDirectory = createMockAccountDirectory([mockIdentities.owner, mockIdentities.systemAdmin].map((identity) => {
  const profile = getMockPersonalProfile(identity.accountId);
  return { ...identity, password: publicReviewPassword,
    contacts: [profile?.email ? { kind: "email" as const, ...profile.email } : undefined,
      profile?.phone ? { kind: "phone" as const, ...profile.phone } : undefined].filter((contact) => contact !== undefined),
    identifiers: [profile?.email, profile?.phone].flatMap((contact) => contact?.isVerified ? [contact.value] : []) };
}));
