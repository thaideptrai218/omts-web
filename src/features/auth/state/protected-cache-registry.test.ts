import { describe, expect, it, vi } from "vitest";
import { createProtectedCacheRegistry } from "@/features/auth/state/protected-cache-registry";

describe("createProtectedCacheRegistry", () => {
  it("clears every registered protected cache in registration order", () => {
    const registry = createProtectedCacheRegistry();
    const callOrder: string[] = [];

    registry.register("profile", () => callOrder.push("profile"));
    registry.register("permissions", () => callOrder.push("permissions"));

    expect(registry.clearAll()).toEqual({
      attemptedKeys: ["profile", "permissions"],
      failedKeys: [],
    });
    expect(callOrder).toEqual(["profile", "permissions"]);
  });

  it("continues clearing other caches when one cleanup fails", () => {
    const registry = createProtectedCacheRegistry();
    const permissionsCleanup = vi.fn();

    registry.register("profile", () => {
      throw new Error("profile cache failed");
    });
    registry.register("permissions", permissionsCleanup);

    expect(registry.clearAll()).toEqual({
      attemptedKeys: ["profile", "permissions"],
      failedKeys: ["profile"],
    });
    expect(permissionsCleanup).toHaveBeenCalledOnce();
  });

  it("does not run a cleanup after it has been unregistered", () => {
    const registry = createProtectedCacheRegistry();
    const cleanup = vi.fn();
    const unregister = registry.register("profile", cleanup);

    unregister();
    registry.clearAll();

    expect(cleanup).not.toHaveBeenCalled();
  });

  it("rejects duplicate keys so one feature cannot silently replace another", () => {
    const registry = createProtectedCacheRegistry();
    registry.register("profile", vi.fn());

    expect(() => registry.register("profile", vi.fn())).toThrow(
      'Protected cache cleanup "profile" is already registered.',
    );
  });
});
