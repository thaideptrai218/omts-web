import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseServerWebSessionConfig } from "./web-session-config";

const secure = { NODE_ENV: "production", OMTS_WEB_ORIGIN: "https://web.example.test", OMTS_WEB_COOKIE_PROFILE: "https" };
const local = { NODE_ENV: "development", OMTS_WEB_ORIGIN: "http://localhost:3000", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" };

describe("server Web origin and approved C1A cookie profiles, no runtime wiring", () => {
  it("returns fixed HTTPS cookie policy with no SID/domain/persistence knobs", () => {
    const result = parseServerWebSessionConfig(secure);
    expect(result).toEqual({ status: "valid", config: {
      origin: "https://web.example.test", cookieProfile: "https",
      cookie: { name: "__Host-omts_web_sid", httpOnly: true, secure: true, sameSite: "lax", path: "/" },
    } });
    if (result.status !== "valid") return;
    expect(Object.keys(result.config.cookie).sort()).toEqual(["httpOnly", "name", "path", "sameSite", "secure"]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.config)).toBe(true);
    expect(Object.isFrozen(result.config.cookie)).toBe(true);
  });
  it.each(["development", "test", "production"])("keeps Secure even in %s when HTTPS is explicitly selected", (NODE_ENV) => {
    expect(parseServerWebSessionConfig({ ...secure, NODE_ENV })).toMatchObject({ status: "valid", config: { cookie: { secure: true } } });
  });
  it.each(["http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000", "HTTP://LOCALHOST:3000/"])(
    "permits explicit loopback dev origin %s", (OMTS_WEB_ORIGIN) => {
      const result = parseServerWebSessionConfig({ ...local, OMTS_WEB_ORIGIN });
      expect(result).toEqual({ status: "valid", config: {
        origin: new URL(OMTS_WEB_ORIGIN).origin, cookieProfile: "http-loopback-dev",
        cookie: { name: "omts_web_sid_dev", httpOnly: true, secure: false, sameSite: "lax", path: "/" },
      } });
    },
  );
  it("permits the same loopback exception in explicit tests only, not production", () => {
    expect(parseServerWebSessionConfig({ ...local, NODE_ENV: "test" }).status).toBe("valid");
    expect(parseServerWebSessionConfig({ ...local, NODE_ENV: "production" }))
      .toEqual({ status: "invalid-config", fields: ["OMTS_WEB_COOKIE_PROFILE"] });
  });
  it.each(["https://WEB.example.test:443/", "https://web.example.test/", "https://web.example.test:443"])(
    "normalizes an equivalent configured origin %s", (OMTS_WEB_ORIGIN) => {
      expect(parseServerWebSessionConfig({ ...secure, OMTS_WEB_ORIGIN }))
        .toMatchObject({ status: "valid", config: { origin: "https://web.example.test" } });
    },
  );
  it("preserves non-default ports and never swaps in the backend origin", () => {
    expect(parseServerWebSessionConfig({ ...secure, OMTS_WEB_ORIGIN: "https://web.example.test:8443", OMTS_API_BASE_URL: "https://api.example.test" }))
      .toMatchObject({ status: "valid", config: { origin: "https://web.example.test:8443" } });
  });
  it.each(["OMTS_WEB_ORIGIN", "OMTS_WEB_COOKIE_PROFILE", "NODE_ENV"])("requires %s with no implicit defaults", (field) => {
    expect(parseServerWebSessionConfig({ ...secure, [field]: undefined }))
      .toEqual({ status: "invalid-config", fields: [field] });
  });
  it.each(["auto", "https ", "HTTPS", "production", "development", false, ""])("rejects an unknown profile case %#", (profile) => {
    expect(parseServerWebSessionConfig({ ...secure, OMTS_WEB_COOKIE_PROFILE: profile }))
      .toEqual({ status: "invalid-config", fields: ["OMTS_WEB_COOKIE_PROFILE"] });
  });
  it.each(["staging", "preview", "", undefined])("requires a valid NODE_ENV case %#", (NODE_ENV) => {
    expect(parseServerWebSessionConfig({ ...secure, NODE_ENV }))
      .toEqual({ status: "invalid-config", fields: ["NODE_ENV"] });
  });
  it.each([
    "https://web.example.test,evil.test", "https://web.example.test;evil.test",
    "https://*.example.test", "https://web.*.test",
  ])("rejects authority separators/wildcards even when native URL accepts them case %#", (OMTS_WEB_ORIGIN) => {
    expect(parseServerWebSessionConfig({ ...secure, OMTS_WEB_ORIGIN }))
      .toEqual({ status: "invalid-config", fields: ["OMTS_WEB_ORIGIN"] });
  });
  it.each([
    "", " https://web.example.test", "https://web.example.test\n", "https://web.example.test\r\n",
    "//web.example.test", "ftp://web.example.test", "javascript:alert(1)", "null",
    "https://user:FAKE_ONLY@web.example.test", "https://@web.example.test", "https://web.example.test@evil.test",
    "https://web.example.test/path", "https://web.example.test/..", "https://web.example.test/%2e",
    "https://web.example.test?token=FAKE_ONLY", "https://web.example.test#FAKE_ONLY",
    "https://%77eb.example.test", "https://web.example.test\\evil", "https://web.example.test:0",
    "https://web.example.test:", "https://web.example.test:65536", "https://web.example.test:abc",
    "https://web.example.test,https://evil.test", "https://[::1", "https://",
  ])("rejects unsafe/malformed Web origin case %# without leaking its value", (OMTS_WEB_ORIGIN) => {
    const result = parseServerWebSessionConfig({ ...secure, OMTS_WEB_ORIGIN });
    expect(result).toEqual({ status: "invalid-config", fields: ["OMTS_WEB_ORIGIN"] });
    expect(JSON.stringify(result)).not.toContain(OMTS_WEB_ORIGIN || "FAKE_ONLY");
  });
  it.each([
    "http://localhost.evil.test:3000", "http://web.example.test", "http://192.168.1.2:3000", "http://0.0.0.0:3000",
    "http://127.1:3000", "http://2130706433:3000", "http://0x7f000001:3000", "http://127.000.000.001:3000",
    "http://localhost.:3000", "http://[::ffff:127.0.0.1]:3000", "https://localhost:3000",
  ])("does not broaden the explicit loopback HTTP exception case %#", (OMTS_WEB_ORIGIN) => {
    expect(parseServerWebSessionConfig({ ...local, OMTS_WEB_ORIGIN }))
      .toEqual({ status: "invalid-config", fields: ["OMTS_WEB_ORIGIN"] });
  });
  it("does not downgrade the HTTPS profile just because the environment is development", () => {
    expect(parseServerWebSessionConfig({ ...local, OMTS_WEB_COOKIE_PROFILE: "https" }))
      .toEqual({ status: "invalid-config", fields: ["OMTS_WEB_ORIGIN"] });
  });
  it.each(["NEXT_PUBLIC_OMTS_WEB_ORIGIN", "NEXT_PUBLIC_OMTS_WEB_COOKIE_PROFILE"])("rejects public policy alias %s", (field) => {
    expect(parseServerWebSessionConfig({ ...secure, [field]: "FAKE_ONLY" }))
      .toEqual({ status: "invalid-config", fields: [field] });
  });
  it("does not infer missing policy from request/proxy/deployment/API inputs", () => {
    const result = parseServerWebSessionConfig({ NODE_ENV: "production", HOST: "web.example.test", PORT: "443",
      "X-Forwarded-Host": "web.example.test", "X-Forwarded-Proto": "https", VERCEL_URL: "web.example.test",
      OMTS_API_BASE_URL: "https://api.example.test", NEXT_PUBLIC_APP_URL: "https://web.example.test" });
    expect(result.status).toBe("invalid-config");
    if (result.status !== "invalid-config") return;
    expect(result.fields).toEqual(["OMTS_WEB_ORIGIN", "OMTS_WEB_COOKIE_PROFILE"]);
  });
  it("cannot override fixed cookie flags/scope/persistence using extra environment fields", () => {
    expect(parseServerWebSessionConfig({ ...secure, cookie: { secure: false, sameSite: "none", domain: ".example.test", maxAge: 999999 },
      OMTS_WEB_COOKIE_SECURE: "false", OMTS_WEB_COOKIE_DOMAIN: ".example.test", OMTS_WEB_COOKIE_MAX_AGE: "999999" }))
      .toEqual(parseServerWebSessionConfig(secure));
  });
  it("snapshots inputs and does not read unknown secret/header getters", () => {
    const env = { ...secure, get PRIVATE_KEY() { throw new Error("FAKE_ONLY"); } };
    const result = parseServerWebSessionConfig(env);
    env.OMTS_WEB_ORIGIN = "https://changed.test";
    expect(result).toMatchObject({ status: "valid", config: { origin: "https://web.example.test" } });
  });
  it("redacts validation/throwing input failures and freezes their field list", () => {
    const result = parseServerWebSessionConfig({ ...secure, get OMTS_WEB_ORIGIN() { throw new Error("FAKE_ONLY"); } });
    expect(result).toEqual({ status: "invalid-config", fields: [] });
    expect(Object.isFrozen(result)).toBe(true);
    if (result.status === "invalid-config") expect(Object.isFrozen(result.fields)).toBe(true);
  });
  it("performs no networking and does not use source flags to infer configuration", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected I/O"));
    try {
      expect(parseServerWebSessionConfig({ ...local, OMTS_DATA_SOURCE: "mock" }).status).toBe("valid");
      expect(parseServerWebSessionConfig({ NODE_ENV: "test" }).status).toBe("invalid-config");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally { fetchSpy.mockRestore(); }
  });
});
