import { createSecretKey, generateKeyPairSync, type KeyObject } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createSessionTokenProtector } from "@/server/auth/session-token-protector";
import { fixtureTokens, tokenContext, tokenHarness } from "@/server/auth/__tests__/token-protection-fixture";

describe("injected BFF key provider, no production rotation policy", () => {
  it("uses the new active key but can still open data using a retained old key", async () => {
    const harness = tokenHarness();
    const old = await harness.seal();
    harness.keys.set("test-key-2", createSecretKey(Buffer.alloc(32, 2)));
    harness.setActive("test-key-2");
    const latest = await harness.seal();
    expect(latest.keyId).toBe("test-key-2");
    for (const envelope of [old, latest]) {
      await expect(harness.protector.open(envelope, tokenContext())).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
    }
    harness.keys.delete(old.keyId);
    await expect(harness.protector.open(old, tokenContext())).resolves.toEqual({ status: "invalid-protected-tokens" });
    await expect(harness.protector.open(latest, tokenContext())).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
  });

  it("refuses wrong key material even with the original key ID", async () => {
    const { keys, seal, protector } = tokenHarness();
    const envelope = await seal();
    keys.set(envelope.keyId, createSecretKey(Buffer.alloc(32, 3)));
    await expect(protector.open(envelope, tokenContext())).resolves.toEqual({ status: "invalid-protected-tokens" });
  });

  it.each([16, 24])("fails closed for unsupported key length %i", async (length) => {
    const { seal } = tokenHarness();
    const envelope = await seal();
    const wrong = createSecretKey(Buffer.alloc(length));
    const protector = createSessionTokenProtector({
      async active() { return { keyId: "test-key-1", key: wrong }; },
      async byId() { return wrong; },
    });
    await expect(protector.protect(fixtureTokens, tokenContext())).resolves.toEqual({ status: "unavailable" });
    await expect(protector.open(envelope, tokenContext())).resolves.toEqual({ status: "unavailable" });
  });

  it("does not return provider failures or fall back to another/default key", async () => {
    const { seal } = tokenHarness();
    const envelope = await seal();
    const fail = async () => { throw new Error("fixture-private-provider-detail"); };
    const protector = createSessionTokenProtector({ active: fail, byId: fail });
    await expect(protector.protect(fixtureTokens, tokenContext())).resolves.toEqual({ status: "unavailable" });
    await expect(protector.open(envelope, tokenContext())).resolves.toEqual({ status: "unavailable" });
    expect(JSON.stringify(protector)).toBe("{}");
  });

  it("rejects an unusable active key ID as configuration failure", async () => {
    const { provider } = tokenHarness();
    const protector = createSessionTokenProtector({
      ...provider, async active() { return { ...await provider.active(), keyId: "../secret" }; },
    });
    await expect(protector.protect(fixtureTokens, tokenContext())).resolves.toEqual({ status: "unavailable" });
  });

  it("does not accept an asymmetric key or an object imitating a secret key", async () => {
    for (const key of [generateKeyPairSync("ed25519").publicKey,
      { type: "secret", symmetricKeySize: 32 } as unknown as KeyObject]) {
      const protector = createSessionTokenProtector({
        async active() { return { keyId: "test-key", key }; },
        async byId() { return key; },
      });
      await expect(protector.protect(fixtureTokens, tokenContext())).resolves.toEqual({ status: "unavailable" });
    }
  });
});
