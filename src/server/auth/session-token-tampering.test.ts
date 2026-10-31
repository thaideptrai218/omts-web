import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import {
  fixtureTokens, sealUnsafePayloadForTests, tokenContext, tokenHarness,
} from "@/server/auth/__tests__/token-protection-fixture";
import { decodeTokenEnvelope } from "@/server/auth/session-token-format";

describe("BFF ciphertext and metadata binding", () => {
  it.each([
    { idHash: "b".repeat(64) },
    { identity: { ...tokenContext().identity, accountId: "222bb318-a72e-49aa-a8d7-a6169f889007" } },
    { identity: { ...tokenContext().identity, backendSessionId: "322bb318-a72e-49aa-a8d7-a6169f889007" } },
    { identity: { ...tokenContext().identity, subjectType: "Trader" as const } },
    { phase: "application" as const },
    { accessExpiresAtMs: tokenContext().accessExpiresAtMs + 1 },
    { refreshExpiresAtMs: tokenContext().refreshExpiresAtMs + 1 },
    { expiresAtMs: tokenContext().expiresAtMs - 1 },
  ])("refuses an envelope moved to changed session metadata: %j", async (change) => {
    const { seal, protector } = tokenHarness();
    await expect(protector.open(await seal(), tokenContext(change)))
      .resolves.toEqual({ status: "invalid-protected-tokens" });
  });

  it("canonicalizes equivalent GUID casing, not actual identity changes", async () => {
    const { seal, protector } = tokenHarness();
    const context = tokenContext();
    context.identity = { ...context.identity, accountId: context.identity.accountId.toUpperCase() };
    await expect(protector.open(await seal(), context)).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
  });

  it.each([0, 1, 13, 29])("refuses modified version/nonce/tag/ciphertext at byte %i", async (offset) => {
    const { seal, protector } = tokenHarness();
    const envelope = await seal();
    const bytes = Buffer.from(envelope.sealed, "base64url");
    bytes[offset] ^= 1;
    await expect(protector.open({ ...envelope, sealed: bytes.toString("base64url") }, tokenContext()))
      .resolves.toEqual({ status: "invalid-protected-tokens" });
  });

  it("binds the key ID even when an alias resolves to identical key material", async () => {
    const { keys, seal, protector } = tokenHarness();
    keys.set("key-alias", keys.get("test-key-1")!);
    await expect(protector.open({ ...await seal(), keyId: "key-alias" }, tokenContext()))
      .resolves.toEqual({ status: "invalid-protected-tokens" });
  });

  it.each([null, [], { accessToken: "only-one" }, { ...fixtureTokens, password: "fixture-only" }])(
    "rejects an authenticated but invalid decrypted payload: %j", async (payload) => {
      const { protector, envelope } = await sealUnsafePayloadForTests(Buffer.from(JSON.stringify(payload)));
      await expect(protector.open(envelope, tokenContext())).resolves.toEqual({ status: "invalid-protected-tokens" });
    },
  );

  it.each([Buffer.from("{bad-json"), Buffer.from([0xc3, 0x28])])(
    "rejects authenticated malformed JSON/UTF-8 without returning partial plaintext", async (payload) => {
      const { protector, envelope } = await sealUnsafePayloadForTests(payload);
      await expect(protector.open(envelope, tokenContext())).resolves.toEqual({ status: "invalid-protected-tokens" });
    },
  );

  it("rejects noncanonical base64url even when it decodes to identical packet bytes", () => {
    const bytes = Buffer.alloc(31);
    bytes[0] = 1;
    const canonical = bytes.toString("base64url");
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    const alternate = canonical.slice(0, -1) + alphabet[alphabet.indexOf(canonical.at(-1)!) + 1];
    expect(Buffer.from(alternate, "base64url")).toEqual(bytes);
    expect(decodeTokenEnvelope(canonical)).not.toBeNull();
    expect(decodeTokenEnvelope(alternate)).toBeNull();
  });
});
