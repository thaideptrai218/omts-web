import { describe, expect, it, vi } from "vitest";
import { performLocalFirstLogout } from "@/features/auth/state/local-first-logout";

describe("performLocalFirstLogout", () => {
  it("clears the local session before invalidating the remote session", async () => {
    const callOrder: string[] = [];

    await performLocalFirstLogout(
      () => callOrder.push("local-cleared"),
      () => callOrder.push("protected-cache-cleared"),
      async () => {
        callOrder.push("remote-invalidated");
      },
    );

    expect(callOrder).toEqual([
      "local-cleared",
      "protected-cache-cleared",
      "remote-invalidated",
    ]);
  });

  it("keeps local cleanup applied when remote invalidation fails", async () => {
    const clearLocalSession = vi.fn();

    await expect(
      performLocalFirstLogout(
        clearLocalSession,
        vi.fn(),
        async () => {
          throw new Error("network unavailable");
        },
      ),
    ).rejects.toThrow("network unavailable");
    expect(clearLocalSession).toHaveBeenCalledOnce();
  });
});
