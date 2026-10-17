import { createMockPersonalProfileEnvironment } from "@/features/profile/repositories/mock-personal-profile-environment";

const mockProfileEnvironment = createMockPersonalProfileEnvironment();

export const personalProfileService = mockProfileEnvironment.profileService;
export const profileVerificationService =
  mockProfileEnvironment.verificationService;
