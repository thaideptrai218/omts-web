import { createSecretKey } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("node:crypto", async (original) => ({
  ...await original<typeof import("node:crypto")>(),
  randomBytes() { throw new Error("fixture-private-entropy-failure"); },
}));
import { createSessionId } from "@/server/auth/session-id";
import { createSessionTokenProtector } from "@/server/auth/session-token-protector";
import { fixtureTokens, tokenContext } from "@/server/auth/__tests__/token-protection-fixture";

describe("cryptographic randomness unavailable", () => {
  it("does not fall back to a weak SID or expose the original failure", () => {
    expect(createSessionId).toThrow("BFF session ID generation unavailable.");
  });

  it("does not encrypt with a fixed/default nonce", async () => {
    const key = createSecretKey(Buffer.alloc(32, 7));
    const protector = createSessionTokenProtector({
      async active() { return { keyId: "fixture-key", key }; },
      async byId() { return key; },
    });
    await expect(protector.protect(fixtureTokens, tokenContext())).resolves.toEqual({ status: "unavailable" });
  });
});
