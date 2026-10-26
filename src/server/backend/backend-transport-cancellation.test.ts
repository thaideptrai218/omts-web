import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createBackendTransport } from "./backend-transport";

const environment = {
  NODE_ENV: "test", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "http://127.0.0.1:5280", OMTS_API_TIMEOUT_MS: "1000",
};
const input = { endpoint: "login", body: {} };

describe("server transport request cancellation", () => {
  it("refuses an already-aborted call without sending credentials", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await createBackendTransport(environment, fetcher).request(input, { signal: AbortSignal.abort() }))
      .toEqual({ status: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("aborts an in-flight fetch without replay or leaking the abort reason", async () => {
    const abort = new AbortController();
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => new Promise<Response>((_resolve, reject) => {
      init!.signal!.addEventListener("abort", () => reject(new Error("private-fixture-reason")), { once: true });
    }));
    const pending = createBackendTransport(environment, fetcher).request(input, { signal: abort.signal });
    abort.abort(new Error("private-fixture-reason"));
    expect(await pending).toEqual({ status: "unavailable" });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("does not publish a buffered success after the caller cancels", async () => {
    const abort = new AbortController();
    const fetcher = vi.fn<typeof fetch>(async () => {
      abort.abort();
      return Response.json({ value: "private-fixture-payload" });
    });
    expect(await createBackendTransport(environment, fetcher).request(input, { signal: abort.signal }))
      .toEqual({ status: "unavailable" });
  });

  it("removes the caller abort listener after a successful request", async () => {
    const abort = new AbortController();
    const remove = vi.spyOn(abort.signal, "removeEventListener");
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ ok: true }));
    const result = await createBackendTransport(environment, fetcher).request(input, { signal: abort.signal });
    expect(result).toMatchObject({ status: "success" });
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
