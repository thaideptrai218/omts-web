import "server-only";
import { z } from "zod";
import { authTokensSchema } from "@/features/auth/api/auth-contract.schemas";
import { newSessionSchema } from "@/server/auth/session-store-validation";

export const nonceBytes = 12;
export const tagBytes = 16;
// Existing envelope cap: 16,384 base64url chars = 12,288 bytes including header.
export const maxPlaintextBytes = 12_288 - 1 - nonceBytes - tagBytes;

export const tokenBundleSchema = z.strictObject({
  accessToken: authTokensSchema.shape.accessToken.max(maxPlaintextBytes),
  refreshToken: authTokensSchema.shape.refreshToken.max(maxPlaintextBytes),
});
export type SessionTokenBundle = z.infer<typeof tokenBundleSchema>;
export const tokenContextSchema = newSessionSchema.omit({ protectedTokens: true })
  .refine((value) => value.expiresAtMs <= value.refreshExpiresAtMs);
export type TokenProtectionContext = z.infer<typeof tokenContextSchema>;

export function tokenAssociatedData(context: TokenProtectionContext, keyId: string): Buffer {
  return Buffer.from(JSON.stringify([
    "omts-bff-tokens", 1, keyId, context.idHash,
    context.identity.accountId.toLowerCase(), context.identity.backendSessionId.toLowerCase(),
    context.identity.subjectType, context.phase,
    context.accessExpiresAtMs, context.refreshExpiresAtMs, context.expiresAtMs,
  ]));
}

export function decodeTokenEnvelope(sealed: string) {
  const bytes = Buffer.from(sealed, "base64url");
  if (bytes[0] !== 1 || bytes.length <= 1 + nonceBytes + tagBytes
    || bytes.toString("base64url") !== sealed) return null;
  return {
    nonce: bytes.subarray(1, 1 + nonceBytes),
    tag: bytes.subarray(1 + nonceBytes, 1 + nonceBytes + tagBytes),
    ciphertext: bytes.subarray(1 + nonceBytes + tagBytes),
  };
}
