import type { AppMessage } from "@/shared/messages/message-catalog";
import type { ProvisionedOwnerCredential } from "@/features/cooperative-provisioning/domain/provisioned-owner-credential";

export type CooperativeProvisioningField =
  | "cooperativeName"
  | "evidenceImages"
  | "ownerIdentityContact"
  | "preliminaryCode";

export type ProvisionCooperativeInput = Readonly<{
  cooperativeName: string;
  evidenceImages: readonly File[];
  ownerIdentityContact: string;
  preliminaryCode: string;
}>;

export type ProvisionedCooperativeSummary = Readonly<{
  cooperativeName: string;
  preliminaryCode: string;
}>;

export type ProvisionCooperativeResult =
  | Readonly<{
      credential: ProvisionedOwnerCredential;
      status: "provisioned";
      summary: ProvisionedCooperativeSummary;
    }>
  | Readonly<{
      message: AppMessage & Readonly<{ code: "MSG03" }>;
      status: "duplicate-owner";
    }>
  | Readonly<{
      message: AppMessage & Readonly<{ code: "MSG55" }>;
      status: "verification-failed";
    }>
  | Readonly<{
      field: CooperativeProvisioningField;
      message: AppMessage & Readonly<{ code: "MSG01" }>;
      status: "invalid-input";
    }>
  | Readonly<{
      message: AppMessage & Readonly<{ code: "MSG19" }>;
      status: "session-expired";
    }>;
