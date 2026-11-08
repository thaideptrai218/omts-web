import "server-only";
import { createCipheriv, randomBytes } from "node:crypto";
import type { ProtectedSessionTokens } from "@/server/auth/session-store";
import { protectedSessionTokensSchema } from "@/server/auth/session-store-validation";
import { isSessionEncryptionKey, type SessionKeyProvider } from "@/server/auth/session-token-keys";
import {
  maxPlaintextBytes, nonceBytes, tagBytes, tokenAssociatedData, tokenBundleSchema, tokenContextSchema,
} from "@/server/auth/session-token-format";
import { openSessionTokens } from "@/server/auth/session-token-open";

export type TokenProtectionResult = Readonly<{ status: "protected"; protectedTokens: ProtectedSessionTokens }>
  | Readonly<{ status: "invalid-input" | "unavailable" }>;

// No default keys, environment reads, connection, or serializable provider property.
export function createSessionTokenProtector(keys: SessionKeyProvider) {
  return {
    async protect(input: unknown, context: unknown): Promise<TokenProtectionResult> {
      const tokens = tokenBundleSchema.safeParse(input);
      const binding = tokenContextSchema.safeParse(context);
      if (!tokens.success || !binding.success) return { status: "invalid-input" };
      // Validation produces snapshots before awaiting an external key provider.
      const plaintext = Buffer.from(JSON.stringify(tokens.data));
      if (plaintext.length > maxPlaintextBytes) {
        plaintext.fill(0);
        return { status: "invalid-input" };
      }
      try {
        const active = await keys.active();
        if (!protectedSessionTokensSchema.shape.keyId.safeParse(active.keyId).success
          || !isSessionEncryptionKey(active.key)) return { status: "unavailable" };
        const nonce = randomBytes(nonceBytes);
        const cipher = createCipheriv("aes-256-gcm", active.key, nonce, { authTagLength: tagBytes });
        cipher.setAAD(tokenAssociatedData(binding.data, active.keyId));
        const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
        const sealed = Buffer.concat([Buffer.from([1]), nonce, cipher.getAuthTag(), ciphertext])
          .toString("base64url");
        return { status: "protected", protectedTokens: { keyId: active.keyId, sealed } };
      } catch {
        return { status: "unavailable" };
      } finally {
        plaintext.fill(0);
      }
    },
    open(input: unknown, context: unknown) {
      return openSessionTokens(input, context, keys);
    },
  };
}
