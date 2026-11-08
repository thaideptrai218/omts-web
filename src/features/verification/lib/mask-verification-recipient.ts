import type { VerificationChannel } from "@/features/verification/domain/verification-types";

function maskEmail(value: string): string {
  const [localPart, domain] = value.split("@");
  if (!localPart || !domain) return "***";

  return `${localPart.slice(0, 2)}***@${domain}`;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";

  return `••••••${digits.slice(-4)}`;
}

export function maskVerificationRecipient(
  channel: VerificationChannel,
  value: string,
): string {
  return channel === "email" ? maskEmail(value) : maskPhone(value);
}
