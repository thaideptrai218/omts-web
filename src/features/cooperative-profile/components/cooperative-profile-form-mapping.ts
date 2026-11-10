import type { BusinessActivityRow } from "@/features/cooperative-profile/components/business-activity-editor";
import type {
  CooperativeProfile,
  CooperativeProfileField,
  SaveCooperativeProfileInput,
} from "@/features/cooperative-profile/domain/cooperative-profile";
import type { CooperativeProfileFormValues } from "@/features/cooperative-profile/schemas/cooperative-profile-schema";

/** Maps a stored cooperative profile to editable form values (always at least one activity row). */
export function toFormValues(profile: CooperativeProfile): CooperativeProfileFormValues {
  return {
    bankAccountHolder: profile.receivingBankAccount.accountHolder,
    bankAccountNumber: profile.receivingBankAccount.accountNumber,
    bankId: profile.receivingBankAccount.bankId,
    businessActivities:
      profile.businessActivities.length > 0 ? [...profile.businessActivities] : [""],
    cooperativeName: profile.cooperativeName,
    email: profile.email ?? "",
    legalRepresentative: profile.legalRepresentative,
    officeAddress: profile.officeAddress,
    phone: profile.phone,
    taxId: profile.taxId,
    website: profile.website ?? "",
  };
}

/** Maps validated form values to the save payload, carrying the optimistic-concurrency version. */
export function toSaveInput(
  values: CooperativeProfileFormValues,
  recordVersion: string,
): SaveCooperativeProfileInput {
  return {
    businessActivities: values.businessActivities,
    cooperativeName: values.cooperativeName,
    email: values.email,
    legalRepresentative: values.legalRepresentative,
    officeAddress: values.officeAddress,
    phone: values.phone,
    receivingBankAccount: {
      accountHolder: values.bankAccountHolder,
      accountNumber: values.bankAccountNumber,
      bankId: values.bankId,
    },
    recordVersion,
    taxId: values.taxId,
    website: values.website,
  };
}

export function createActivityRows(values: readonly string[]): BusinessActivityRow[] {
  return values.map((value, index) => ({ id: `activity-${index + 1}`, value }));
}

export function serverFieldToFormField(field: CooperativeProfileField) {
  return field as keyof CooperativeProfileFormValues;
}

/** DOM id of the input that should receive focus when the server rejects a field. */
export function getFieldElementId(field: CooperativeProfileField, firstActivityRowId?: string) {
  const elementIds: Record<CooperativeProfileField, string> = {
    bankAccountHolder: "bank-account-holder",
    bankAccountNumber: "bank-account-number",
    bankId: "receiving-bank",
    businessActivities: `business-activity-${firstActivityRowId ?? "activity-1"}`,
    cooperativeName: "cooperative-name",
    email: "cooperative-email",
    legalRepresentative: "legal-representative",
    officeAddress: "office-address",
    phone: "cooperative-phone",
    taxId: "cooperative-tax-id",
    website: "cooperative-website",
  };

  return elementIds[field];
}
