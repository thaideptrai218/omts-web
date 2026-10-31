import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { notificationFixture, personalFixture } from "@/features/personal-api/fixtures";
import { handlePersonalRequest } from "./personal-http";
function configure(subjectType: "CooperativeOwner" | "Staff" | "Trader" = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000"); vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } }));
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
function request(body?: unknown, origin = "http://localhost:3002") { return new Request("http://localhost:3002/api/account/profile", { method: body ? "PUT" : "GET", ...(body ? { headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) }); }
const patch = () => ({ items: [{ category: "WORK", channel: "Email", enabled: true }] });
describe("personal API identity and input boundaries", () => {
  it.each(["profile", "notifications"] as const)("refuses anonymous and onboarding %s requests", async (area) => {
    configure(); gateway.resolve.mockResolvedValueOnce({ status: "anonymous" }).mockResolvedValueOnce(resolved({ phase: "contact-verification-required" })); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handlePersonalRequest(request(), area)).status).toBe(401); expect((await handlePersonalRequest(request(), area)).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["CooperativeOwner", "Staff", "Trader"] as const)("allows the actual %s personal profile and strips unknown fields", async (subjectType) => {
    configure(subjectType); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...personalFixture(), subjectType, passwordHash: "never-return" })); const response = await handlePersonalRequest(request(), "profile"); expect(response.status).toBe(200); expect(await response.text()).not.toContain("never-return");
  });
  it("rejects an account or subject mismatch in the profile", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...personalFixture(), accountId: crypto.randomUUID() })).mockResolvedValueOnce(Response.json({ ...personalFixture(), subjectType: "Trader" }));
    expect((await handlePersonalRequest(request(), "profile")).status).toBe(502); expect((await handlePersonalRequest(request(), "profile")).status).toBe(502);
  });
  it.each([{ username: "new" }, { email: "new@example.test" }, { phoneNumber: "0912345678" }, { displayName: " ".repeat(4) }, { displayName: "a".repeat(201) }, { rowVersion: "" }])("refuses profile bypass or invalid fields %j", async (change) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handlePersonalRequest(request({ displayName: "Hợp lệ", rowVersion: "AQID", ...change }), "profile")).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("unwraps the saved profile without returning raw messages", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ profile: { ...personalFixture(), rowVersion: "new" }, message: "never-return" }));
    const response = await handlePersonalRequest(request({ displayName: "Hợp lệ", rowVersion: "AQID" }), "profile"); expect(response.status).toBe(200); const data = await response.json(); expect(data.data.rowVersion).toBe("new"); expect(JSON.stringify(data)).not.toContain("never-return"); expect(fetcher.mock.calls[0][1]?.method).toBe("PUT");
  });
  it("rejects foreign origin before reading JSON", async () => {
    configure(); const input = request(patch(), "https://evil.test"), reader = vi.spyOn(input.body!, "getReader"), fetcher = vi.spyOn(globalThis, "fetch"); expect((await handlePersonalRequest(input, "notifications")).status).toBe(403); expect(reader).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("projects only the approved code after a profile conflict", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG06", detail: "never-return", params: { person: "private" } }, { status: 409 }));
    expect(await (await handlePersonalRequest(request({ displayName: "Hợp lệ", rowVersion: "AQID" }), "profile")).json()).toEqual({ status: "rejected", code: "MSG06" });
  });
});
describe("notification catalog, channel policy and races", () => {
  it("uses the backend Staff catalog including Orders without a mock fallback", async () => {
    configure("Staff"); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(notificationFixture())); const response = await handlePersonalRequest(request(), "notifications"); expect(response.status).toBe(200); expect((await response.json()).data.map((row: { category: string }) => row.category)).toContain("ORDERS");
  });
  it.each([{ items: [{ category: "WORK", channel: "Push", enabled: false }] }, { ...patch(), accountId: crypto.randomUUID() }, { items: [...patch().items, ...patch().items] }, { items: [] }, { items: [{ category: "UNKNOWN", channel: "Email", enabled: true }] }])("refuses Push, target injection, duplicate cells and unsupported patches %j", async (body) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handlePersonalRequest(request(body), "notifications")).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("reads fresh eligibility before writing and denies an ineligible channel", async () => {
    configure(); const catalog = notificationFixture(); catalog[1].channels[2] = { channel: "Email", enabled: false, eligible: false, ineligibleReason: "EMAIL_NOT_VERIFIED" }; const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(catalog));
    const response = await handlePersonalRequest(request(patch()), "notifications"); expect(response.status).toBe(400); expect((await response.json()).code).toBe("MSG21"); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("keeps mandatory InApp enabled server-side even with forged client JSON", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(notificationFixture())); const response = await handlePersonalRequest(request({ items: [{ category: "ORDERS", channel: "InApp", enabled: false }] }), "notifications"); expect(response.status).toBe(400); expect((await response.json()).code).toBe("MSG23"); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("writes only the requested editable patch and returns a projected saved catalog", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(notificationFixture())).mockResolvedValueOnce(Response.json({ categories: notificationFixture(), message: "never-return", notice: null }));
    const response = await handlePersonalRequest(request(patch()), "notifications"); expect(response.status).toBe(200); expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual(patch()); expect(await response.text()).not.toContain("never-return");
  });
  it("uses the legacy notice field contract without parsing or returning arbitrary prose", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(notificationFixture())).mockResolvedValueOnce(Response.json({ categories: notificationFixture(), notice: "private arbitrary warning" })); const response = await handlePersonalRequest(request(patch()), "notifications"); expect(response.status).toBe(200); const result = await response.json(); expect(result.data.noticeCode).toBe("MSG-ACCOUNT-21"); expect(JSON.stringify(result)).not.toContain("arbitrary");
  });
  it("accepts PR19 messageCode/noticeCode and refuses an unknown notice code", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(notificationFixture())).mockResolvedValueOnce(Response.json({ categories: notificationFixture(), message: "Saved", messageCode: "MSG-GEN-05", notice: "Your preferences are saved. This device does not allow notifications.", noticeCode: "MSG-ACCOUNT-21" }))
      .mockResolvedValueOnce(Response.json(notificationFixture())).mockResolvedValueOnce(Response.json({ categories: notificationFixture(), notice: "Unknown warning", noticeCode: "UNKNOWN" }));
    let response = await handlePersonalRequest(request(patch()), "notifications"); expect(response.status).toBe(200); expect((await response.json()).data.notice).toContain("Thiết lập thông báo đã được lưu"); response = await handlePersonalRequest(request(patch()), "notifications"); expect(response.status).toBe(502);
  });
  it("denies a write if the session changes during the eligibility read", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "new" })); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(notificationFixture())); expect((await handlePersonalRequest(request(patch()), "notifications")).status).toBe(401); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("suppresses a completed write response after a session replacement", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "new" })); vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(notificationFixture())).mockResolvedValueOnce(Response.json({ categories: notificationFixture(), notice: null })); const response = await handlePersonalRequest(request(patch()), "notifications"); expect(response.status).toBe(401); expect(await response.text()).not.toContain("ORDERS");
  });
  it("refuses malformed catalog with duplicate channels instead of inventing eligible cells", async () => {
    configure(); const catalog = notificationFixture(); catalog[0].channels[1] = catalog[0].channels[0]; const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(catalog)); expect((await handlePersonalRequest(request(patch()), "notifications")).status).toBe(502); expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
