import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionExpiryChannel } from "@/shared/session/session-expiry-channel";
import { createBffSessionReader } from "./bff-session-reader";
import { authenticatedSnapshot } from "./__fixtures__/bff-session";

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe("dormant browser session reader", () => {
  it("only calls the fixed same-origin BFF with cookies and no-store, without a bearer token", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(authenticatedSnapshot()));
    expect(await createBffSessionReader(fetcher).read()).toEqual(authenticatedSnapshot());
    expect(fetcher).toHaveBeenCalledExactlyOnceWith("/api/auth/session", {
      method: "GET", credentials: "same-origin", cache: "no-store", redirect: "error",
      headers: { Accept: "application/json" }, signal: expect.any(AbortSignal),
    });
  });

  it.each([
    [401, { status: "anonymous", clearCookie: true }],
    [403, { status: "onboarding-required", phase: "contact-verification-required", destination: "/onboarding/contact" }],
    [503, { status: "unavailable" }],
  ])("returns HTTP %s as data without emitting global expiry or trying refresh", async (status, body) => {
    const publish = vi.spyOn(sessionExpiryChannel, "publish");
    const fetcher = vi.fn<typeof fetch>(async () => Response.json(body, { status: status as number }));
    expect(await createBffSessionReader(fetcher).read()).toEqual(body);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(publish).not.toHaveBeenCalled();
  });

  it.each([
    () => Response.json(authenticatedSnapshot(), { status: 401 }),
    () => new Response("<html>login</html>", { headers: { "Content-Type": "text/html" } }),
    () => new Response("bad-json", { headers: { "Content-Type": "application/json" } }),
    () => new Response(null, { status: 204 }),
    () => Response.json({ status: "anonymous", clearCookie: false }, { status: 200 }),
    () => {
      const response = Response.json(authenticatedSnapshot());
      Object.defineProperty(response, "redirected", { value: true });
      return response;
    },
  ])("rejects a contradictory or unusable response %#", async (response) => {
    const fetcher = vi.fn<typeof fetch>(async () => response());
    expect(await createBffSessionReader(fetcher).read()).toEqual({ status: "invalid-response" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("keeps network failure distinct from anonymous and redacts the original cause", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => { throw new Error("private-fixture-body"); });
    expect(await createBffSessionReader(fetcher).read()).toEqual({ status: "unavailable" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("does not start a request that was already cancelled or superseded", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const reader = createBffSessionReader(fetcher);
    expect(await reader.read({ signal: AbortSignal.abort() })).toEqual({ status: "cancelled" });
    expect(await reader.read({ isCurrent: () => false })).toEqual({ status: "stale" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("settles cancellation even if an injected fetch ignores the signal", async () => {
    const abort = new AbortController();
    const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
    const pending = createBffSessionReader(fetcher).read({ signal: abort.signal });
    abort.abort();
    expect(await pending).toEqual({ status: "cancelled" });
    expect(fetcher.mock.calls[0][1]!.signal!.aborted).toBe(true);
  });

  it("stops waiting at the read deadline without declaring logout or retrying", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>(() => new Promise(() => {}));
    const pending = createBffSessionReader(fetcher).read();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toEqual({ status: "unavailable" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("includes a stalled JSON body in the same deadline", async () => {
    vi.useFakeTimers();
    const response = Response.json(authenticatedSnapshot());
    vi.spyOn(response, "json").mockImplementation(() => new Promise(() => {}));
    const pending = createBffSessionReader(async () => response).read();
    await vi.advanceTimersByTimeAsync(5000);
    expect(await pending).toEqual({ status: "unavailable" });
  });

  it("rejects a buffered success if the caller aborts during body parsing", async () => {
    const abort = new AbortController();
    const response = Response.json(authenticatedSnapshot());
    vi.spyOn(response, "json").mockImplementation(async () => { abort.abort(); return authenticatedSnapshot(); });
    expect(await createBffSessionReader(async () => response).read({ signal: abort.signal })).toEqual({ status: "cancelled" });
  });

  it("discards a body read after a newer session operation invalidated it", async () => {
    let current = true;
    const response = Response.json(authenticatedSnapshot());
    vi.spyOn(response, "json").mockImplementation(async () => { current = false; return authenticatedSnapshot(); });
    expect(await createBffSessionReader(async () => response).read({ isCurrent: () => current })).toEqual({ status: "stale" });
  });

  it("does not carry identity from one call into the next call", async () => {
    const first = authenticatedSnapshot();
    const second = { ...first, identity: { ...first.identity, accountId: "7847775a-8540-43e6-bfc3-caa12bcda270", username: "second.user" } };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(first)).mockResolvedValueOnce(Response.json(second));
    const reader = createBffSessionReader(fetcher);
    expect(await reader.read()).toEqual(first);
    expect(await reader.read()).toEqual(second);
    expect(first.identity.username).toBe("fixture.user");
  });

  it("removes caller listeners and read timers after success", async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const remove = vi.spyOn(abort.signal, "removeEventListener");
    await createBffSessionReader(async () => Response.json(authenticatedSnapshot())).read({ signal: abort.signal });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });
});
