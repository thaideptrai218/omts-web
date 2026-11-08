import "server-only";
import { z } from "zod";
import { apiIdSchema, subjectTypeSchema } from "@/features/auth/api/auth-contract.schemas";
import type { SessionClock } from "@/server/auth/session-store";

const timestamp = z.number().int().min(0).max(8_640_000_000_000_000);
export const sessionIdHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const sessionRevisionSchema = z.uuid();
export const protectedSessionTokensSchema = z.strictObject({
  keyId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  // Shape only; the token protector authenticates/decrypts the actual payload.
  sealed: z.string().regex(/^[A-Za-z0-9_-]{40,16384}$/),
});

export const sessionValuesSchema = z.strictObject({
  phase: z.enum(["password-change-required", "contact-verification-required", "application"]),
  protectedTokens: protectedSessionTokensSchema,
  accessExpiresAtMs: timestamp,
  refreshExpiresAtMs: timestamp,
  expiresAtMs: timestamp,
});

export const newSessionSchema = sessionValuesSchema.extend({
  idHash: sessionIdHashSchema,
  identity: z.strictObject({
    accountId: apiIdSchema,
    backendSessionId: apiIdSchema,
    subjectType: subjectTypeSchema,
  }),
});

export function readSessionClock(clock: SessionClock): number | undefined {
  try {
    const parsed = timestamp.safeParse(clock());
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

export function hasValidSessionLifetime(
  values: z.infer<typeof sessionValuesSchema>, now: number,
): boolean {
  // No default/extended lifetime or access-token refresh policy is selected here.
  return values.expiresAtMs > now && values.expiresAtMs <= values.refreshExpiresAtMs;
}
