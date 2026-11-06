import "server-only";
import { createDecipheriv, type KeyObject } from "node:crypto";
import { protectedSessionTokensSchema } from "@/server/auth/session-store-validation";
import { isSessionEncryptionKey, type SessionKeyProvider } from "@/server/auth/session-token-keys";
import {
  decodeTokenEnvelope, tagBytes, tokenAssociatedData, tokenBundleSchema, tokenContextSchema,
  type SessionTokenBundle,
} from "@/server/auth/session-token-format";

export type TokenOpeningResult = Readonly<{ status: "opened"; tokens: SessionTokenBundle }>
  | Readonly<{ status: "invalid-protected-tokens" | "unavailable" }>;

export async function openSessionTokens(
  input: unknown, context: unknown, keys: SessionKeyProvider,
): Promise<TokenOpeningResult> {
  const envelope = protectedSessionTokensSchema.safeParse(input);
  const binding = tokenContextSchema.safeParse(context);
  if (!envelope.success || !binding.success) return { status: "invalid-protected-tokens" };
  const parts = decodeTokenEnvelope(envelope.data.sealed);
  if (!parts) return { status: "invalid-protected-tokens" };

  let key: KeyObject | undefined;
  try {
    key = await keys.byId(envelope.data.keyId);
  } catch {
    return { status: "unavailable" };
  }
  if (key === undefined) return { status: "invalid-protected-tokens" };
  if (!isSessionEncryptionKey(key)) return { status: "unavailable" };

  let plaintext: Buffer | undefined;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, parts.nonce, { authTagLength: tagBytes });
    decipher.setAAD(tokenAssociatedData(binding.data, envelope.data.keyId));
    decipher.setAuthTag(parts.tag);
    // Do not parse or return any plaintext until final() authenticates the tag.
    plaintext = Buffer.concat([decipher.update(parts.ciphertext), decipher.final()]);
    const decoded: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
    const tokens = tokenBundleSchema.safeParse(decoded);
    return tokens.success ? { status: "opened", tokens: tokens.data } : { status: "invalid-protected-tokens" };
  } catch {
    return { status: "invalid-protected-tokens" };
  } finally {
    plaintext?.fill(0);
  }
}
