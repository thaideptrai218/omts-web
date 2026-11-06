import type {
  SavePersonalProfileInput,
  StartProfileIdentifierChangeInput,
} from "@/features/profile/domain/personal-profile";
import type { PersonalProfileRepository } from "@/features/profile/repositories/personal-profile-repository";

export function createPersonalProfileService(
  repository: PersonalProfileRepository,
) {
  return {
    load: () => repository.load(),
    save: (input: SavePersonalProfileInput) => repository.save(input),
    startIdentifierChange: (input: StartProfileIdentifierChangeInput) =>
      repository.startIdentifierChange(input),
  } as const;
}

export type PersonalProfileService = ReturnType<
  typeof createPersonalProfileService
>;
