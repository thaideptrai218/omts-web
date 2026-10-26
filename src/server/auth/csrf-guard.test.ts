import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createCsrfGuard, type CsrfMutationPolicy } from "./csrf-guard";
import { environment, guard, loginPolicy, logoutPolicy, mutation } from "./__tests__/csrf-fixture";

describe("C2A mutation header guard", () => {
  it.each([undefined, "same-origin"])("allows an exact-origin JSON request with metadata %s", async (site) => {
    const request = mutation({ headers: site ? { "Sec-Fetch-Site": site } : {} });
    const result = await guard().check(request, loginPolicy);
    expect(result.status).toBe("allowed");
    if (result.status === "allowed") expect(result.body.readForValidation()).toEqual({});
  });
  it.each([null, "null", "https://evil.test", "https://web.example.test.evil.test", "https://sub.web.example.test",
    "http://web.example.test", "https://web.example.test:444", "https://web.example.test/", "https://WEB.example.test",
    "https://web.example.test:443", "https://web.example.test/account", "https://user@web.example.test",
    "https://web.example.test?x=1", "https://web.example.test#x", "https://web.example.test, https://web.example.test"])(
    "rejects missing/null/noncanonical/different Origin: %s", async (origin) => {
      const request = mutation();
      if (origin === null) request.headers.delete("origin"); else request.headers.set("origin", origin);
      expect(await guard().check(request, loginPolicy)).toEqual({ status: "rejected", httpStatus: 403 });
      expect(request.bodyUsed).toBe(false);
    },
  );
  it.each([null, "", "Web", "mobile", "web, web", "web secret"])("requires the exact custom header: %s", async (value) => {
    const request = mutation();
    if (value === null) request.headers.delete("X-OMTS-Request"); else request.headers.set("X-OMTS-Request", value);
    expect(await guard().check(request, loginPolicy)).toEqual({ status: "rejected", httpStatus: 403 });
    expect(request.bodyUsed).toBe(false);
  });
  it.each(["cross-site", "same-site", "none", "", "Same-Origin", "same-origin, same-origin", "unknown"])(
    "rejects supplementary metadata that is present but unsafe: %s", async (site) => {
      expect(await guard().check(mutation({ headers: { "Sec-Fetch-Site": site } }), loginPolicy))
        .toEqual({ status: "rejected", httpStatus: 403 });
    },
  );
  it.each(["GET", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"])("never treats %s as a login mutation", async (method) => {
    const request = mutation({ method, body: undefined });
    expect(await guard().check(request, loginPolicy)).toEqual({ status: "rejected", httpStatus: 405 });
  });
  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)("checks an explicit server policy for %s", async (method) => {
    expect((await guard().check(mutation({ method }), { ...loginPolicy, method })).status).toBe("allowed");
  });
  it("does not infer source Origin from Host, Referer, proxy headers or metadata", async () => {
    const request = mutation({ headers: { Host: "web.example.test", Referer: environment.OMTS_WEB_ORIGIN,
      "X-Forwarded-Host": "web.example.test", "X-Forwarded-Proto": "https", "Sec-Fetch-Site": "same-origin" } });
    request.headers.delete("origin");
    expect(await guard().check(request, loginPolicy)).toEqual({ status: "rejected", httpStatus: 403 });
  });
  it("uses case-insensitive header names, not case-insensitive values", async () => {
    expect((await guard().check(mutation({ headers: { "x-omts-request": "web" } }), loginPolicy)).status).toBe("allowed");
  });
  it("normalizes trusted config once, but requires browser-serialized incoming Origin", async () => {
    const env = { ...environment, OMTS_WEB_ORIGIN: "https://WEB.example.test:443/" };
    const gate = guard(env);
    env.OMTS_WEB_ORIGIN = "https://evil.test";
    expect((await gate.check(mutation(), loginPolicy)).status).toBe("allowed");
  });
  it("uses the exact dev loopback hostname and port, without switching profiles", async () => {
    const gate = guard({ NODE_ENV: "test", OMTS_WEB_ORIGIN: "http://localhost:3000", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" });
    expect((await gate.check(mutation({ headers: { Origin: "http://localhost:3000" } }), loginPolicy)).status).toBe("allowed");
    for (const origin of ["http://localhost:8082", "http://127.0.0.1:3000", "https://localhost:3000"]) {
      expect(await gate.check(mutation({ headers: { Origin: origin } }), loginPolicy)).toEqual({ status: "rejected", httpStatus: 403 });
    }
  });
  it.each([{}, { ...environment, NODE_ENV: "production", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" },
    { ...environment, NEXT_PUBLIC_OMTS_WEB_ORIGIN: environment.OMTS_WEB_ORIGIN }])("fails closed on invalid config %#", (env) => {
    const result = createCsrfGuard(env);
    expect(result.status).toBe("invalid-config");
    expect(result).not.toHaveProperty("guard");
  });
  it.each([{}, { ...loginPolicy, method: "GET" }, { ...loginPolicy, maxBytes: 0 }, { ...loginPolicy, maxBytes: 65_537 },
    { ...loginPolicy, timeoutMs: 0 }, { ...loginPolicy, timeoutMs: 60_001 }, { ...loginPolicy, origin: "https://evil.test" },
    { ...logoutPolicy, maxBytes: 10 }, { ...loginPolicy, maxBytes: NaN }, { ...loginPolicy, timeoutMs: 1.5 }])(
    "refuses malformed/caller-overridden route policy %#", async (input) => {
      expect(await guard().check(mutation(), input as CsrfMutationPolicy)).toEqual({ status: "invalid-policy" });
    },
  );
  it("redacts throwing policy/config getters and refuses non-Request input", async () => {
    const input = { ...loginPolicy, get method(): CsrfMutationPolicy["method"] { throw new Error("fake-policy-secret"); } };
    expect(await guard().check(mutation(), input)).toEqual({ status: "invalid-policy" });
    expect(createCsrfGuard({ get NODE_ENV() { throw new Error("fake-config-secret"); } }))
      .toEqual({ status: "invalid-config", fields: [] });
    expect(await guard().check({} as Request, loginPolicy)).toEqual({ status: "rejected", httpStatus: 400 });
  });
});
