import type { AppMessage } from "@/shared/messages/message-catalog";

export type CurrentPasswordChangeInput = Readonly<{
  currentPassword: string;
  newPassword: string;
}>;

export type CurrentPasswordChangeResult =
  | Readonly<{
      message: AppMessage & { code: "MSG18" };
      status: "changed";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG17" };
      reason: "invalid-current-password";
      status: "rejected";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG01" };
      reason: "invalid-new-password";
      status: "rejected";
    }>
  | Readonly<{
      message: AppMessage & { code: "MSG19" };
      reason: "session-expired";
      status: "rejected";
    }>;
