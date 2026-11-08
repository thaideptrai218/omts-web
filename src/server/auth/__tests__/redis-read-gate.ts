import type { SessionRedisCommands } from "@/server/auth/session-redis-client";

// Schedule one real GET's response; never fabricate a Redis reply or run Lua in JavaScript.
export function holdNextRedisGet(source: SessionRedisCommands) {
  let reached!: () => void;
  let resume!: () => void;
  let used = false;
  let lastReply: unknown;
  const captured = new Promise<void>((resolve) => { reached = resolve; });
  const released = new Promise<void>((resolve) => { resume = resolve; });
  const commands: SessionRedisCommands = {
    async get(key) {
      const raw = await source.get(key);
      if (!used) { used = true; reached(); await released; }
      return raw;
    },
    async eval(script, options) {
      lastReply = await source.eval(script, options);
      return lastReply;
    },
  };
  return { commands, captured, release: () => resume(), reply: () => lastReply };
}
