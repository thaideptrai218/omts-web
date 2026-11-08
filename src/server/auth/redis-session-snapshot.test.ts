import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { redisHarness } from "@/server/auth/__tests__/redis-session-fixture";
import { newSession, sessionHash, sessionValues } from "@/server/auth/__tests__/session-fixture";

describe("Redis adapter snapshots around async commands", () => {
  it("captures update values before awaiting GET", async () => {
    const h = redisHarness();
    let release!: (raw: string) => void;
    h.commands.get.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const values = { ...sessionValues(h.session), protectedTokens: { ...h.session.protectedTokens } };
    const original = structuredClone(values);
    const pending = h.store.compareAndSet(sessionHash, h.session.revision, values);
    values.phase = "application"; values.protectedTokens.keyId = "changed";
    release(JSON.stringify({ kind: "active", session: h.session }));
    expect((await pending).status).toBe("updated");
    expect(h.written().session).toMatchObject(original);
  });
  it("captures create input and serialized payload before awaiting EVAL", async () => {
    const h = redisHarness();
    let release!: (reply: string) => void;
    h.commands.eval.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    const value = newSession();
    const original = structuredClone(value);
    const pending = h.store.create(value);
    Object.assign(value.identity, { accountId: "changed" });
    Object.assign(value.protectedTokens, { keyId: "changed" });
    release("stored");
    const result = await pending;
    expect(result).toMatchObject({ status: "created", session: original });
    expect(h.written().session).toMatchObject(original);
  });
});
