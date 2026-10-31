import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fixtureTokens, tokenContext, tokenHarness } from "@/server/auth/__tests__/token-protection-fixture";
import { createSessionHarness, newSession } from "@/server/auth/__tests__/session-fixture";

describe("BFF server token protection", () => {
  it("round-trips only the minimal token bundle with a versioned non-plaintext envelope", async () => {
    const { seal, protector } = tokenHarness();
    const envelope = await seal();
    expect(Object.keys(envelope).sort()).toEqual(["keyId", "sealed"]);
    expect(envelope.sealed).toMatch(/^[A-Za-z0-9_-]{40,16384}$/);
    expect(Buffer.from(envelope.sealed, "base64url")[0]).toBe(1);
    const serialized = JSON.stringify(envelope);
    expect(serialized).not.toContain(fixtureTokens.accessToken);
    expect(serialized).not.toContain(fixtureTokens.refreshToken);
    await expect(protector.open(envelope, tokenContext())).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
  });

  it("uses a fresh nonce when protecting the same tokens and context twice", async () => {
    const { seal } = tokenHarness();
    const first = await seal();
    const second = await seal();
    expect(first.sealed).not.toBe(second.sealed);
    expect(Buffer.from(first.sealed, "base64url").subarray(1, 13))
      .not.toEqual(Buffer.from(second.sealed, "base64url").subarray(1, 13));
  });

  it("preserves opaque token values without trimming or interpreting JWT claims", async () => {
    const { protector } = tokenHarness();
    const tokens = { accessToken: " opaque-access ", refreshToken: "không-phải-jwt" };
    const result = await protector.protect(tokens, tokenContext());
    if (result.status !== "protected") throw new Error("Expected protected bundle");
    await expect(protector.open(result.protectedTokens, tokenContext())).resolves.toEqual({ status: "opened", tokens });
  });

  it("stores a real protected envelope in the test store without persisting raw tokens", async () => {
    const { seal, protector } = tokenHarness();
    const envelope = await seal();
    const { create, store } = createSessionHarness();
    await create(newSession({ protectedTokens: envelope }));
    const result = await store.read(tokenContext().idHash);
    if (result.status !== "found") throw new Error("Expected stored test session");
    expect(JSON.stringify(result)).not.toContain(fixtureTokens.accessToken);
    await expect(protector.open(result.session.protectedTokens, tokenContext()))
      .resolves.toEqual({ status: "opened", tokens: fixtureTokens });
  });

  it("requires re-protection when phase metadata changes, without deciding that transition", async () => {
    const { seal, protector } = tokenHarness();
    const old = await seal();
    const changed = tokenContext({ phase: "application" });
    await expect(protector.open(old, changed)).resolves.toEqual({ status: "invalid-protected-tokens" });
    const fresh = await protector.protect(fixtureTokens, changed);
    if (fresh.status !== "protected") throw new Error("Expected protected fixture");
    await expect(protector.open(fresh.protectedTokens, changed)).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
  });
});
