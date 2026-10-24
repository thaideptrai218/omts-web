import type { AppMessage } from "@/shared/messages/message-catalog";
import type {
  VerificationChallenge,
  VerificationToken,
} from "@/features/verification/domain/verification-types";

export type ProfileIdentifierKind = "email" | "phone";

export type ProfileContact = Readonly<{
  isVerified: boolean;
  value: string;
}>;

export type ProfileRoleSummary = Readonly<{
  roleLabel: string;
  scopeLabel?: string;
  zoneId?: string | null;
}>;

export type PersonalProfile = Readonly<{
  accountId: string;
  displayName: string;
  email: ProfileContact | null;
  phone: ProfileContact | null;
  recordVersion: string;
  roles: readonly ProfileRoleSummary[];
  username: string;
}>;

export type VerifiedProfileIdentifierChange = Readonly<{
  token: VerificationToken;
  value: string;
}>;

export type StartProfileIdentifierChangeInput = Readonly<{
  kind: ProfileIdentifierKind;
  value: string;
}>;

export type StartProfileIdentifierChangeResult =
  | Readonly<{
      challenge: VerificationChallenge;
      message?: AppMessage;
      status: "verification-started";
    }>
  | Readonly<{
      field: ProfileIdentifierKind;
      message: Readonly<{ code: "MSG01" }>;
      status: "invalid-identifier";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG04" }>;
      status: "delivery-failed";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG19" }>;
      status: "session-expired";
    }>;

export type SavePersonalProfileInput = Readonly<{
  displayName: string;
  emailChange?: VerifiedProfileIdentifierChange;
  phoneChange?: VerifiedProfileIdentifierChange;
  recordVersion: string;
}>;

export type SavePersonalProfileResult =
  | Readonly<{
      message: Readonly<{
        code: "MSG10";
        params: Readonly<{ object_name: string }>;
      }>;
      notice?: Readonly<{ code: "MSG57" }>;
      profile: PersonalProfile;
      status: "saved";
    }>
  | Readonly<{
      message: Readonly<{
        code: "MSG06";
        params: Readonly<{ time: string; user_name: string }>;
      }>;
      status: "conflict";
    }>
  | Readonly<{
      field: "displayName" | ProfileIdentifierKind;
      message: Readonly<{ code: "MSG01" | "MSG16" }>;
      status: "invalid-change";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG19" }>;
      status: "session-expired";
    }>;

export type LoadPersonalProfileResult =
  | Readonly<{
      profile: PersonalProfile;
      status: "loaded";
    }>
  | Readonly<{
      message: Readonly<{ code: "MSG19" }>;
      status: "session-expired";
    }>;
