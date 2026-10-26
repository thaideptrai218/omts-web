import { inspect } from "node:util";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createPendingLoginDelivery } from "./pending-login-delivery";

describe("request-owned pending login cookie", () => {
  const header = "fixture-cookie-header";

  it("blocks cookie extraction immediately on abandon and cleans up once", async () => {
    let finish!: () => void;
    const cleanup = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const delivery = createPendingLoginDelivery({ readForResponseHeader: () => header }, () => true, cleanup);
    expect(delivery.cookie.readForResponseHeader()).toBe(header);
    const first = delivery.abandon();
    expect(() => delivery.cookie.readForResponseHeader()).toThrow("LOGIN_DELIVERY_UNAVAILABLE");
    expect(delivery.abandon()).toBe(first);
    await Promise.resolve();
    finish();
    await first;
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("rechecks expiry or runtime ownership whenever a header is extracted", () => {
    let current = true;
    const delivery = createPendingLoginDelivery({ readForResponseHeader: () => header }, () => current, async () => {});
    current = false;
    expect(() => delivery.cookie.readForResponseHeader()).toThrow("LOGIN_DELIVERY_UNAVAILABLE");
  });

  it("rejects serialization and redacts inspection without calling the extractor", () => {
    const read = vi.fn(() => header);
    const delivery = createPendingLoginDelivery({ readForResponseHeader: read }, () => true, async () => {});
    expect(() => JSON.stringify(delivery)).toThrow("SESSION_COOKIE_NOT_SERIALIZABLE");
    expect(inspect(delivery)).not.toContain(header);
    expect(String(delivery.cookie)).toBe("PendingLoginCookie [REDACTED]");
    expect(read).not.toHaveBeenCalled();
  });

  it("redacts validation and cleanup exceptions", async () => {
    const delivery = createPendingLoginDelivery({ readForResponseHeader: () => header },
      () => { throw new Error("private-fixture-detail"); }, async () => { throw new Error("private-fixture-detail"); });
    expect(() => delivery.cookie.readForResponseHeader()).toThrow("LOGIN_DELIVERY_UNAVAILABLE");
    await expect(delivery.abandon()).resolves.toBeUndefined();
  });
});
