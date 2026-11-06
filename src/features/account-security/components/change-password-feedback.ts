import type { CurrentPasswordChangeResult } from "@/features/account-security/domain/change-password";
import { formatMessage, type AppMessage } from "@/shared/messages/message-catalog";

type ChangePasswordField = "currentPassword" | "newPassword";

export type ChangePasswordFeedback =
  | Readonly<{
      field: ChangePasswordField;
      kind: "field-error";
      message: string;
    }>
  | Readonly<{
      kind: "changed";
      message: AppMessage & { code: "MSG18" };
    }>
  | Readonly<{
      kind: "session-expired";
      message: AppMessage & { code: "MSG19" };
    }>;

function assertNever(value: never): never {
  throw new Error(`Unhandled password change rejection: ${String(value)}`);
}

export function getChangePasswordFeedback(
  result: CurrentPasswordChangeResult,
): ChangePasswordFeedback {
  if (result.status === "changed") {
    return { kind: "changed", message: result.message };
  }

  const reason = result.reason;

  switch (reason) {
    case "invalid-current-password":
      return {
        field: "currentPassword",
        kind: "field-error",
        message: formatMessage(result.message),
      };
    case "invalid-new-password":
      return {
        field: "newPassword",
        kind: "field-error",
        message: formatMessage(result.message),
      };
    case "session-expired":
      return { kind: "session-expired", message: result.message };
    default:
      return assertNever(reason);
  }
}
