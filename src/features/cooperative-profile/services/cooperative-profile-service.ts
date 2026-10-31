import type { SaveCooperativeProfileInput } from "@/features/cooperative-profile/domain/cooperative-profile";
import type { CooperativeProfileRepository } from "@/features/cooperative-profile/repositories/cooperative-profile-repository";

function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export function createCooperativeProfileService(
  repository: CooperativeProfileRepository,
) {
  return {
    load: () => repository.load(),
    save: (input: SaveCooperativeProfileInput) =>
      repository.save({
        ...input,
        businessActivities: input.businessActivities.map((activity) =>
          activity.trim(),
        ),
        cooperativeName: input.cooperativeName.trim(),
        email: optionalValue(input.email),
        legalRepresentative: input.legalRepresentative.trim(),
        officeAddress: input.officeAddress.trim(),
        phone: input.phone.trim(),
        receivingBankAccount: {
          accountHolder: input.receivingBankAccount.accountHolder.trim(),
          accountNumber: input.receivingBankAccount.accountNumber.trim(),
          bankId: input.receivingBankAccount.bankId.trim(),
        },
        taxId: input.taxId.trim(),
        website: optionalValue(input.website),
      }),
  } as const;
}

export type CooperativeProfileService = ReturnType<
  typeof createCooperativeProfileService
>;
