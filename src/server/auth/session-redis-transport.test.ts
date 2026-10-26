import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
// No SDK mock: these tests exercise the installed @redis/client against TCP faults.
import { connectSessionRedis } from "@/server/auth/session-redis-client";
import { withRedisTransportFault, withTestDeadline } from "@/server/auth/__tests__/redis-transport-fixture";

describe("real Redis SDK transport failures without a Redis server", () => {
  it("bounds a live TCP connection whose Redis handshake never answers", async () => {
    await withRedisTransportFault("silent", async (url, receivedData) => {
      const result = await withTestDeadline(connectSessionRedis({
        url, connectTimeoutMs: 1000, commandTimeoutMs: 500,
      }));
      expect(receivedData()).toBe(true);
      expect(result).toEqual({ status: "unavailable" });
    });
  });
  it("handles a socket dropped after the client sends its handshake without leaking errors", async () => {
    await withRedisTransportFault("disconnect", async (url, receivedData) => {
      const result = await withTestDeadline(connectSessionRedis({
        url, connectTimeoutMs: 1500, commandTimeoutMs: 500,
      }));
      expect(receivedData()).toBe(true);
      expect(result).toEqual({ status: "unavailable" });
    });
  });
});
