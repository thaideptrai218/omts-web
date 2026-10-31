import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "./__tests__/employee-fixture";
import { employeeDetailFixture, employeeId, linkedAccountId } from "@/features/employee-management/api/employee-wire.fixtures";
import { planEmployeeApi } from "./employee-api-plan";
import { handleEmployeeApi } from "./employee-api-http";
const body = () => { const row = employeeDetailFixture(); return { fullName: row.fullName, phoneNumber: row.phoneNumber, birthday: row.birthday, address: row.address, area: row.area, ward: row.ward, otherInformation: row.otherInformation, notes: row.notes, workingZoneIds: row.workingZones.map((zone) => zone.id), bankAccount: row.bankAccount, accountId: row.account.id }; };
function configure(subjectType = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000"); vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved()); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: [] } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const read = (query: string) => new Request(`http://localhost:3002/api/operations/employees?${query}`);
const write = (action: string, body: unknown, id: string | undefined = employeeId, origin = "http://localhost:3002") => new Request("http://localhost:3002/api/operations/employees", { method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify({ action, ...(action === "create" ? {} : { id }), body }) });
describe("employee fixed operation plans", () => {
  it.each(["action=list&statusId=301", "action=list&pageSize=101", "action=list&zoneId=bad", `action=detail&id=${employeeId}&id=${linkedAccountId}`, "action=list&target=https://evil.test"]) ("rejects invalid list/detail query %s", (query) => expect(planEmployeeApi("GET", new URLSearchParams(query))).toBeUndefined());
  it("keeps list paging and status policy explicit, and safely encodes base64 unlink versions", () => {
    expect(planEmployeeApi("GET", new URLSearchParams("action=list"))?.path).not.toContain("statusId");
    expect(planEmployeeApi("GET", new URLSearchParams("action=list&statusId=401"))?.path).toContain("statusId=401");
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "unlink", id: employeeId, body: { rowVersion: "AAAAAAAA+/8=" } })?.path).toBe(`/api/employees/${employeeId}/account?rowVersion=AAAAAAAA%2B%2F8%3D`);
  });
  it.each([{ ...body(), account: { username: "forbidden" } }, { ...body(), statusId: 402 }, { ...body(), rowVersion: "" }, { ...body(), birthday: "2999-01-01" }])("rejects creation of credentials, status bypass and invalid personal data", (input) => expect(planEmployeeApi("POST", new URLSearchParams(), { action: "create", body: input })).toBeUndefined());
  it("requires a valid version for every update and employment transition", () => {
    for (const action of ["update", "unlink", "end-employment", "reinstate"]) expect(planEmployeeApi("POST", new URLSearchParams(), { action, id: employeeId, body: action === "update" ? body() : {} })).toBeUndefined();
  });
  it("refuses a future end date without calling the backend", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(write("end-employment", { rowVersion: "AQID", endDate: "2999-01-01" }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
});
describe("employee API privacy and authorization", () => {
  it.each(["Staff", "Trader", "SystemAdministrator"])("refuses private reads and all employee writes for %s", async (subject) => {
    configure(subject); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(read("action=linkable-accounts"))).status).toBe(403);
    expect((await handleEmployeeApi(write("unlink", { rowVersion: "AQID" }))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects an anonymous or onboarding session", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce({ status: "missing" }); expect((await handleEmployeeApi(read("action=list"))).status).toBe(401);
    gateway.resolve.mockResolvedValueOnce(resolved({ phase: "contact-verification-required" })); expect((await handleEmployeeApi(read("action=list"))).status).toBe(403);
  });
  it("checks CSRF before consuming a write", async () => {
    configure(); const request = write("create", body(), undefined, "https://evil.test"), reader = vi.spyOn(request.body!, "getReader"), fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(request)).status).toBe(403); expect(reader).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("never returns credential fields or raw success strings from a saved profile", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ employee: { ...employeeDetailFixture(), passwordHash: "secret-hash" }, message: "raw-private-response", temporaryPassword: "secret-password" }, { status: 201 }));
    const response = await handleEmployeeApi(write("create", body(), undefined)); expect(response.status).toBe(200); const text = await response.text(); expect(text).toContain("Nguyễn Văn An"); expect(text).not.toContain("secret"); expect(text).not.toContain("raw-private");
  });
  it("projects duplicate IDs and field targets on creation without raw detail/params", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ code: "MSG03", existingEmployeeId: employeeId, detail: "private raw", params: { password: "never-return" } }, { status: 409 }))
      .mockResolvedValueOnce(Response.json({ code: "MSG01", field: "Full name", detail: "private raw" }, { status: 400 }));
    let response = await handleEmployeeApi(write("create", body(), undefined)); const text = await response.text(); expect(text).toContain(employeeId); expect(text).not.toContain("private"); expect(text).not.toContain("password");
    response = await handleEmployeeApi(write("create", body(), undefined)); expect((await response.json()).employeeProblem).toEqual({ kind: "invalid-fields", fields: ["Full name"] });
  });
  it("suppresses personal data and duplicate IDs after the session changes", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "new" })); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG24", existingEmployeeId: employeeId }, { status: 409 }));
    const response = await handleEmployeeApi(write("update", { ...body(), rowVersion: "AQID" })); expect(response.status).toBe(401); expect(await response.text()).not.toContain(employeeId);
  });
  it("requires the returned employee to match the requested identity", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...employeeDetailFixture(), id: linkedAccountId }));
    expect((await handleEmployeeApi(read(`action=detail&id=${employeeId}`))).status).toBe(502);
  });
  it("allows an employment follow-up only for the actual linked account", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ employee: employeeDetailFixture(), followUp: { action: "review-lock", accountId: employeeId }, accessToken: "never-return" }))
      .mockResolvedValueOnce(Response.json({ employee: employeeDetailFixture(), followUp: { action: "review-lock", accountId: linkedAccountId }, accessToken: "never-return" }));
    expect((await handleEmployeeApi(write("end-employment", { rowVersion: "AQID", endDate: "2026-01-01" }))).status).toBe(502);
    const response = await handleEmployeeApi(write("end-employment", { rowVersion: "AQID", endDate: "2026-01-01" })); expect(response.status).toBe(200); expect(await response.text()).not.toContain("never-return"); expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
