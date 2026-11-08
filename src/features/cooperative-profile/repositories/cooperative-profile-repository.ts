import type {
  LoadCooperativeProfileResult,
  SaveCooperativeProfileInput,
  SaveCooperativeProfileResult,
} from "@/features/cooperative-profile/domain/cooperative-profile";

export type CooperativeProfileRepository = Readonly<{
  load(): Promise<LoadCooperativeProfileResult>;
  save(input: SaveCooperativeProfileInput): Promise<SaveCooperativeProfileResult>;
}>;
