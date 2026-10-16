import type { AppMessage } from "@/shared/messages/message-catalog";
import type { EffectiveAccess } from "@/features/access/domain/access-types";

export type AuthAccount = Readonly<{
  access: EffectiveAccess;
  accountId: string;
  displayName: string;
  username: string;
}>;

export type AnonymousSession = Readonly<{
  status: "anonymous";
}>;

export type AuthenticatedSession = Readonly<{
  account: AuthAccount;
  status: "authenticated";
}>;

export type AuthSession = AnonymousSession | AuthenticatedSession;

export type LoginInput = Readonly<{
  identifier: string;
  password: string;
}>;

export type ApplicationAccessGranted = Readonly<{
  session: AuthenticatedSession;
  status: "access-granted";
}>;

export type LoginRejected = Readonly<{
  message: AppMessage;
  status: "rejected";
}>;

export type PasswordChangeRequired = Readonly<{
  status: "password-change-required";
}>;

export type PhoneVerificationRequired = Readonly<{
  message: Readonly<{ code: "MSG67" }>;
  status: "phone-verification-required";
}>;

export type PostLoginGate =
  | PasswordChangeRequired
  | PhoneVerificationRequired;

export type LoginResult =
  | ApplicationAccessGranted
  | LoginRejected
  | PostLoginGate;
