import { describe, expect, it } from "vitest";
import { backendPhotoUrl, resolvePhotoSource } from "./origin-photo-source";
import { parseOriginLanguage, parseQrToken } from "./origin-qr-token";

const ORIGIN = "https://api.omts.example";
const SIG = "a".repeat(64);
const KEY = "harvest-photos/2026/11/0123456789abcdef.jpg";
const local = (key = KEY, extra = "") => `/api/files/local/${key}?expires=1799999999&sig=${SIG}${extra}`;

describe("parseQrToken", () => {
  it("accepts exactly 22 base64url characters", () => {
    expect(parseQrToken("AbCdEfGhIjKlMnOpQr_-12")).toBe("AbCdEfGhIjKlMnOpQr_-12");
  });
  it.each([
    "", "short", "A".repeat(21), "A".repeat(23), "AbCdEfGhIjKlMnOpQr_-1=", "AbCdEfGhIjKlMnOpQr/-1", "..%2f..%2fetc%2fpasswd22",
    "AbCdEfGhIjKlMnOpQr_-1\n", "AbCdEfGhIjKlMnOpQr_-1 ", "AbCdEfGhIjKlMnOpQr?-1", "AbCdEfGhIjKlMnOpQr#-1", "http://evil.test/aaaaaaa",
    "ÁbCdEfGhIjKlMnOpQr_-12",
  ])("rejects %j", (value) => expect(parseQrToken(value)).toBeNull());
  it.each([undefined, null, 5, ["AbCdEfGhIjKlMnOpQr_-12"], {}])("rejects non-string %j", (value) => expect(parseQrToken(value)).toBeNull());
});

describe("parseOriginLanguage", () => {
  it("allows only vi or en", () => {
    expect(parseOriginLanguage("en")).toBe("en");
    expect(parseOriginLanguage("vi")).toBe("vi");
    for (const value of ["EN", "fr", "", undefined, ["en"], "en&x=1"]) expect(parseOriginLanguage(value)).toBe("vi");
  });
});

describe("resolvePhotoSource", () => {
  it("routes a relative local-storage link through the proxy without exposing the backend origin", () => {
    const src = resolvePhotoSource(local(), ORIGIN);
    expect(src).toBe(`/origin/photo?k=${encodeURIComponent(KEY)}&e=1799999999&s=${SIG}`);
    expect(src).not.toContain("api.omts.example");
  });
  it("routes an absolute same-origin backend link through the proxy", () => {
    expect(resolvePhotoSource(`${ORIGIN}${local()}`, ORIGIN)).toMatch(/^\/origin\/photo\?k=/u);
  });
  it("lets the browser load an external https storage link directly", () => {
    const sas = "https://acct.blob.core.windows.net/c/harvest/a.jpg?sv=1&sig=abc";
    expect(resolvePhotoSource(sas, ORIGIN)).toBe(sas);
  });
  it.each([
    "http://acct.blob.core.windows.net/c/a.jpg", "javascript:alert(1)", "data:image/png;base64,AAAA", "//evil.test/a.jpg",
    "https://user:pw@evil.test/a.jpg", "https://evil.test/a.jpg#x", "ftp://evil.test/a.jpg", "not a url", "",
    local("harvest-photos/../../etc/passwd"), local("../secret.jpg"), local("UPPER/2026/a.jpg"), local(KEY, "&x=1"),
    `/api/files/local/${KEY}?expires=abc&sig=${SIG}`, `/api/files/local/${KEY}?expires=1&sig=short`, "/api/other/file.jpg",
    `${ORIGIN}/api/other?x=1`, "http://api.omts.example/api/files/local/x/y.jpg?expires=1&sig=" + SIG,
  ])("drops %j", (raw) => expect(resolvePhotoSource(raw, ORIGIN)).toBeNull());
});

describe("backendPhotoUrl", () => {
  const params = (extra: Record<string, string> = {}) => new URLSearchParams({ k: KEY, e: "1799999999", s: SIG, ...extra });
  it("rebuilds a URL on the configured backend origin only", () => {
    const url = backendPhotoUrl(params(), ORIGIN);
    expect(url?.origin).toBe(ORIGIN);
    expect(url?.pathname).toBe(`/api/files/local/${KEY}`);
    expect(url?.search).toBe(`?expires=1799999999&sig=${SIG}`);
  });
  it.each([
    { k: "../etc/passwd" }, { k: "a/b/../../c.jpg" }, { k: "//evil.test/x.jpg" }, { k: "https://evil.test/x.jpg" }, { k: "a\\b/c.jpg" },
    { k: `${KEY}%00` }, { e: "-1" }, { e: "1e9" }, { s: "Z".repeat(64) }, { s: "a".repeat(63) }, { extra: "1" },
  ])("rejects %j", (override) => expect(backendPhotoUrl(params(override as unknown as Record<string, string>), ORIGIN)).toBeNull());
  it("rejects missing parameters", () => expect(backendPhotoUrl(new URLSearchParams(), ORIGIN)).toBeNull());
});
