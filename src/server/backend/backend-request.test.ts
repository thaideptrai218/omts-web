import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { MAX_REQUEST_BYTES, prepareBackendRequest } from "./backend-request";

const login = { endpoint: "login", body: { identifier: "qa", password: "  fake-pass1  ", clientType: "Web" } };

describe("server request preparation", () => {
  it("snapshots JSON without trimming passwords or carrying browser credentials", () => {
    const input = structuredClone(login);
    const result = prepareBackendRequest(input);
    input.body.password = "changed";
    expect(result?.body).toBe(JSON.stringify(login.body));
    expect(result?.headers).toEqual({ Accept: "application/json", "Content-Type": "application/json" });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.headers)).toBe(true);
  });
  it.each(["identity", "permissions", "profileRead", "logout"])("requires explicit bearer for %s", (endpoint) => {
    expect(prepareBackendRequest({ endpoint })).toBeUndefined();
    expect(prepareBackendRequest({ endpoint, accessToken: "fake.jwt-A_B~+/==" })?.headers)
      .toEqual({ Accept: "application/json", Authorization: "Bearer fake.jwt-A_B~+/==" });
  });
  it("permits a protected JSON update, not a GET/logout body or login token", () => {
    expect(prepareBackendRequest({ endpoint: "profileUpdate", accessToken: "fake", body: { displayName: "Hải" } })?.body)
      .toBe('{"displayName":"Hải"}');
    expect(prepareBackendRequest({ endpoint: "profileRead", accessToken: "fake", body: {} })).toBeUndefined();
    expect(prepareBackendRequest({ endpoint: "logout", accessToken: "fake", body: {} })).toBeUndefined();
    expect(prepareBackendRequest({ ...login, accessToken: "fake" })).toBeUndefined();
  });
  it.each(["headers", "method", "url", "redirect", "credentials", "cache", "next", "dispatcher", "signal"])(
    "rejects extra transport override %s", (key) => {
      expect(prepareBackendRequest({ ...login, [key]: "untrusted" })).toBeUndefined();
    },
  );
  it.each(["", " fake", "fake ", "fake\n", "fake\r", "fake\r\n", "fake\r\nCookie: injected", "fake\tvalue", "Bearer fake", "t".repeat(16_385)])(
    "rejects invalid bearer case %#", (accessToken) => {
      expect(prepareBackendRequest({ endpoint: "identity", accessToken })).toBeUndefined();
    },
  );
  it.each(["refresh", "https://evil.test", "constructor", "__proto__"])("rejects endpoint %s", (endpoint) => {
    expect(prepareBackendRequest({ endpoint, accessToken: "fake" })).toBeUndefined();
  });
  it("bounds actual UTF-8 request bytes", () => {
    expect(prepareBackendRequest({ ...login, body: { value: "x".repeat(MAX_REQUEST_BYTES - 12) } })).toBeDefined();
    expect(prepareBackendRequest({ ...login, body: { value: "ắ".repeat(MAX_REQUEST_BYTES / 2) } })).toBeUndefined();
  });
  it.each([undefined, BigInt(1), NaN, () => "secret", new Date()])("rejects non-JSON body field case %#", (value) => {
    expect(prepareBackendRequest({ ...login, body: { value } })).toBeUndefined();
  });
  it("redacts cyclic and throwing inputs", () => {
    const body: Record<string, unknown> = {};
    body.self = body;
    expect(prepareBackendRequest({ ...login, body })).toBeUndefined();
    expect(prepareBackendRequest({ get endpoint() { throw new Error("fake-password"); } })).toBeUndefined();
  });
});
