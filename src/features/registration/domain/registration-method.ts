import type { VerificationChannel } from "@/features/verification/domain/verification-types";

export const registrationMethods = ["email", "phone"] as const;

export type RegistrationMethod = (typeof registrationMethods)[number];

export function getRegistrationVerificationChannel(
  method: RegistrationMethod,
): VerificationChannel {
  return method === "email" ? "email" : "sms";
}
