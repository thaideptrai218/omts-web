import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { cooperativeFixture } from "@/features/cooperative-api/fixtures";
import { cooperativeValues } from "@/features/cooperative-api/contracts";
import { handleCooperativeRequest, cooperativeLogoPath } from "./cooperative-http";
const base = "http://localhost:3002/api/cooperative/profile";
function configure() {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000"); vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved());
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
function write(body: unknown, origin = "http://localhost:3002") { return new Request(base, { method: "PUT", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) }); }
const logoPath = "/api/public/cooperative/logos/2026/10/" + "a".repeat(32) + ".webp";
describe("cooperative API boundaries", () => {
  it.each(["Staff", "Trader", "SystemAdministrator"] as const)("denies %s before reading private data or forwarding writes", async (subjectType) => {
    configure(); const owner = resolved(); gateway.resolve.mockResolvedValue(resolved({ identity: { ...owner.session.identity, subjectType } })); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCooperativeRequest(new Request(base))).status).toBe(403); expect((await handleCooperativeRequest(write(cooperativeValues(cooperativeFixture())))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("denies anonymous and onboarding requests", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce({ status: "missing" }).mockResolvedValueOnce(resolved({ phase: "contact-verification-required" }));
    expect((await handleCooperativeRequest(new Request(base))).status).toBe(401); expect((await handleCooperativeRequest(new Request(base))).status).toBe(403);
  });
  it("accepts nullable preliminary fields and strips unrelated response fields", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...cooperativeFixture(), taxCode: null, officeAddress: null, phoneNumber: null, legalRepresentative: null, status: "Preliminary", accessToken: "never-return", publicPreview: { bank: "never-return" } }));
    const response = await handleCooperativeRequest(new Request(base)); expect(response.status).toBe(200); const text = await response.text(); expect(text).toContain('"taxCode":null'); expect(text).not.toContain("never-return");
  });
  it("unwraps the backend save envelope and retains only the profile", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ profile: { ...cooperativeFixture(), logoUrl: logoPath }, message: "private raw", credential: "never-return" }));
    const response = await handleCooperativeRequest(write(cooperativeValues(cooperativeFixture()))); expect(response.status).toBe(200); const result = await response.json(); expect(result.data.logoUrl).toBe("/api/cooperative/profile/logo?version=AQID"); expect(JSON.stringify(result)).not.toContain("private raw"); expect(JSON.stringify(result)).not.toContain(logoPath); expect(fetcher.mock.calls[0][1]?.method).toBe("PUT");
  });
  it.each([{ bankId: "unapproved" }, { status: "Completed" }, { target: "https://evil.test" }, { businessLines: [] }, { rowVersion: "" }, { phoneNumber: "bad" }])("rejects invalid fields and contract bypass %j", async (patch) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleCooperativeRequest(write({ ...cooperativeValues(cooperativeFixture()), ...patch }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks CSRF before consuming the request body", async () => {
    configure(); const request = write(cooperativeValues(cooperativeFixture()), "https://evil.test"), reader = vi.spyOn(request.body!, "getReader"), fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCooperativeRequest(request)).status).toBe(403); expect(reader).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("suppresses profile data and backend errors after a session switch", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" })); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...cooperativeFixture(), private: "never-return" }));
    const response = await handleCooperativeRequest(new Request(base)); expect(response.status).toBe(401); expect(await response.text()).not.toContain(cooperativeFixture().fullName);
  });
  it("passes only a whitelisted conflict code", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG06", detail: "private raw", params: { password: "never-return" } }, { status: 409 }));
    const response = await handleCooperativeRequest(write(cooperativeValues(cooperativeFixture()))); expect(response.status).toBe(409); expect(await response.json()).toEqual({ status: "rejected", code: "MSG06" });
  });
});
describe("cooperative logo isolation", () => {
  it.each(["https://evil.test/a.png", "//evil.test/a.png", "/api/files/local/private.png", logoPath + "?target=evil", "/api/public/cooperative/logos/2026/10/../secret.png"])("refuses a target outside public logo storage: %s", (path) => expect(cooperativeLogoPath(path)).toBeUndefined());
  it("allows a bounded image without forwarding a bearer to the public storage endpoint", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...cooperativeFixture(), logoUrl: logoPath })).mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/webp" } }));
    const response = await handleCooperativeRequest(new Request(base + "/logo?version=AQID"), true); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store"); expect(response.headers.get("content-type")).toBe("image/webp"); expect(fetcher.mock.calls[1][1]?.headers).toBeUndefined();
  });
  it("rejects stale image versions without fetching a file", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...cooperativeFixture(), logoUrl: logoPath }));
    expect((await handleCooperativeRequest(new Request(base + "/logo?version=stale"), true)).status).toBe(404); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rechecks the session after reading image bytes", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" }));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...cooperativeFixture(), logoUrl: logoPath })).mockResolvedValueOnce(new Response("private-image", { headers: { "Content-Type": "image/png" } }));
    const response = await handleCooperativeRequest(new Request(base + "/logo"), true); expect(response.status).toBe(401); expect(await response.text()).not.toContain("private-image");
  });
  it.each([0, 2 * 1024 * 1024 + 1])("rejects a %i-byte upload before forwarding", async (size) => {
    configure(); const form = new FormData(); form.set("file", new File([new Uint8Array(size)], "logo.png", { type: "image/png" })); const fetcher = vi.spyOn(globalThis, "fetch");
    const response = await handleCooperativeRequest(new Request(base + "/logo", { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web" }, body: form }), true); expect(response.status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("uploads one WebP with fixed multipart field file and strips raw URL", async () => {
    configure(); const form = new FormData(); form.set("file", new File(["webp"], "logo.webp", { type: "image/webp" })); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...cooperativeFixture(), logoUrl: logoPath }));
    const response = await handleCooperativeRequest(new Request(base + "/logo", { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web" }, body: form }), true); expect(response.status).toBe(200); expect(fetcher.mock.calls[0][1]?.body).toBeInstanceOf(FormData); expect(await response.text()).not.toContain(logoPath);
  });
  it("rejects extra multipart fields", async () => {
    configure(); const form = new FormData(); form.set("file", new File(["png"], "logo.png", { type: "image/png" })); form.set("target", "evil"); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCooperativeRequest(new Request(base + "/logo", { method: "POST", headers: { Origin: "http://localhost:3002", "X-OMTS-Request": "web" }, body: form }), true)).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
});
