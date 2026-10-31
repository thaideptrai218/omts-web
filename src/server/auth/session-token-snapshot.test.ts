import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createSessionTokenProtector } from "@/server/auth/session-token-protector";
import { fixtureTokens, tokenContext, tokenHarness } from "@/server/auth/__tests__/token-protection-fixture";

function pendingGate() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => { release = resolve; });
  return { wait, release: () => release() };
}

describe("token snapshots across async key-provider boundaries", () => {
  it("protects the validated snapshot, not input mutated while waiting for the key", async () => {
    const { provider } = tokenHarness();
    const gate = pendingGate();
    const protector = createSessionTokenProtector({
      ...provider, async active() { await gate.wait; return provider.active(); },
    });
    const tokens = { ...fixtureTokens };
    const context = tokenContext();
    const original = structuredClone(context);
    const pending = protector.protect(tokens, context);
    tokens.accessToken = "changed-fixture";
    context.phase = "application";
    context.identity.accountId = "222bb318-a72e-49aa-a8d7-a6169f889007";
    gate.release();
    const result = await pending;
    if (result.status !== "protected") throw new Error("Expected protected fixture");
    await expect(protector.open(result.protectedTokens, original)).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
    await expect(protector.open(result.protectedTokens, context)).resolves.toEqual({ status: "invalid-protected-tokens" });
  });

  it("opens validated envelope/context snapshots despite caller mutation while awaiting lookup", async () => {
    const { provider, seal } = tokenHarness();
    const envelope = { ...await seal() };
    const gate = pendingGate();
    const protector = createSessionTokenProtector({
      ...provider, async byId(keyId) { await gate.wait; return provider.byId(keyId); },
    });
    const context = tokenContext();
    const pending = protector.open(envelope, context);
    envelope.keyId = "unrelated-key";
    envelope.sealed = "A".repeat(64);
    context.phase = "application";
    gate.release();
    await expect(pending).resolves.toEqual({ status: "opened", tokens: fixtureTokens });
  });
});
