import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { handleAccountGrantsRequest, handleOwnerAccessRead } from "./account-grants-http";
import { handleAccountGrantRevoke } from "./account-grant-revoke-http";
const accountId = "122bb318-a72e-49aa-a8d7-a6169f889007", request = (query = `accountId=${accountId}`) => new Request(`http://localhost:3002/api/account-grants?${query}`);
const grant = () => ({ id: crypto.randomUUID(), roleId: crypto.randomUUID(), roleName: "Kế toán", zoneId: null, zoneName: null, allZones: true, effectiveFrom: "2026-01-01", effectiveTo: null, state: "Effective", revokedAt: null, revokeReason: null });
beforeEach(() => {
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000"); gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved());
});
const revokeInput = () => ({ accountId, grantId: accountId, reason: "  Đổi phân công  ", confirmed: true });
const revokeRequest = (body: unknown = revokeInput(), origin = "http://localhost:3002") => new Request("http://localhost:3002/api/account-grants/revoke", { method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("revoke an existing grant", () => {
  it.each(["Staff", "Trader", "SystemAdministrator"] as const)("refuses %s before a permission change", async (subjectType) => { gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } })); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleAccountGrantRevoke(revokeRequest())).status).toBe(403); expect(fetcher).not.toHaveBeenCalled(); });
  it.each([{ reason: " " }, { reason: "a".repeat(1001) }, { confirmed: false }, { grantId: "invalid" }, { password: "forbidden" }])("requires strict fields and confirmation %j", async (patch) => { const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleAccountGrantRevoke(revokeRequest({ ...revokeInput(), ...patch }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled(); });
  it("checks CSRF before consuming JSON", async () => { const req = revokeRequest(revokeInput(), "https://evil.test"), reader = vi.spyOn(req.body!, "getReader"), fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleAccountGrantRevoke(req)).status).toBe(403); expect(reader).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled(); });
  it("forwards only a trimmed reason to a fixed path and projects the revoked row", async () => { const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...grant(), id: accountId, state: "Revoked", password: "never-return" })); const response = await handleAccountGrantRevoke(revokeRequest()); expect(response.status).toBe(200); expect(await response.text()).not.toContain("never-return"); expect(String(fetcher.mock.calls[0][0])).toBe(`http://127.0.0.1:8080/api/accounts/${accountId}/grants/${accountId}/revoke`); expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ reason: "Đổi phân công" }); });
  it("rejects a mismatched or non-revoked success response", async () => { vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...grant(), state: "Revoked" })).mockResolvedValueOnce(Response.json({ ...grant(), id: accountId, state: "Effective" })); expect((await handleAccountGrantRevoke(revokeRequest())).status).toBe(502); expect((await handleAccountGrantRevoke(revokeRequest())).status).toBe(502); });
  it("suppresses a committed response after the session changes", async () => { gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "new" })); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...grant(), id: accountId, state: "Revoked" })); const response = await handleAccountGrantRevoke(revokeRequest()); expect(response.status).toBe(401); expect(await response.text()).not.toContain("Kế toán"); });
});
describe("read-only role catalog and impact", () => {
  it.each(["functions", "impact"] as const)("protects %s with the same Owner boundary", async (area) => {
    gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType: "Staff" } })); const fetcher = vi.spyOn(globalThis, "fetch");
    const input = area === "impact" ? request(`roleId=${accountId}`) : request(""); expect((await handleOwnerAccessRead(input, area)).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects a forged catalog target and an account ID used in place of a role ID", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleOwnerAccessRead(request("target=https://evil.test"), "functions")).status).toBe(400); expect((await handleOwnerAccessRead(request(), "impact")).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("projects catalog and role use counts without raw confirmation copy", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json([{ code: "WATER_MEASUREMENTS", name: "Water", cooperativeWide: false, isDashboardTile: false, supportedActions: ["View", "Export"], private: "never-return" }]))
      .mockResolvedValueOnce(Response.json({ accountCount: 2, zoneCount: 1, allZonesGranted: false, accounts: ["staff1", "staff2"], confirmMessage: "never-return" }));
    let response = await handleOwnerAccessRead(request(""), "functions"); expect(response.status).toBe(200); expect(await response.text()).not.toContain("never-return");
    response = await handleOwnerAccessRead(request(`roleId=${accountId}`), "impact"); expect(response.status).toBe(200); expect(await response.text()).not.toContain("never-return"); expect(String(fetcher.mock.calls[1][0])).toBe(`http://127.0.0.1:8080/api/roles/${accountId}/impact`);
  });
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
describe("account grant history boundaries", () => {
  it.each(["Staff", "Trader", "SystemAdministrator"] as const)("denies %s private account grants before upstream", async (subjectType) => {
    gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } })); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleAccountGrantsRequest(request())).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("denies an anonymous or onboarding session", async () => {
    gateway.resolve.mockResolvedValueOnce({ status: "anonymous" }).mockResolvedValueOnce(resolved({ phase: "contact-verification-required" })); expect((await handleAccountGrantsRequest(request())).status).toBe(401); expect((await handleAccountGrantsRequest(request())).status).toBe(403);
  });
  it.each(["accountId=bad", `accountId=${accountId}&accountId=${accountId}`, `accountId=${accountId}&target=https://evil.test`])("rejects malformed/forged targets %s", async (query) => { const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleAccountGrantsRequest(request(query))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled(); });
  it("projects only history fields from a fixed Owner-only endpoint", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ ...grant(), password: "never-return" }])); const response = await handleAccountGrantsRequest(request()); expect(response.status).toBe(200); expect(await response.text()).not.toContain("never-return"); expect(String(fetcher.mock.calls[0][0])).toBe(`http://127.0.0.1:8080/api/accounts/${accountId}/grants`); expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("suppresses history after a session switch", async () => {
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" })); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([grant()])); const response = await handleAccountGrantsRequest(request()); expect(response.status).toBe(401); expect(await response.text()).not.toContain("Kế toán");
  });
  it("has no mutation entry point and does not infer all-zone scope from a role name", async () => {
    expect((await handleAccountGrantsRequest(new Request(request().url, { method: "POST" }))).status).toBe(405); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ ...grant(), allZones: false }])); expect((await handleAccountGrantsRequest(request())).status).toBe(502);
  });
});
