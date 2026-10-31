import type {
  CompleteRegistrationInput,
  CompleteRegistrationResult,
  RegistrationDraft,
  StartRegistrationResult,
} from "@/features/registration/domain/registration";

export interface RegistrationRepository {
  complete(
    input: CompleteRegistrationInput,
  ): Promise<CompleteRegistrationResult>;
  start(draft: RegistrationDraft): Promise<StartRegistrationResult>;
}
