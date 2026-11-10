import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { employeeDetailFixture, employeeId } from "@/features/employee-management/api/employee-wire.fixtures";
import { createEmployeeRequestSchema, employeeCreateReceiptSchema } from "@/features/employee-api/employee-create-contract";
import { resolved } from "./__tests__/employee-fixture";
import { planEmployeeApi } from "./employee-api-plan";
import { handleEmployeeApi } from "./employee-api-http";

const profile = () => ({ fullName: "Nguyễn Văn An", phoneNumber: "0912345678", workingZoneIds: [employeeId], employeeType: "Staff" });
function configure(subjectType = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080");
  vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000"); vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType } } });
}
const create = (body: unknown, origin = "http://localhost:3002") => new Request("http://localhost:3002/api/operations/employees", {
  method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", body }),
});
const saved = () => ({ employee: employeeDetailFixture(), message: "Private upstream copy", messageCode: "MSG-GEN-05",
  temporaryPassword: crypto.randomUUID(), temporaryPasswordExpiresAt: "2026-11-12T12:00:00+07:00", accountMessageCode: "MSG-ACCOUNT-23" });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("employee creation with a login account: request", () => {
  it("accepts a profile with username and optional email and trims the username", () => {
    const plan = planEmployeeApi("POST", new URLSearchParams(), { action: "create", body: { ...profile(), account: { username: " nhanvien.moi ", email: "a@example.test" } } });
    expect(plan).toMatchObject({ path: "/api/employees", method: "POST", receipt: true, body: { account: { username: "nhanvien.moi", email: "a@example.test" } } });
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "create", body: { ...profile(), account: { username: "u" } } })).toMatchObject({ receipt: true });
  });
  it("keeps the plain create plan free of the receipt path", () => {
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "create", body: profile() })).toMatchObject({ receipt: false });
  });
  it.each([{ username: "" }, { username: "u", email: "bad" }, { username: "u", grants: [] }, { username: "u", subjectType: "CooperativeOwner" }, { username: "u", temporaryPassword: "x" }])("rejects account %j", account => {
    expect(createEmployeeRequestSchema.safeParse({ ...profile(), account }).success).toBe(false);
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "create", body: { ...profile(), account } })).toBeUndefined();
  });
  it("refuses account creation on update", () => {
    expect(planEmployeeApi("POST", new URLSearchParams(), { action: "update", id: employeeId, body: { ...profile(), rowVersion: "AQID", account: { username: "u" } } })).toBeUndefined();
  });
});

describe("employee creation with a login account: BFF", () => {
  it("returns one credential receipt, no-store, without upstream message copy", async () => {
    configure(); const payload = saved();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(payload, { status: 201 }));
    const response = await handleEmployeeApi(create({ ...profile(), account: { username: "nhanvien.moi" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const result = await response.json();
    expect(employeeCreateReceiptSchema.safeParse(result.data).success).toBe(true);
    expect(result.data.temporaryPassword).toBe(payload.temporaryPassword);
    expect(result.data).not.toHaveProperty("message");
    expect(result.data).not.toHaveProperty("messageCode");
    const [url, options] = fetcher.mock.calls[0];
    expect(url.toString()).toBe("http://127.0.0.1:8080/api/employees");
    expect(JSON.parse(options!.body as string).account).toEqual({ username: "nhanvien.moi" });
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain(payload.temporaryPassword);
  });
  it("rejects an account request whose answer has no password or no linked account", async () => {
    configure();
    for (const broken of [{ ...saved(), temporaryPassword: undefined }, { ...saved(), employee: { ...employeeDetailFixture(), account: null } }]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(broken, { status: 201 }));
      expect((await handleEmployeeApi(create({ ...profile(), account: { username: "u" } }))).status).toBe(502);
    }
  });
  it("never leaks a password when no account was requested", async () => {
    configure(); const payload = saved();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(payload, { status: 201 }));
    const text = await (await handleEmployeeApi(create(profile()))).text();
    expect(text).not.toContain(payload.temporaryPassword);
  });
  it.each(["Staff", "Trader", "SystemAdministrator"])("refuses %s before contacting the backend", async subject => {
    configure(subject); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(create({ ...profile(), account: { username: "u" } }))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks CSRF and discards the password if the session changed", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleEmployeeApi(create({ ...profile(), account: { username: "u" } }, "https://evil.test"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    const payload = saved();
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce({ status: "missing" });
    fetcher.mockResolvedValue(Response.json(payload, { status: 201 }));
    const response = await handleEmployeeApi(create({ ...profile(), account: { username: "u" } }));
    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain(payload.temporaryPassword);
  });
  it("returns only the safe code when the username is taken", async () => {
    configure(); const secret = crypto.randomUUID();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-ACCOUNT-09", detail: secret, params: { password: secret } }, { status: 409 }));
    const result = await (await handleEmployeeApi(create({ ...profile(), account: { username: "u" } }))).json();
    expect(result).toMatchObject({ status: "rejected", code: "MSG-ACCOUNT-09" });
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
