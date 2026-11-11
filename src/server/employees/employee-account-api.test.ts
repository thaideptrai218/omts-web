import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { employeeDetailFixture, employeeId } from "@/features/employee-management/api/employee-wire.fixtures";
import { issueEmployeeAccountRequestSchema, issueEmployeeAccountResponseSchema } from "@/features/employee-api/employee-account-contract";
import { resolved } from "./__tests__/employee-fixture";
import { planEmployeeApi } from "./employee-api-plan";
import { handleEmployeeApi } from "./employee-api-http";

function configure(subjectType = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("OMTS_DATA_SOURCE", "api");
  vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080");
  vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002");
  vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType } } });
}
function request(body: unknown = { username: "nhanvien.new" }, origin = "http://localhost:3002") {
  return new Request("http://localhost:3002/api/operations/employees", {
    method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" },
    body: JSON.stringify({ action: "issue-account", id: employeeId, body }),
  });
}
function saved() {
  return { employee: employeeDetailFixture(), message: "Private upstream save copy", messageCode: "MSG-GEN-05",
    temporaryPassword: crypto.randomUUID(), temporaryPasswordExpiresAt: "2026-11-11T12:00:00+07:00", accountMessageCode: "MSG-ACCOUNT-23" };
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("employee login account operation contract", () => {
  it.each([{ username: "" }, { username: "   " }, { username: "new", email: "staff@example.test" },
    { username: "new", grants: [] }, { username: "new", subjectType: "CooperativeOwner" },
    { username: "new", temporaryPassword: "forbidden" }])("rejects invalid fields and privilege/secret injection", body => {
    expect(issueEmployeeAccountRequestSchema.safeParse(body).success).toBe(false);
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "issue-account", id: employeeId, body })).toBeUndefined();
  });
  it("requires an employee ID and maps only to the fixed account endpoint", () => {
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "issue-account", body: { username: "new" } })).toBeUndefined();
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "issue-account", id: employeeId, body: { username: " new " } }))
      .toMatchObject({ path: `/api/employees/${employeeId}/account`, method: "POST", body: { username: "new" } });
  });
  it("requires a complete, linked account credential receipt and rejects extraneous response data", () => {
    const payload = saved();
    const receipt = { employee: payload.employee, temporaryPassword: payload.temporaryPassword,
      temporaryPasswordExpiresAt: payload.temporaryPasswordExpiresAt, accountMessageCode: payload.accountMessageCode };
    expect(issueEmployeeAccountResponseSchema.safeParse(receipt).success).toBe(true);
    for (const changed of [{ ...receipt, temporaryPassword: null }, { ...receipt, temporaryPasswordExpiresAt: null },
      { ...receipt, temporaryPasswordExpiresAt: "tomorrow" }, { ...receipt, passwordHash: "forbidden" },
      { ...receipt, employee: { ...receipt.employee, account: null } }]) {
      expect(issueEmployeeAccountResponseSchema.safeParse(changed).success).toBe(false);
    }
  });
});

describe("employee login account BFF security", () => {
  it("returns one credential receipt with no-store and sends no secret or privilege fields upstream", async () => {
    configure(); const payload = saved();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(payload, { status: 201 }));
    const response = await handleEmployeeApi(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const result = await response.json();
    expect(result.data.temporaryPassword).toBe(payload.temporaryPassword);
    expect(result.data.temporaryPasswordExpiresAt).toBe(payload.temporaryPasswordExpiresAt);
    expect(result.data.employee.id).toBe(employeeId);
    expect(result.data).not.toHaveProperty("message");
    expect(result.data).not.toHaveProperty("messageCode");
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(url.toString()).toBe(`http://127.0.0.1:8080/api/employees/${employeeId}/account`);
    expect(options?.cache).toBe("no-store");
    expect(JSON.parse(options!.body as string)).toEqual({ username: "nhanvien.new" });
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain(payload.temporaryPassword);
  });
  it.each(["Staff", "Trader", "SystemAdministrator"])("refuses %s before contacting backend", async subject => {
    configure(subject); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(request())).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks CSRF and authentication", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(request(undefined, "https://evil.test"))).status).toBe(403);
    gateway.resolve.mockResolvedValueOnce({ status: "missing" });
    expect((await handleEmployeeApi(request())).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("discards credentials if the session changes", async () => {
    configure(); const payload = saved();
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce({ status: "missing" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(payload, { status: 201 }));
    const response = await handleEmployeeApi(request());
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(payload.temporaryPassword);
  });
  it.each(["MSG-ACCOUNT-09", "MSG-GEN-01", "MSG-GEN-08"])("returns only the safe error code %s", async code => {
    configure(); const secret = crypto.randomUUID();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code, detail: secret, params: { password: secret }, temporaryPassword: secret }, { status: 400 }));
    const response = await handleEmployeeApi(request());
    const result = await response.json();
    expect(result).toEqual({ status: "rejected", code });
    expect(JSON.stringify(result)).not.toContain(secret);
  });
  it("rejects a receipt for a different employee without leaking the password", async () => {
    configure(); const payload = saved(); payload.employee.id = crypto.randomUUID();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(payload, { status: 201 }));
    const response = await handleEmployeeApi(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain(payload.temporaryPassword);
  });
});
