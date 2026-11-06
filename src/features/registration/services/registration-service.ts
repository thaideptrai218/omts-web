import type {
  CompleteRegistrationInput,
  CompleteRegistrationResult,
  RegistrationDraft,
  StartRegistrationResult,
} from "@/features/registration/domain/registration";
import type { RegistrationRepository } from "@/features/registration/repositories/registration-repository";

export type RegistrationService = Readonly<{
  complete(
    input: CompleteRegistrationInput,
  ): Promise<CompleteRegistrationResult>;
  start(draft: RegistrationDraft): Promise<StartRegistrationResult>;
}>;

export function createRegistrationService(
  repository: RegistrationRepository,
): RegistrationService {
  return {
    complete: (input) => repository.complete(input),
    start: (draft) => repository.start(draft),
  };
}
