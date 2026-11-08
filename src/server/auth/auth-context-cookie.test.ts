import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createAuthContextCookieHelpers } from "./auth-context-cookie";

const https = { NODE_ENV: "test", OMTS_WEB_ORIGIN: "https://web.example.test", OMTS_WEB_COOKIE_PROFILE: "https" };
const loopback = { NODE_ENV: "test", OMTS_WEB_ORIGIN: "http://127.0.0.1:3000", OMTS_WEB_COOKIE_PROFILE: "http-loopback-dev" };

describe("G1 auth context cookie preparation", () => {
  it.each([
    [https, "__Host-omts_web_auth_context", true],
    [loopback, "omts_web_auth_context_dev", false],
  ] as const)("issues a separate random context in the configured cookie profile", (environment, name, secure) => {
    const helper = createAuthContextCookieHelpers(environment);
    expect(helper.status).toBe("available");
    if (helper.status !== "available") throw new Error("Expected cookie helpers");
    const first = helper.cookies.createFresh();
    const second = helper.cookies.createFresh();
    expect(first.status).toBe("prepared");
    expect(second.status).toBe("prepared");
    if (first.status !== "prepared" || second.status !== "prepared") throw new Error("Expected cookies");
    expect(first.contextHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.contextHash).not.toBe(second.contextHash);
    const header = first.cookie.readForResponseHeader();
    expect(header).toMatch(new RegExp(`^${name}=[A-Za-z0-9_-]{43}; Path=/; HttpOnly`));
    expect(header.includes("; Secure")).toBe(secure);
    expect(header).toContain("; SameSite=Lax");
    expect(header).not.toContain("Domain=");
    expect(header).not.toContain("Max-Age=");
    expect(helper.cookies.read(header.split(";")[0])).toEqual({ status: "found", contextHash: first.contextHash });
    expect(() => JSON.stringify(first.cookie)).toThrow("AUTH_CONTEXT_COOKIE_NOT_SERIALIZABLE");
    expect(String(first.cookie)).not.toContain(first.contextHash);
  });

  it("refuses duplicate, malformed or foreign-profile context cookies", () => {
    const helper = createAuthContextCookieHelpers(https);
    const dev = createAuthContextCookieHelpers(loopback);
    if (helper.status !== "available" || dev.status !== "available") throw new Error("Expected cookies");
    const created = helper.cookies.createFresh();
    if (created.status !== "prepared") throw new Error("Expected cookie");
    const pair = created.cookie.readForResponseHeader().split(";")[0];
    expect(helper.cookies.read(`${pair}; ${pair}`)).toEqual({ status: "invalid-cookie" });
    expect(helper.cookies.read(`${pair}; other=value`)).toEqual({ status: "found", contextHash: created.contextHash });
    expect(helper.cookies.read(pair.replace("=", '="') + '"')).toEqual({ status: "invalid-cookie" });
    expect(helper.cookies.read("__Host-omts_web_auth_context=short")).toEqual({ status: "invalid-cookie" });
    expect(helper.cookies.read("__Host-omts_web_auth_context=%41")).toEqual({ status: "invalid-cookie" });
    expect(helper.cookies.read("__Host-omts_web_auth_context=x\r\nInjected: yes")).toEqual({ status: "invalid-cookie" });
    expect(dev.cookies.read(pair)).toEqual({ status: "missing" });
  });

  it("fails closed for invalid profile configuration", () => {
    expect(createAuthContextCookieHelpers({ ...https, OMTS_WEB_ORIGIN: "http://web.example.test" }).status)
      .toBe("invalid-config");
  });
});
