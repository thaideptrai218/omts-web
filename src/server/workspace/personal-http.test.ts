import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { personalFixture } from "@/features/personal-api/fixtures";
import { handlePersonalRequest } from "./personal-http";
function configure(subjectType: "CooperativeOwner" | "Staff" | "Trader" = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000"); vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } }));
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
function request(body?: unknown, origin = "http://localhost:3002") { return new Request("http://localhost:3002/api/account/profile", { method: body ? "PUT" : "GET", ...(body ? { headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) }); }
const patch = () => ({ displayName: "Hợp lệ", rowVersion: "AQID" });
describe("personal API identity and input boundaries", () => {
  it("refuses anonymous requests and relays the API refusal of an onboarding account", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce({ status: "anonymous" }); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handlePersonalRequest(request())).status).toBe(401); expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValueOnce(Response.json({ code: "MSG-ACCOUNT-04" }, { status: 403 })); expect((await handlePersonalRequest(request())).status).toBe(403);
  });
  it.each(["CooperativeOwner", "Staff", "Trader"] as const)("allows the actual %s personal profile and strips unknown fields", async (subjectType) => {
    configure(subjectType); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...personalFixture(), subjectType, passwordHash: "never-return" })); const response = await handlePersonalRequest(request()); expect(response.status).toBe(200); expect(await response.text()).not.toContain("never-return");
  });
  it("rejects an account or subject mismatch in the profile", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...personalFixture(), accountId: crypto.randomUUID() })).mockResolvedValueOnce(Response.json({ ...personalFixture(), subjectType: "Trader" }));
    expect((await handlePersonalRequest(request())).status).toBe(502); expect((await handlePersonalRequest(request())).status).toBe(502);
  });
  it.each([{ username: "new" }, { email: "new@example.test" }, { phoneNumber: "0912345678" }, { displayName: " ".repeat(4) }, { displayName: "a".repeat(201) }, { rowVersion: "" }])("refuses profile bypass or invalid fields %j", async (change) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handlePersonalRequest(request({ displayName: "Hợp lệ", rowVersion: "AQID", ...change }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("unwraps the saved profile without returning raw messages", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ profile: { ...personalFixture(), rowVersion: "new" }, message: "never-return" }));
    const response = await handlePersonalRequest(request({ displayName: "Hợp lệ", rowVersion: "AQID" })); expect(response.status).toBe(200); const data = await response.json(); expect(data.data.rowVersion).toBe("new"); expect(JSON.stringify(data)).not.toContain("never-return"); expect(fetcher.mock.calls[0][1]?.method).toBe("PUT");
  });
  it("rejects foreign origin before reading JSON", async () => {
    configure(); const input = request(patch(), "https://evil.test"), reader = vi.spyOn(input.body!, "getReader"), fetcher = vi.spyOn(globalThis, "fetch"); expect((await handlePersonalRequest(input)).status).toBe(403); expect(reader).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("projects only the approved code after a profile conflict", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG06", detail: "never-return", params: { person: "private" } }, { status: 409 }));
    expect(await (await handlePersonalRequest(request({ displayName: "Hợp lệ", rowVersion: "AQID" }))).json()).toEqual({ status: "rejected", code: "MSG06" });
  });
});
