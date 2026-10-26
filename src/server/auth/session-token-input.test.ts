import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { maxPlaintextBytes } from "@/server/auth/session-token-format";
import { fixtureTokens, tokenContext, tokenHarness } from "@/server/auth/__tests__/token-protection-fixture";

describe("token-protection input boundaries", () => {
  it.each([
    ["null", null], ["array", []], ["missing token", { accessToken: "fixture-only" }],
    ["empty token", { ...fixtureTokens, accessToken: "" }],
    ["blank token", { ...fixtureTokens, refreshToken: " " }],
    ["password", { ...fixtureTokens, password: "fixture-only" }],
    ["profile", { ...fixtureTokens, displayName: "unexpected" }],
    ["expiry", { ...fixtureTokens, accessTokenExpiresAt: "unexpected" }],
  ])("rejects %s before requesting an encryption key", async (_, input) => {
    const { provider, protector } = tokenHarness();
    const active = vi.spyOn(provider, "active");
    await expect(protector.protect(input, tokenContext())).resolves.toEqual({ status: "invalid-input" });
    expect(active).not.toHaveBeenCalled();
  });

  it.each([null, {}, { ...tokenContext(), idHash: "raw-sid" }, { ...tokenContext(), phase: "unknown" }])(
    "rejects malformed context without opening a key", async (context) => {
      const { provider, protector } = tokenHarness();
      const active = vi.spyOn(provider, "active");
      await expect(protector.protect(fixtureTokens, context)).resolves.toEqual({ status: "invalid-input" });
      expect(active).not.toHaveBeenCalled();
    },
  );

  it("respects the existing envelope cap exactly, including JSON overhead", async () => {
    const { protector } = tokenHarness();
    const base = { accessToken: "", refreshToken: "r" };
    const length = maxPlaintextBytes - Buffer.byteLength(JSON.stringify(base));
    const tokens = { ...base, accessToken: "a".repeat(length) };
    const result = await protector.protect(tokens, tokenContext());
    expect(result.status).toBe("protected");
    if (result.status === "protected") expect(result.protectedTokens.sealed.length).toBe(16_384);
    await expect(protector.protect({ ...tokens, accessToken: tokens.accessToken + "a" }, tokenContext()))
      .resolves.toEqual({ status: "invalid-input" });
  });

  it("counts UTF-8 bytes, not just JavaScript string length", async () => {
    const { provider, protector } = tokenHarness();
    const active = vi.spyOn(provider, "active");
    await expect(protector.protect({ accessToken: "ư".repeat(5000), refreshToken: "ư".repeat(5000) }, tokenContext()))
      .resolves.toEqual({ status: "invalid-input" });
    expect(active).not.toHaveBeenCalled();
  });

  it.each([null, {}, { keyId: "bad/key", sealed: "A".repeat(64) },
    { keyId: "test-key-1", sealed: "A".repeat(39) },
    { keyId: "test-key-1", sealed: "A".repeat(16_385) },
    { keyId: "test-key-1", sealed: "A".repeat(64) },
  ])("rejects malformed envelopes before looking up a key", async (envelope) => {
    const { provider, protector } = tokenHarness();
    const lookup = vi.spyOn(provider, "byId");
    await expect(protector.open(envelope, tokenContext())).resolves.toEqual({ status: "invalid-protected-tokens" });
    expect(lookup).not.toHaveBeenCalled();
  });
});
