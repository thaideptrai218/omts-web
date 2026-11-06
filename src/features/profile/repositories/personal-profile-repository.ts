import type {
  LoadPersonalProfileResult,
  SavePersonalProfileInput,
  SavePersonalProfileResult,
  StartProfileIdentifierChangeInput,
  StartProfileIdentifierChangeResult,
} from "@/features/profile/domain/personal-profile";

export type PersonalProfileRepository = Readonly<{
  load(): Promise<LoadPersonalProfileResult>;
  save(input: SavePersonalProfileInput): Promise<SavePersonalProfileResult>;
  startIdentifierChange(
    input: StartProfileIdentifierChangeInput,
  ): Promise<StartProfileIdentifierChangeResult>;
}>;
