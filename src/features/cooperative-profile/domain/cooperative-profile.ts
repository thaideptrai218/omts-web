export type CooperativeProfileStatus = "preliminary" | "completed";

export type BankOption = Readonly<{
  id: string;
  name: string;
  shortName: string;
}>;

export type ReceivingBankAccount = Readonly<{
  accountHolder: string;
  accountNumber: string;
  bankId: string;
}>;

export type CooperativeProfile = Readonly<{
  businessActivities: readonly string[];
  cooperativeName: string;
  email: string | null;
  legalRepresentative: string;
  officeAddress: string;
  phone: string;
  receivingBankAccount: ReceivingBankAccount;
  recordVersion: string;
  status: CooperativeProfileStatus;
  taxId: string;
  website: string | null;
}>;

export type PublicCooperativeProjection = Readonly<{
  cooperativeName: string;
  officeAddress: string;
}>;

export type SaveCooperativeProfileInput = Readonly<{
  businessActivities: readonly string[];
  cooperativeName: string;
  email?: string;
  legalRepresentative: string;
  officeAddress: string;
  phone: string;
  receivingBankAccount: ReceivingBankAccount;
  recordVersion: string;
  taxId: string;
  website?: string;
}>;

export type CooperativeProfileField =
  | "bankAccountHolder"
  | "bankAccountNumber"
  | "bankId"
  | "businessActivities"
  | "cooperativeName"
  | "email"
  | "legalRepresentative"
  | "officeAddress"
  | "phone"
  | "taxId"
  | "website";

export type LoadCooperativeProfileResult =
  | Readonly<{
      banks: readonly BankOption[];
      profile: CooperativeProfile;
      status: "loaded";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG02" }>;
      status: "forbidden";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG19" }>;
      status: "session-expired";
    }>;

export type SaveCooperativeProfileResult =
  | Readonly<{
      message: Readonly<{
        code: "MSG10";
        params: Readonly<{ object_name: string }>;
      }>;
      profile: CooperativeProfile;
      publicProjection: PublicCooperativeProjection;
      status: "saved";
    }>
  | Readonly<{
      field: CooperativeProfileField;
      message: Readonly<{ code: "MSG01" }>;
      status: "invalid-input";
    }>
  | Readonly<{
      field: "taxId";
      message: Readonly<{
        code: "MSG03";
        params: Readonly<{ object_name: string }>;
      }>;
      status: "duplicate-tax-id";
    }>
  | Readonly<{
      message: Readonly<{
        code: "MSG06";
        params: Readonly<{ time: string; user_name: string }>;
      }>;
      status: "conflict";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG02" }>;
      status: "forbidden";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG19" }>;
      status: "session-expired";
    }>;
