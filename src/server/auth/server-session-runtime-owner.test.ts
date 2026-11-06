import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { ServerSessionReadRuntime } from "./server-session-runtime";
import { createServerSessionRuntimeOwner } from "./server-session-runtime-owner";

function runtime() {
  const value: ServerSessionReadRuntime = {
    resolve: vi.fn(async () => ({ status: "anonymous" } as const)),
    resolveApplication: vi.fn(async () => ({
      status: "unauthenticated",
      clearCookie: false,
    } as const)),
    close: vi.fn(),
  };
  return value;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

describe("server session runtime owner", () => {
  it("shares one in-flight open across concurrent callers", async () => {
    const waiting = deferred<ReturnType<Parameters<typeof createServerSessionRuntimeOwner>[0]> extends Promise<infer T> ? T : never>();
    const open = vi.fn(() => waiting.promise);
    const owner = createServerSessionRuntimeOwner(open);
    const first = owner.get();
    const second = owner.get();
    const active = runtime();

    expect(first).toBe(second);
    await Promise.resolve();
    expect(open).toHaveBeenCalledOnce();
    waiting.resolve({ status: "ready", runtime: active });
    await expect(first).resolves.toEqual({ status: "ready", runtime: active });
  });

  it("caches only a ready runtime", async () => {
    const active = runtime();
    const open = vi.fn(async () => ({ status: "ready" as const, runtime: active }));
    const owner = createServerSessionRuntimeOwner(open);

    const first = await owner.get();
    const second = await owner.get();
    expect(first).toEqual({ status: "ready", runtime: active });
    expect(second).toEqual({ status: "ready", runtime: active });
    expect(open).toHaveBeenCalledOnce();
  });

  it.each([
    { status: "unavailable" as const },
    { status: "invalid-config" as const, fields: ["FIELD"] },
  ])("allows retry after non-ready result %#", async (failure) => {
    const active = runtime();
    const open = vi.fn()
      .mockResolvedValueOnce(failure)
      .mockResolvedValueOnce({ status: "ready", runtime: active });
    const owner = createServerSessionRuntimeOwner(open);

    await expect(owner.get()).resolves.toEqual(failure);
    await expect(owner.get()).resolves.toEqual({ status: "ready", runtime: active });
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("redacts opener exceptions and permits a later retry", async () => {
    const open = vi.fn()
      .mockRejectedValueOnce(new Error("private-runtime-detail"))
      .mockResolvedValueOnce({ status: "unavailable" });
    const owner = createServerSessionRuntimeOwner(open);

    await expect(owner.get()).resolves.toEqual({ status: "unavailable" });
    await expect(owner.get()).resolves.toEqual({ status: "unavailable" });
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("closes a cached runtime once and may open a fresh generation", async () => {
    const firstRuntime = runtime();
    const secondRuntime = runtime();
    const open = vi.fn()
      .mockResolvedValueOnce({ status: "ready", runtime: firstRuntime })
      .mockResolvedValueOnce({ status: "ready", runtime: secondRuntime });
    const owner = createServerSessionRuntimeOwner(open);

    await owner.get();
    owner.dispose();
    owner.dispose();
    expect(firstRuntime.close).toHaveBeenCalledOnce();
    await expect(owner.get()).resolves.toEqual({ status: "ready", runtime: secondRuntime });
  });

  it("closes and refuses a ready result that arrives after disposal", async () => {
    const waiting = deferred<{ status: "ready"; runtime: ServerSessionReadRuntime }>();
    const owner = createServerSessionRuntimeOwner(() => waiting.promise);
    const pending = owner.get();
    const lateRuntime = runtime();

    owner.dispose();
    waiting.resolve({ status: "ready", runtime: lateRuntime });
    await expect(pending).resolves.toEqual({ status: "unavailable" });
    expect(lateRuntime.close).toHaveBeenCalledOnce();
  });

  it("swallows disposal errors without retaining the broken runtime", async () => {
    const broken = runtime();
    vi.mocked(broken.close).mockImplementation(() => {
      throw new Error("private-close-detail");
    });
    const fresh = runtime();
    const open = vi.fn()
      .mockResolvedValueOnce({ status: "ready", runtime: broken })
      .mockResolvedValueOnce({ status: "ready", runtime: fresh });
    const owner = createServerSessionRuntimeOwner(open);

    await owner.get();
    expect(() => owner.dispose()).not.toThrow();
    await expect(owner.get()).resolves.toEqual({ status: "ready", runtime: fresh });
  });

  it("opens a fresh generation without waiting for a disposed connection attempt", async () => {
    const old = deferred<{ status: "ready"; runtime: ServerSessionReadRuntime }>();
    const fresh = runtime();
    const open = vi.fn().mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce({ status: "ready", runtime: fresh });
    const owner = createServerSessionRuntimeOwner(open);
    const pending = owner.get();
    await Promise.resolve();
    owner.dispose();
    await expect(owner.get()).resolves.toEqual({ status: "ready", runtime: fresh });
    const late = runtime();
    old.resolve({ status: "ready", runtime: late });
    await expect(pending).resolves.toEqual({ status: "unavailable" });
    expect(late.close).toHaveBeenCalledOnce();
    await expect(owner.get()).resolves.toEqual({ status: "ready", runtime: fresh });
  });
});
