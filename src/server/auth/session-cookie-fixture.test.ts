import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createCookieFixture } from "../../../tests/fixtures/cookie-browser/server";

const origin = "http://127.0.0.1:4105";
const env = { OMTS_COOKIE_FIXTURE_ENABLED: "isolated-test-only", OMTS_COOKIE_FIXTURE_ORIGIN: origin, OMTS_COOKIE_FIXTURE_RUN_ID: "12345678-1234-1234-1234-123456789012" };
function request(action: string, headers: HeadersInit = {}, body: string | undefined = action === "clear" ? undefined : "{}") {
  return new Request(origin + "/check/" + action, { method: "POST", body,
    headers: { Origin: origin, "X-OMTS-Request": "web", ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers } });
}
describe("isolated cookie fixture safety and composition", () => {
  it("returns Allow with method rejection instead of an incomplete HTTP405", async () => {
    const handle = createCookieFixture(env);
    for (const method of ["GET", "OPTIONS"]) {
      const response = await handle(new Request(origin + "/check/issue", { method }), "issue");
      expect(response.status).toBe(405);
      expect(response.headers.get("allow")).toBe("POST");
      expect(response.headers.has("set-cookie")).toBe(false);
    }
  });
  it.each([{}, { ...env, OMTS_COOKIE_FIXTURE_ENABLED: "1" }, { ...env, OMTS_COOKIE_FIXTURE_RUN_ID: undefined },
    { ...env, OMTS_COOKIE_FIXTURE_ORIGIN: "http://0.0.0.0:4105" }, { ...env, OMTS_COOKIE_FIXTURE_ORIGIN: "http://localhost:4105" },
    { ...env, OMTS_COOKIE_FIXTURE_ORIGIN: "https://127.0.0.1:4105" }, { ...env, OMTS_COOKIE_FIXTURE_ORIGIN: "http://127.0.0.1:99999" }])(
    "cannot start without explicit fixture opt-in and bounded loopback config %#", (input) => {
      expect(() => createCookieFixture(input)).toThrow();
    },
  );
  it.each(["omts_web_sid_dev=" + "B".repeat(42) + "A", "omts_web_sid_dev=bad",
    `omts_web_sid_dev=${"A".repeat(43)}; omts_web_sid_dev=${"A".repeat(43)}`])(
    "never overwrites or clears an unknown/ambiguous SID %#", async (cookie) => {
      const handle = createCookieFixture(env);
      for (const action of ["issue", "clear", "expire"]) {
        const response = await handle(request(action, { Cookie: cookie }), action);
        expect(response.status).toBe(409);
        expect(response.headers.has("set-cookie")).toBe(false);
        expect(await response.json()).toEqual({ status: "foreign-cookie-refused" });
      }
    },
  );
  it("passes real helpers through no-store responses, without JSON SID or upstream", async () => {
    const handle = createCookieFixture(env);
    const network = vi.spyOn(globalThis, "fetch");
    try {
      const issued = await handle(request("issue"), "issue");
      expect(issued.status).toBe(200);
      const cookie = issued.headers.get("set-cookie")?.split(";")[0];
      expect(cookie).toBe("omts_web_sid_dev=" + "A".repeat(43));
      expect(JSON.stringify(await issued.json())).not.toContain("A".repeat(43));
      const probe = await handle(new Request(origin + "/outside", { headers: { Cookie: cookie ?? "" } }), "probe");
      expect(probe.headers.get("cache-control")).toBe("no-store");
      expect(await probe.json()).toMatchObject({ cookie: "fixture-cookie", expiry: "active", writes: 1 });
      const advanced = await handle(request("expire", { Cookie: cookie ?? "" }), "expire");
      expect(advanced.status).toBe(200);
      const expired = await handle(new Request(origin + "/check/probe", { headers: { Cookie: cookie ?? "" } }), "probe");
      expect(await expired.json()).toMatchObject({ cookie: "fixture-cookie", expiry: "expired" });
      const clear = await handle(request("clear", { Cookie: cookie ?? "" }), "clear");
      expect(clear.headers.get("set-cookie")).toContain("; Max-Age=0;");
      expect(network).not.toHaveBeenCalled();
    } finally { network.mockRestore(); }
  });
  it.each(["issue", "clear", "expire"])("rejects foreign Origin before %s writes", async (action) => {
    const handle = createCookieFixture(env);
    const response = await handle(request(action, { Origin: "http://localhost:4105" }), action);
    expect(response.status).toBe(403);
    expect(response.headers.has("set-cookie")).toBe(false);
    const probe = await handle(new Request(origin + "/check/probe"), "probe");
    expect(await probe.json()).toMatchObject({ cookie: "missing", expiry: "not-issued", writes: 0 });
  });
  it.each([
    ["missing-origin", "issue", 403], ["missing-marker", "clear", 403],
    ["other-port", "issue", 403], ["combined-origins", "issue", 403],
    ["fetch-none", "clear", 403], ["simple-media", "issue", 415],
    ["invalid-json", "issue", 400], ["overflow", "issue", 413],
    ["nonempty-clear", "clear", 413],
  ] as const)("keeps an issued fixture session unchanged after %s", async (scenario, action, status) => {
    const handle = createCookieFixture(env);
    const issued = await handle(request("issue"), "issue");
    const cookie = issued.headers.get("set-cookie")?.split(";")[0] ?? "";
    expect(issued.status).toBe(200);
    const body = scenario === "invalid-json" ? "{fake-body-secret"
      : scenario === "overflow" ? "x".repeat(1025) : "{}";
    const rejected = request(action, { Cookie: cookie }, action === "clear" && scenario !== "nonempty-clear" ? undefined : body);
    if (scenario === "missing-origin") rejected.headers.delete("origin");
    if (scenario === "missing-marker") rejected.headers.delete("x-omts-request");
    if (scenario === "other-port") rejected.headers.set("origin", "http://127.0.0.1:4106");
    if (scenario === "combined-origins") rejected.headers.append("origin", origin);
    if (scenario === "fetch-none") rejected.headers.set("sec-fetch-site", "none");
    if (scenario === "simple-media") rejected.headers.set("content-type", "text/plain");
    const response = await handle(rejected, action);
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(response.headers.has("access-control-allow-origin")).toBe(false);
    expect(await response.json()).toEqual({ status: "rejected" });
    const probe = await handle(new Request(origin + "/check/probe", { headers: { Cookie: cookie } }), "probe");
    expect(await probe.json()).toMatchObject({ cookie: "fixture-cookie", expiry: "active", writes: 1 });
  });
});
