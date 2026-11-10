import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { fetchProvenancePage } from "./origin-page-fetch";
import { fetchOriginPhoto } from "./origin-photo-proxy";

const TOKEN = "AbCdEfGhIjKlMnOpQr_-12";
const SIG = "b".repeat(64);
const env = { NODE_ENV: "test", OMTS_DATA_SOURCE: "api", OMTS_API_BASE_URL: "http://127.0.0.1:5280", OMTS_API_TIMEOUT_MS: "2000" };
const json = (body: unknown, status = 200, type = "application/json") => new Response(JSON.stringify(body), { status, headers: { "content-type": type } });

const coop = { fullName: "HTX Nuôi trồng Thủy sản Trung Nam", certifications: [] };
const published = {
  lotCode: "LOT-001", products: ["Hàu sữa"], originState: "Published", origin: {
    harvestDate: "2026-11-01", raftCode: "B-01", zoneName: "Vùng A", map: null, seedings: [{ seedingDate: "2026-02-01", seedItemName: "Hàu giống" }],
    daysOfFarming: 273, harvestPhotoUrls: [`/api/files/local/harvest/2026/11/a.jpg?expires=1799999999&sig=${SIG}`, "javascript:alert(1)"], raftPhotoUrls: [],
  },
};
const okBody = { language: "vi", status: "Ok", invoice: { code: "HD-1", date: "2026-11-02" }, cooperative: coop, lots: [published], extraInternalField: "x" };

describe("fetchProvenancePage", () => {
  it("never calls the backend for a malformed token", async () => {
    const fetcher = vi.fn();
    expect(await fetchProvenancePage("../admin", "vi", env, fetcher)).toEqual({ status: "invalid-token" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("calls the public endpoint safely and sanitises photos", async () => {
    const fetcher = vi.fn().mockResolvedValue(json(okBody));
    const result = await fetchProvenancePage(TOKEN, "en", env, fetcher);
    const [url, init] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(url.href).toBe(`http://127.0.0.1:5280/api/public/provenance/${TOKEN}?lang=en`);
    expect(init).toMatchObject({ method: "GET", redirect: "error", cache: "no-store", credentials: "omit" });
    expect(init.headers).toEqual({ Accept: "application/json" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.page.lots[0]?.origin?.harvestPhotoUrls).toEqual([expect.stringMatching(/^\/origin\/photo\?k=/u)]);
    expect(JSON.stringify(result.page)).not.toContain("127.0.0.1");
    expect(JSON.stringify(result.page)).not.toContain("extraInternalField");
  });

  it("falls back to Vietnamese for an unknown language", async () => {
    const fetcher = vi.fn().mockResolvedValue(json(okBody));
    await fetchProvenancePage(TOKEN, "fr", env, fetcher);
    expect((fetcher.mock.calls[0] as [URL])[0].searchParams.get("lang")).toBe("vi");
  });

  it("maps 404 to not-found with the backend message", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ status: 404, detail: "Không tìm thấy hóa đơn của mã QR này." }, 404, "application/problem+json"));
    expect(await fetchProvenancePage(TOKEN, "vi", env, fetcher)).toEqual({ status: "not-found", message: "Không tìm thấy hóa đơn của mã QR này." });
  });

  it("maps 404 without a readable body to not-found without message", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("<html>", { status: 404 }));
    expect(await fetchProvenancePage(TOKEN, "vi", env, fetcher)).toEqual({ status: "not-found", message: null });
  });

  it("maps 429 to rate-limited", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ status: 429 }, 429, "application/problem+json"));
    expect(await fetchProvenancePage(TOKEN, "vi", env, fetcher)).toEqual({ status: "rate-limited" });
  });

  it.each([
    ["500", () => json({}, 500)],
    ["non-json 200", () => new Response("<html>", { status: 200, headers: { "content-type": "text/html" } })],
    ["invalid json", () => new Response("{", { status: 200, headers: { "content-type": "application/json" } })],
    ["schema mismatch", () => json({ ...okBody, status: "Weird" })],
    ["unknown lot state", () => json({ ...okBody, lots: [{ ...published, originState: "NotPublished" }] })],
    ["oversized", () => new Response("x", { status: 200, headers: { "content-type": "application/json", "content-length": "9999999" } })],
    ["redirect", () => { throw new TypeError("redirect"); }],
  ])("maps %s to unavailable", async (_name, make) => {
    const fetcher = vi.fn().mockImplementation(async () => make());
    expect(await fetchProvenancePage(TOKEN, "vi", env, fetcher)).toEqual({ status: "unavailable" });
  });

  it("is unavailable on mock or invalid configuration without any request", async () => {
    const fetcher = vi.fn();
    expect(await fetchProvenancePage(TOKEN, "vi", { NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" }, fetcher)).toEqual({ status: "unavailable" });
    expect(await fetchProvenancePage(TOKEN, "vi", { NODE_ENV: "test" }, fetcher)).toEqual({ status: "unavailable" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("fetchOriginPhoto", () => {
  const query = () => new URLSearchParams({ k: "harvest/2026/11/a.jpg", e: "1799999999", s: SIG });
  const image = (type = "image/jpeg", status = 200) => new Response(new Uint8Array([1, 2, 3]), { status, headers: { "content-type": type } });

  it("returns an allowed image from the configured backend origin only", async () => {
    const fetcher = vi.fn().mockResolvedValue(image("image/webp; charset=binary"));
    const result = await fetchOriginPhoto(query(), env, fetcher);
    expect(result).toEqual({ status: "ok", body: new Uint8Array([1, 2, 3]), contentType: "image/webp" });
    const [url, init] = fetcher.mock.calls[0] as [URL, RequestInit];
    expect(url.origin).toBe("http://127.0.0.1:5280");
    expect(init).toMatchObject({ redirect: "error", credentials: "omit", cache: "no-store" });
  });

  it.each(["image/svg+xml", "text/html", "application/octet-stream", ""])("refuses content-type %j", async (type) => {
    const fetcher = vi.fn().mockResolvedValue(image(type));
    expect(await fetchOriginPhoto(query(), env, fetcher)).toEqual({ status: "unavailable" });
  });

  it("refuses an oversized image", async () => {
    const big = new Response("x", { status: 200, headers: { "content-type": "image/png", "content-length": String(50 * 1_048_576) } });
    expect(await fetchOriginPhoto(query(), env, vi.fn().mockResolvedValue(big))).toEqual({ status: "unavailable" });
  });

  it("maps expired or unknown links to not-found and forged parameters to bad-request without a request", async () => {
    expect(await fetchOriginPhoto(query(), env, vi.fn().mockResolvedValue(image("image/png", 403)))).toEqual({ status: "not-found" });
    const fetcher = vi.fn();
    expect(await fetchOriginPhoto(new URLSearchParams({ k: "../../x", e: "1", s: SIG }), env, fetcher)).toEqual({ status: "bad-request" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("maps a network failure to unavailable", async () => {
    expect(await fetchOriginPhoto(query(), env, vi.fn().mockRejectedValue(new Error("boom")))).toEqual({ status: "unavailable" });
  });
});
