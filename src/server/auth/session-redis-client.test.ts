import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const sdk = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@redis/client", () => sdk);
import { connectSessionRedis } from "@/server/auth/session-redis-client";

const config = { url: "redis://127.0.0.1:6379/0", connectTimeoutMs: 1000, commandTimeoutMs: 500 };
function clientFixture() {
  return { connect: vi.fn().mockResolvedValue(undefined), destroy: vi.fn(), on: vi.fn(),
    get: vi.fn().mockResolvedValue(null), eval: vi.fn().mockResolvedValue("stored"), isOpen: true, isReady: true };
}

describe("explicit Redis connection configuration", () => {
  beforeEach(() => { sdk.createClient.mockReset(); });
  it("uses bounded timeouts with no offline replay, auto reconnect or maintenance redirect", async () => {
    const client = clientFixture(); sdk.createClient.mockReturnValue(client);
    const result = await connectSessionRedis(config);
    expect(sdk.createClient).toHaveBeenCalledWith({
      url: config.url, socket: { connectTimeout: 1000, reconnectStrategy: false },
      commandOptions: { timeout: 500 }, disableOfflineQueue: true, maintNotifications: "disabled",
    });
    expect(client.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(result.status).toBe("connected");
    if (result.status !== "connected") throw new Error("Expected connection fixture");
    await expect(result.connection.commands.get("fixture-key")).resolves.toBeNull();
    await expect(result.connection.commands.eval("fixture-script", { keys: ["fixture-key"], arguments: [] })).resolves.toBe("stored");
    client.isReady = false;
    await expect(result.connection.commands.get("fixture-key")).rejects.toThrow("Session store unavailable");
    await expect(result.connection.commands.eval("fixture-script", { keys: [], arguments: [] })).rejects.toThrow("Session store unavailable");
    expect(client.get).toHaveBeenCalledTimes(1); expect(client.eval).toHaveBeenCalledTimes(1);
    result.connection.close(); expect(client.destroy).toHaveBeenCalledTimes(1);
    client.isOpen = false; result.connection.close(); expect(client.destroy).toHaveBeenCalledTimes(1);
  });
  it.each(["", "not-url", "http://localhost/", "redis://remote.example/0", "rediss://remote.example/0?x=1",
    "redis://localhost/0#fragment", "rediss://remote.example/not-db"])("rejects invalid URL case %# before SDK use", async (url) => {
    await expect(connectSessionRedis({ ...config, url })).resolves.toEqual({ status: "invalid-config" });
    expect(sdk.createClient).not.toHaveBeenCalled();
  });
  it.each([0, -1, NaN, 1.5, 60_001])("rejects invalid timeout %s", async (timeout) => {
    await expect(connectSessionRedis({ ...config, commandTimeoutMs: timeout })).resolves.toEqual({ status: "invalid-config" });
    expect(sdk.createClient).not.toHaveBeenCalled();
  });
  it.each(["redis://localhost/0", "redis://[::1]/0", "rediss://remote.example/0"])("accepts explicit allowed transport %s", async (url) => {
    sdk.createClient.mockReturnValue(clientFixture());
    const result = await connectSessionRedis({ ...config, url });
    expect(result.status).toBe("connected");
    if (result.status === "connected") result.connection.close();
  });
  it("redacts connect exceptions and disposes an opened failed connection", async () => {
    const client = clientFixture(); sdk.createClient.mockReturnValue(client);
    client.connect.mockRejectedValue(new Error("private fixture credentials"));
    await expect(connectSessionRedis(config)).resolves.toEqual({ status: "unavailable" });
    expect(client.destroy).toHaveBeenCalledTimes(1);
  });
  it("redacts SDK construction exceptions", async () => {
    sdk.createClient.mockImplementation(() => { throw new Error("private fixture URL"); });
    await expect(connectSessionRedis(config)).resolves.toEqual({ status: "unavailable" });
  });
  it("bounds the entire connect/handshake even if socket connect already completed", async () => {
    vi.useFakeTimers();
    try {
      const client = clientFixture(); client.connect.mockReturnValue(new Promise(() => {}));
      sdk.createClient.mockReturnValue(client);
      const pending = connectSessionRedis(config);
      await vi.advanceTimersByTimeAsync(config.connectTimeoutMs);
      await expect(pending).resolves.toEqual({ status: "unavailable" });
      expect(client.destroy).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
  });
});
