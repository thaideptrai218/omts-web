import { createMockCooperativeProvisioningRepository } from "@/features/cooperative-provisioning/repositories/mock-cooperative-provisioning-repository";
import { createCooperativeProvisioningService } from "@/features/cooperative-provisioning/services/cooperative-provisioning-service";

export const cooperativeProvisioningService =
  createCooperativeProvisioningService(
    createMockCooperativeProvisioningRepository(),
  );
