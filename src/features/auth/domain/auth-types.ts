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

export type LoginResult =
  | Readonly<{
      session: AuthenticatedSession;
      status: "authenticated";
    }>
  | Readonly<{
      message: AppMessage;
      status: "rejected";
    }>;
