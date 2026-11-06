import { createCipheriv, createSecretKey, randomBytes } from "node:crypto";
import { createSessionTokenProtector } from "@/server/auth/session-token-protector";
import { tokenAssociatedData, type TokenProtectionContext } from "@/server/auth/session-token-format";
import type { SessionKeyProvider } from "@/server/auth/session-token-keys";
import { newSession } from "@/server/auth/__tests__/session-fixture";

export const fixtureTokens = {
  accessToken: "fixture-access-not-a-real-token",
  refreshToken: "fixture-refresh-not-a-real-token",
};

export function tokenContext(change: Partial<TokenProtectionContext> = {}): TokenProtectionContext {
  const session = newSession();
  return {
    idHash: session.idHash, identity: session.identity, phase: session.phase,
    accessExpiresAtMs: session.accessExpiresAtMs, refreshExpiresAtMs: session.refreshExpiresAtMs,
    expiresAtMs: session.expiresAtMs, ...change,
  };
}

export function tokenHarness() {
  const keys = new Map([["test-key-1", createSecretKey(randomBytes(32))]]);
  let active = "test-key-1";
  const provider: SessionKeyProvider = {
    async active() {
      const key = keys.get(active);
      if (!key) throw new Error("Test key is not available");
      return { keyId: active, key };
    },
    async byId(id) { return keys.get(id); },
  };
  const protector = createSessionTokenProtector(provider);
  return {
    keys, provider, protector,
    setActive(id: string) { active = id; },
    async seal(context = tokenContext()) {
      const result = await protector.protect(fixtureTokens, context);
      if (result.status !== "protected") throw new Error("Expected protected test tokens");
      return result.protectedTokens;
    },
  };
}

// Authenticated but deliberately invalid payload, never for production use.
export async function sealUnsafePayloadForTests(payload: Buffer) {
  const harness = tokenHarness();
  const { keyId, key } = await harness.provider.active();
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce, { authTagLength: 16 });
  cipher.setAAD(tokenAssociatedData(tokenContext(), keyId));
  const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
  const sealed = Buffer.concat([Buffer.from([1]), nonce, cipher.getAuthTag(), ciphertext]).toString("base64url");
  return { protector: harness.protector, envelope: { keyId, sealed } };
}
