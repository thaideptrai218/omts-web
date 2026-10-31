import { inspect } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createBackendTransport } from "./backend-transport";

const environment = { NODE_ENV: "test", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "http://127.0.0.1:5280", OMTS_API_TIMEOUT_MS: "1000" };
const login = { endpoint: "login", body: { identifier: "qa", password: "fake-password1", clientType: "Web" } };
const ok = () => Response.json({ id: "fixture" });
afterEach(() => vi.useRealTimers());

describe("isolated BFF transport, no application activation", () => {
  it.each([
    [{}, "invalid-config"],
    [{ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" }, "disabled"],
    [{ ...environment, OMTS_DATA_SOURCE: "mock" }, "invalid-config"],
    [{ ...environment, NODE_ENV: "production" }, "invalid-config"],
  ])("does not send when config is inactive/invalid case %#", async (env, status) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await createBackendTransport(env, fetcher).request(login)).toEqual({ status });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([
    ["login", "POST", "/api/auth/login"], ["identity", "GET", "/api/me"],
    ["permissions", "GET", "/api/me/permissions"], ["profileRead", "GET", "/api/me/profile"],
    ["profileUpdate", "PUT", "/api/me/profile"], ["logout", "POST", "/api/auth/logout"],
  ])("sends exactly one catalog request for %s", async (endpoint, method, path) => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => ok());
    const request = endpoint === "login" ? login : {
      endpoint, accessToken: "fake-token", ...(endpoint === "profileUpdate" ? { body: { displayName: "Hải" } } : {}),
    };
    expect((await createBackendTransport(environment, fetcher).request(request)).status).toBe("success");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith(`http://127.0.0.1:5280${path}`, {
      method, headers: expect.any(Object), body: "body" in request ? JSON.stringify(request.body) : undefined,
      credentials: "omit", redirect: "error", cache: "no-store", signal: expect.any(AbortSignal),
    });
  });
  it("snapshots server config and request inputs without an import-time network call", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => ok());
    const env = { ...environment };
    const transport = createBackendTransport(env, fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    env.OMTS_API_BASE_URL = "https://evil.test";
    const input = structuredClone(login);
    const pending = transport.request(input);
    input.body.password = "changed";
    await pending;
    expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:5280/api/auth/login");
    expect(fetcher.mock.calls[0][1]?.body).toBe(JSON.stringify(login.body));
  });
  it.each(["refresh", "https://evil.test", "__proto__"])("does not send endpoint %s", async (endpoint) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(await createBackendTransport(environment, fetcher).request({ ...login, endpoint })).toEqual({ status: "invalid-request" });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each([401, 403, 409, 429, 500, 503])("never retries or refreshes HTTP %i", async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "MSG19" }, { status, headers: { "Retry-After": "5" } }));
    expect((await createBackendTransport(environment, fetcher).request({ endpoint: "identity", accessToken: "fake" })).status).toBe("http-error");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("discards thrown errors, including their request/token/cause and logs nothing", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("fake-password1", { cause: "fake-token" }));
      const result = await createBackendTransport(environment, fetcher).request(login);
      expect(result).toEqual({ status: "unavailable" });
      expect(inspect(result)).not.toMatch(/fake-password|fake-token/);
      expect(log).not.toHaveBeenCalled();
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally { log.mockRestore(); }
  });
  it("keeps the deadline active during body reading and clears it afterwards", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => new Response(new ReadableStream({
      start(controller) { init?.signal?.addEventListener("abort", () => controller.error(new Error("aborted")), { once: true }); },
    }), { headers: { "Content-Type": "application/json" } }));
    const pending = createBackendTransport(environment, fetcher).request(login);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual({ status: "timeout" });
    expect(fetcher.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("clears deadlines after success and network error", async () => {
    vi.useFakeTimers();
    await createBackendTransport(environment, vi.fn<typeof fetch>().mockResolvedValue(ok())).request(login);
    await createBackendTransport(environment, vi.fn<typeof fetch>().mockRejectedValue(new Error("fake"))).request(login);
    expect(vi.getTimerCount()).toBe(0);
  });
});
