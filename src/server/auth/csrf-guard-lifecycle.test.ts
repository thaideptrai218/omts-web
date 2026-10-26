import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { guard, loginPolicy, logoutPolicy, mutation } from "./__tests__/csrf-fixture";

afterEach(() => vi.useRealTimers());
describe("mutation body lifecycle and redacted failures", () => {
  it("bounds a stalled stream even if its cancel promise never completes", async () => {
    vi.useFakeTimers();
    const cancel = vi.fn(() => new Promise<void>(() => {}));
    const body = new ReadableStream<Uint8Array>({ cancel });
    const request = mutation({ body, duplex: "half" } as RequestInit);
    const pending = guard().check(request, { ...loginPolicy, timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    expect(await pending).toEqual({ status: "rejected", httpStatus: 408 });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(body.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("does not reset the deadline when partial bytes arrive", async () => {
    vi.useFakeTimers();
    let controller: ReadableStreamDefaultController<Uint8Array> | undefined;
    const body = new ReadableStream<Uint8Array>({ start(value) { controller = value; } });
    const pending = guard().check(mutation({ body, duplex: "half" } as RequestInit), { ...loginPolicy, timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(80);
    controller?.enqueue(new TextEncoder().encode("{"));
    await vi.advanceTimersByTimeAsync(20);
    expect(await pending).toEqual({ status: "rejected", httpStatus: 408 });
    expect(vi.getTimerCount()).toBe(0);
  });
  it("honors aborts during body reading without returning the abort reason", async () => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const body = new ReadableStream<Uint8Array>();
    const pending = guard().check(mutation({ body, signal: abort.signal, duplex: "half" } as RequestInit), loginPolicy);
    abort.abort(new Error("fake-abort-secret"));
    expect(await pending).toEqual({ status: "rejected", httpStatus: 400 });
    expect(body.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it.each(["{}", ""])("rejects abort when a buffered read races cancellation: %j", async (content) => {
    vi.useFakeTimers();
    const abort = new AbortController();
    const policy = content ? loginPolicy : logoutPolicy;
    const request = mutation({ body: content, signal: abort.signal });
    const pending = guard().check(request, policy);
    // read() may already be fulfilled; its race must not override cancellation.
    abort.abort(new Error("fake-buffered-abort-secret"));
    const result = await pending;
    expect(result).toEqual({ status: "rejected", httpStatus: 400 });
    expect(request.body?.locked).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects already aborted, consumed or locked input", async () => {
    const aborted = mutation({ signal: AbortSignal.abort("fake-secret") });
    expect(await guard().check(aborted, loginPolicy)).toEqual({ status: "rejected", httpStatus: 400 });
    const consumed = mutation();
    await consumed.text();
    expect(await guard().check(consumed, loginPolicy)).toEqual({ status: "rejected", httpStatus: 400 });
    const locked = mutation();
    const reader = locked.body?.getReader();
    try { expect(await guard().check(locked, loginPolicy)).toEqual({ status: "rejected", httpStatus: 400 }); }
    finally { await reader?.cancel(); reader?.releaseLock(); }
  });
  it("redacts read and cancellation errors and removes timers after failure", async () => {
    vi.useFakeTimers();
    const body = new ReadableStream<Uint8Array>({ pull(controller) { controller.error(new Error("fake-read-secret")); } });
    const result = await guard().check(mutation({ body, duplex: "half" } as RequestInit), loginPolicy);
    expect(result).toEqual({ status: "rejected", httpStatus: 400 });
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("snapshots route policy before await, and clears timers on success", async () => {
    vi.useFakeTimers();
    const policy = { ...loginPolicy };
    const request = mutation();
    const pending = guard().check(request, policy);
    if (policy.body === "json") policy.maxBytes = 1;
    policy.timeoutMs = 1;
    expect((await pending).status).toBe("allowed");
    expect(vi.getTimerCount()).toBe(0);
    expect(await guard().check(request, loginPolicy)).toEqual({ status: "rejected", httpStatus: 400 });
  });
  it("still rejects a nonempty logout stream with falsely advertised zero length", async () => {
    const request = mutation({ body: "{}", headers: { "Content-Length": "0" } });
    expect(await guard().check(request, logoutPolicy)).toEqual({ status: "rejected", httpStatus: 413 });
  });
  it("fails closed on non-byte stream chunks without returning chunk contents", async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue("fake-chunk-secret"); controller.close(); } });
    expect(await guard().check(mutation({ body, duplex: "half" } as RequestInit), loginPolicy))
      .toEqual({ status: "rejected", httpStatus: 400 });
  });
});

describe("test-only composition: guard must precede upstream and session writes", () => {
  const rejectedRequests: RequestInit[] = [
    { headers: { "Content-Type": "text/plain" } },
    { headers: { "Sec-Fetch-Site": "same-site" } },
    { headers: { "Content-Length": "999999" } },
    { body: "{fake-json-secret" },
    { body: "x".repeat(65_537) },
  ];
  it.each(rejectedRequests)("never continues after media/body/metadata rejection %#", async (init) => {
    const upstream = vi.fn();
    const writeSession = vi.fn();
    const result = await guard().check(mutation(init), loginPolicy);
    if (result.status === "allowed") { upstream(); writeSession(); }
    expect(result.status).toBe("rejected");
    expect(upstream).not.toHaveBeenCalled();
    expect(writeSession).not.toHaveBeenCalled();
  });
  it.each([
    ["login", loginPolicy], ["logout", logoutPolicy],
    ["profile-update", { ...loginPolicy, method: "PUT" }],
    ["gated-password", loginPolicy], ["gated-contact", { ...loginPolicy, method: "PATCH" }],
  ] as const)("blocks %s without Origin/header and only continues once for valid input", async (_, policy) => {
    const gate = guard();
    const upstream = vi.fn(async () => undefined);
    const writeSession = vi.fn(async () => undefined);
    async function handle(request: Request) {
      const checked = await gate.check(request, policy);
      if (checked.status !== "allowed") return checked.status;
      await upstream();
      await writeSession();
      return "continued";
    }
    for (const header of ["origin", "X-OMTS-Request"]) {
      const request = mutation({ method: policy.method, body: policy.body === "none" ? undefined : "{}" });
      request.headers.delete(header);
      const read = request.body ? vi.spyOn(request.body, "getReader") : undefined;
      expect(await handle(request)).toBe("rejected");
      if (read) expect(read).not.toHaveBeenCalled();
      expect(request.bodyUsed).toBe(false);
    }
    expect(upstream).not.toHaveBeenCalled();
    expect(writeSession).not.toHaveBeenCalled();
    expect(await handle(mutation({ method: policy.method, body: policy.body === "none" ? undefined : "{}" }))).toBe("continued");
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(writeSession).toHaveBeenCalledTimes(1);
  });
  it("cannot turn a valid custom header or existing cookie into an Origin bypass", async () => {
    const request = mutation({ headers: { Origin: "https://evil.test", Cookie: "omts_web_sid_dev=fake-secret" } });
    const response = new Response();
    const network = vi.spyOn(globalThis, "fetch");
    try {
      const result = await guard().check(request, loginPolicy);
      expect(result).toEqual({ status: "rejected", httpStatus: 403 });
      expect(Object.keys(result).sort()).toEqual(["httpStatus", "status"]);
      expect(network).not.toHaveBeenCalled();
      expect(response.headers.has("set-cookie")).toBe(false);
      expect(response.headers.has("access-control-allow-origin")).toBe(false);
    } finally { network.mockRestore(); }
  });
});
