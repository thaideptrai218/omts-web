import { createMockPersonalProfileEnvironment } from "@/features/profile/repositories/mock-personal-profile-environment";
import { getMockPersonalProfile } from "@/features/profile/mocks/personal-profile-fixtures";

type ProfileEnvironment = ReturnType<typeof createMockPersonalProfileEnvironment>;

const environments = new Map<string, ProfileEnvironment>();

export function getPersonalProfileEnvironment(accountId: string) {
  const existingEnvironment = environments.get(accountId);
  if (existingEnvironment) return existingEnvironment;

  const profile = getMockPersonalProfile(accountId);
  if (!profile) return null;

  const environment = createMockPersonalProfileEnvironment({
    initialProfile: profile,
  });
  environments.set(accountId, environment);
  return environment;
}
