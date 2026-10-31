import { vi } from "vitest";
import { createRedisSessionStore } from "@/server/auth/redis-session-store";
import { initialTime, newSession } from "@/server/auth/__tests__/session-fixture";

export function storedFixture() {
  return { ...newSession(), schemaVersion: 1 as const, createdAtMs: initialTime,
    revision: "a90d3dd6-4c99-40c2-bb6b-a706dd89602a" };
}

// Command stubs only: they do not execute/reimplement Lua or prove Redis atomicity.
export function redisHarness() {
  const commands = {
    get: vi.fn<(key: string) => Promise<unknown>>().mockResolvedValue(null),
    eval: vi.fn<(script: string, options: { keys: string[]; arguments: string[] }) => Promise<unknown>>()
      .mockResolvedValue("stored"),
  };
  let time = initialTime;
  const store = createRedisSessionStore(commands, "unit", () => time);
  const session = storedFixture();
  return {
    commands, store, session,
    setTime(value: number) { time = value; },
    found() { commands.get.mockResolvedValue(JSON.stringify({ kind: "active", session })); },
    written() { return JSON.parse(commands.eval.mock.calls[0][1].arguments[0]); },
  };
}
