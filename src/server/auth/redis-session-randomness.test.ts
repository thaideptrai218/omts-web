import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("node:crypto", () => ({ randomUUID() { throw new Error("private fixture entropy failure"); } }));
import { redisHarness } from "@/server/auth/__tests__/redis-session-fixture";
import { newSession, sessionHash, sessionValues } from "@/server/auth/__tests__/session-fixture";

describe("Redis adapter revision entropy failure", () => {
  it("does not create a predictable revision or expose the entropy error", async () => {
    const h = redisHarness();
    await expect(h.store.create(newSession())).resolves.toEqual({ status: "unavailable" });
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
  it("does not update using a stale or fallback revision", async () => {
    const h = redisHarness(); h.found();
    await expect(h.store.compareAndSet(sessionHash, h.session.revision, sessionValues(h.session))).resolves.toEqual({ status: "unavailable" });
    expect(h.commands.eval).not.toHaveBeenCalled();
  });
});
