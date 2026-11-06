import type { ProvisionCooperativeInput } from "@/features/cooperative-provisioning/domain/cooperative-provisioning";
import type { CooperativeProvisioningRepository } from "@/features/cooperative-provisioning/repositories/cooperative-provisioning-repository";

export function createCooperativeProvisioningService(
  repository: CooperativeProvisioningRepository,
) {
  return {
    provision(input: ProvisionCooperativeInput) {
      return repository.provision({
        ...input,
        cooperativeName: input.cooperativeName.trim(),
        ownerIdentityContact: input.ownerIdentityContact.trim(),
        preliminaryCode: input.preliminaryCode.trim(),
      });
    },
  } as const;
}

export type CooperativeProvisioningService = ReturnType<
  typeof createCooperativeProvisioningService
>;
