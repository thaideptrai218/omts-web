import type {
  ProvisionCooperativeInput,
  ProvisionCooperativeResult,
} from "@/features/cooperative-provisioning/domain/cooperative-provisioning";

export type CooperativeProvisioningRepository = Readonly<{
  provision(
    input: ProvisionCooperativeInput,
  ): Promise<ProvisionCooperativeResult>;
}>;
