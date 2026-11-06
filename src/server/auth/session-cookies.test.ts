import { inspect } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createSessionCookieHelpers } from "./session-cookies";
import { hashSessionId } from "./session-id";

const sid = "A".repeat(43);
const https = { NODE_ENV: "production", OMTS_WEB_ORIGIN: "https://web.example.test", OMTS_WEB_COOKIE_PROFILE: "https" };
const dev = { NODE_ENV: "test", OMTS_WEB_ORIGIN: "http://localhost:3000", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" };
function helpers(environment = https) {
  const result = createSessionCookieHelpers(environment);
  if (result.status !== "available") throw new Error("Unexpected test config rejection");
  return result.cookies;
}
function issueHeader(environment = https) {
  const result = helpers(environment).issue(sid);
  if (result.status !== "prepared") throw new Error("Unexpected test SID rejection");
  return result.cookie.readForResponseHeader();
}

describe("isolated BFF cookie preparation", () => {
  it.each([
    [https, "__Host-omts_web_sid", "; Secure"], [dev, "omts_web_sid_dev", ""],
    [{ ...dev, NODE_ENV: "development", OMTS_WEB_ORIGIN: "http://127.0.0.1:3000" }, "omts_web_sid_dev", ""],
    [{ ...dev, OMTS_WEB_ORIGIN: "http://[::1]:3000" }, "omts_web_sid_dev", ""],
    [{ ...https, NODE_ENV: "development" }, "__Host-omts_web_sid", "; Secure"],
  ])("prepares fixed session attributes for %j", (environment, name, secure) => {
    const header = issueHeader(environment);
    expect(header).toBe(`${name}=${sid}; Path=/; HttpOnly${secure}; SameSite=Lax`);
    expect(header).not.toMatch(/Domain|Expires|Max-Age|Partitioned|Priority/i);
    const response = new NextResponse(null, { headers: { "Set-Cookie": header } });
    expect(response.headers.getSetCookie()).toEqual([header]);
    expect(response.cookies.get(name)?.value).toBe(sid);
    expect(helpers(environment).read(`${name}=${sid}`)).toEqual({ status: "found", idHash: hashSessionId(sid) });
  });

  it.each([https, dev])("prepares an exact-scope expiry tombstone: %j", (environment) => {
    const cookie = helpers(environment).clear();
    const issued = issueHeader(environment);
    const name = issued.split("=")[0];
    expect(cookie.readForResponseHeader()).toBe(
      `${issued.replace(sid, "")}; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    );
    const response = new NextResponse(null, { headers: { "Set-Cookie": cookie.readForResponseHeader() } });
    const cleared = response.cookies.get(name);
    // Next's parsed view compacts falsy values (""/0). Assert deletion bytes on
    // the actual header, not optional properties in that lossy parsed view.
    expect(response.headers.getSetCookie()).toEqual([cookie.readForResponseHeader()]);
    expect(response.headers.get("set-cookie")).toContain(`${name}=;`);
    expect(response.headers.get("set-cookie")).toContain("; Max-Age=0;");
    expect(cleared).toMatchObject({ name, path: "/", httpOnly: true, sameSite: "lax" });
    const expires = cleared?.expires;
    expect(expires).toBeInstanceOf(Date);
    expect(expires instanceof Date ? expires.getTime() : expires).toBe(0);
    expect(cleared).not.toHaveProperty("domain");
    expect(Boolean(cleared?.secure)).toBe(environment === https);
  });

  it.each([0, 127, 251, 255])("roundtrips the base64url alphabet for fixed fake bytes %s", (byte) => {
    const value = Buffer.alloc(32, byte).toString("base64url");
    const cookies = helpers();
    const issued = cookies.issue(value);
    if (issued.status !== "prepared") throw new Error("Unexpected fake SID rejection");
    const pair = issued.cookie.readForResponseHeader().split(";")[0];
    expect(cookies.read(pair)).toEqual({ status: "found", idHash: hashSessionId(value) });
  });

  it.each([undefined, null, 1, {}, [], "", sid + "\r\nX-Fake: secret", `"${sid}"`,
    "A".repeat(42) + "B", sid + "=", sid + "; Domain=evil.test"])(
    "rejects invalid SID values without creating a header: %j", (input) => {
      expect(helpers().issue(input)).toEqual({ status: "invalid-sid" });
    },
  );

  it.each([{}, { ...dev, NODE_ENV: "production" }, { ...dev, OMTS_WEB_ORIGIN: "http://192.168.1.8:3000" },
    { ...https, OMTS_WEB_ORIGIN: "http://localhost:3000" }, { ...https, OMTS_WEB_COOKIE_PROFILE: "guess" },
    { ...https, NEXT_PUBLIC_OMTS_WEB_ORIGIN: https.OMTS_WEB_ORIGIN }])(
    "does not offer helpers for invalid configuration: %j", (environment: Record<string, unknown>) => {
      const result = createSessionCookieHelpers(environment);
      expect(result.status).toBe("invalid-config");
      expect(result).not.toHaveProperty("cookies");
      expect(JSON.stringify(result)).not.toContain(environment.OMTS_WEB_ORIGIN ?? "never-present-secret");
    },
  );
});

describe("cookie custody and caller boundaries", () => {
  it("redacts object inspection/coercion and rejects JSON, including nested values", () => {
    const result = helpers().issue(sid);
    if (result.status !== "prepared") throw new Error("Unexpected SID rejection");
    expect(String(result.cookie)).toBe("PreparedSessionCookie [REDACTED]");
    expect(`${result.cookie}`).not.toContain(sid);
    expect(inspect(result)).not.toContain(sid);
    expect(inspect(result.cookie, { showHidden: true })).not.toContain(sid);
    expect(Object.keys(result.cookie)).toEqual([]);
    expect({ ...result.cookie }).toEqual({});
    expect(() => JSON.stringify(result)).toThrowError("SESSION_COOKIE_NOT_SERIALIZABLE");
    expect(() => JSON.stringify({ nested: [result.cookie] })).toThrowError("SESSION_COOKIE_NOT_SERIALIZABLE");
    expect(Object.isFrozen(result.cookie)).toBe(true);
    // Explicit server extraction is deliberately sensitive, not redacted.
    expect(result.cookie.readForResponseHeader()).toContain(sid);
  });

  it("snapshots validated policy and ignores unsupported cookie overrides", () => {
    const environment = { ...https, OMTS_COOKIE_DOMAIN: "evil.test", OMTS_COOKIE_SECURE: false,
      OMTS_COOKIE_NAME: "custom", OMTS_COOKIE_MAX_AGE: 99, cookie: { domain: "evil.test", path: "/wrong" } };
    const result = createSessionCookieHelpers(environment);
    environment.OMTS_WEB_ORIGIN = "http://evil.test";
    environment.OMTS_WEB_COOKIE_PROFILE = "http-loopback-dev";
    if (result.status !== "available") throw new Error("Unexpected config rejection");
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.cookies)).toBe(true);
    const prepared = result.cookies.issue(sid);
    if (prepared.status !== "prepared") throw new Error("Unexpected SID rejection");
    expect(prepared.cookie.readForResponseHeader()).toBe(issueHeader());
    expect(result.cookies.clear().readForResponseHeader()).not.toMatch(/evil|wrong|custom|Max-Age=99/);
  });

  it("redacts throwing config getters and never coerces invalid SID objects", () => {
    const environment = { get NODE_ENV() { throw new Error("fake-config-secret"); } };
    expect(createSessionCookieHelpers(environment)).toEqual({ status: "invalid-config", fields: [] });
    const badSid = { toString() { throw new Error("fake-sid-secret"); } };
    expect(helpers().issue(badSid)).toEqual({ status: "invalid-sid" });
  });

  it("detects duplicates that the installed NextRequest cookie map collapses", () => {
    const header = `__Host-omts_web_sid=${sid}; __Host-omts_web_sid=${"B".repeat(42)}A`;
    const request = new NextRequest("https://web.example.test/account", { headers: { Cookie: header } });
    expect(request.cookies.getAll("__Host-omts_web_sid")).toHaveLength(1);
    expect(helpers().read(request.headers.get("cookie"))).toEqual({ status: "invalid-cookie" });
  });

  it("does not accept duplicate cookies supplied as multiple header fields", () => {
    const headers = new Headers();
    headers.append("cookie", `__Host-omts_web_sid=${sid}`);
    headers.append("cookie", `__Host-omts_web_sid=${sid}`);
    expect(helpers().read(headers.get("cookie"))).toEqual({ status: "invalid-cookie" });
  });

  it("has no response, fetch, cookie-store, expiry, revoke or message side effects", () => {
    const network = vi.spyOn(globalThis, "fetch");
    try {
      const response = new NextResponse();
      const cookies = helpers();
      expect(cookies.read(null)).toEqual({ status: "missing" });
      expect(cookies.read("__Host-omts_web_sid=bad")).toEqual({ status: "invalid-cookie" });
      cookies.issue(sid);
      cookies.clear();
      expect(response.headers.has("set-cookie")).toBe(false);
      expect(network).not.toHaveBeenCalled();
      expect(Object.keys(cookies).sort()).toEqual(["clear", "issue", "read"]);
    } finally { network.mockRestore(); }
  });
});
