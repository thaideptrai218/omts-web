import { z } from "zod";
import { getPasswordRuleState } from "@/shared/security/password-policy";
import { profileViewSchema } from "@/features/profile/api/profile-contract.schemas";
// recovery: anonymous password reset. contact: change of a verified contact. phone: first verification of the account phone during onboarding.
export const verificationPurposeSchema = z.enum(["recovery", "contact", "phone"]);
export type VerificationPurpose = z.infer<typeof verificationPurposeSchema>;
export const channelSchema = z.enum(["Email", "Sms"]);
const purpose = verificationPurposeSchema, id = z.uuid();
export function validContact(channel: "Email" | "Sms", target: string) {
  if (channel === "Email") return z.email().max(254).safeParse(target).success;
  let phone = target.replace(/[\s.()-]/g, "");
  if (phone.startsWith("+84")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("84") && phone.length === 11) phone = `0${phone.slice(2)}`;
  return /^0\d{9}$/.test(phone);
}
export const verificationCommandSchema = z.discriminatedUnion("op", [
  z.strictObject({ op: z.literal("start"), purpose, channel: channelSchema.optional(), target: z.string().trim().min(1).max(254).optional(), currentPassword: z.string().min(1).max(128).optional() }),
  z.strictObject({ op: z.literal("read"), purpose }),
  z.strictObject({ op: z.literal("resend"), purpose, id }),
  z.strictObject({ op: z.literal("verify"), purpose, id, code: z.string().regex(/^\d{6}$/) }),
  z.strictObject({ op: z.literal("cancel"), purpose, id }),
  z.strictObject({ op: z.literal("complete"), purpose, id, newPassword: z.string().min(1).max(128).optional(), confirmPassword: z.string().min(1).max(128).optional() }),
]).superRefine((value, ctx) => {
  if (value.op === "start") {
    if (value.purpose === "recovery") {
      // Recovery is by SMS to the phone number: an email address never receives a recovery code.
      if (value.channel !== "Sms" || !value.target || !validContact("Sms", value.target) || value.currentPassword) ctx.addIssue({ code: "custom", message: "Invalid recovery request" });
    } else if (value.purpose === "phone") {
      // The API sends the code to the number already on the account; the browser supplies nothing.
      if (value.channel || value.target || value.currentPassword) ctx.addIssue({ code: "custom", message: "Invalid phone verification request" });
    } else if (!value.channel || !value.target || !validContact(value.channel, value.target) || !value.currentPassword) ctx.addIssue({ code: "custom", message: "Invalid contact request" });
  }
  if (value.op === "complete") {
    if (value.purpose !== "recovery") {
      if (value.newPassword || value.confirmPassword) ctx.addIssue({ code: "custom", message: "Invalid contact confirmation" });
    } else {
      const rules = getPasswordRuleState(value.newPassword ?? "");
      if (!rules.hasMinimumLength || !rules.hasLetter || !rules.hasDigit || value.newPassword !== value.confirmPassword) ctx.addIssue({ code: "custom", message: "Mật khẩu cần ít nhất 8 ký tự gồm chữ và số; nhập lại phải khớp." });
    }
  }
});
export type VerificationCommand = z.infer<typeof verificationCommandSchema>;
export const verificationViewSchema = z.object({ id, purpose, phase: z.enum(["code", "verified"]), channel: channelSchema.nullable(), maskedTarget: z.string().max(300),
  expiresAt: z.iso.datetime({ offset: true }), nextResendAt: z.iso.datetime({ offset: true }).nullable(), sendsLeft: z.number().int().min(0).max(2).nullable() });
export type VerificationView = z.infer<typeof verificationViewSchema>;
export const verificationResultSchema = z.object({ status: z.enum(["success", "completed", "empty", "cancelled", "error"]), flow: verificationViewSchema.optional(), code: z.string().max(64).optional(),
  uncertain: z.boolean().optional(), retryAfterMs: z.number().nonnegative().max(3_600_000).optional(), oldDocumentsHidden: z.boolean().optional(),
  profile: profileViewSchema.nullable().optional() });
export type VerificationResult = z.infer<typeof verificationResultSchema>;
