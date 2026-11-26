import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, replacedSession } from "../employees/__tests__/employee-fixture";
import { handleAccountResetPassword } from "./account-reset-password-http";
import { handleAccountCreate } from "./account-create-http";

const accountId = "122bb318-a72e-49aa-a8d7-a6169f889007", zoneId = "322bb318-a72e-49aa-a8d7-a6169f889007";
const post = (path: string, body: unknown, origin = "http://localhost:3002") => new Request(`http://localhost:3002${path}`, { method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) });
const reset = (body: unknown = { confirmed: true }, id = accountId, origin?: string) => handleAccountResetPassword(post(`/api/accounts/${id}/reset-password`, body, origin), id);
const backendCredential = () => ({ account: { id: accountId, username: "quanlyvung2", displayName: "Quản lý 2", rowVersion: "never-return", pairs: [] }, temporaryPassword: "Tmp#12345", temporaryPasswordExpiresAt: "2026-11-21T10:00:00+07:00", messageCode: "MSG-ACCOUNT-23" });
const createBody = (patch: object = {}) => ({ displayName: "Quản lý 2", username: "quanlyvung2", phoneNumber: "0912345678", email: null, employeeId: null, grants: [{ zoneId, role: "ZONE_MANAGER" }], ...patch });

beforeEach(() => {
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved());
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("reset password BFF route", () => {
  it.each(["Staff", "Trader", "SystemAdministrator"] as const)("refuses %s before reaching the backend", async (subjectType) => {
    gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } }));
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await reset()).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires the explicit confirmation, a GUID route id, and rejects extra fields", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await reset({ confirmed: false })).status).toBe(400);
    expect((await reset({ confirmed: true, password: "x" })).status).toBe(400);
    expect((await reset({ confirmed: true }, "../admin")).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks CSRF before consuming the body", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await reset({ confirmed: true }, accountId, "https://evil.test")).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("posts to the fixed backend path without a body and returns only the one-time credential", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(backendCredential(), { status: 200 }));
    const response = await reset(), text = await response.text();
    expect(response.status).toBe(200); expect(text).not.toContain("never-return"); expect(text).toContain("Tmp#12345");
    expect(String(fetcher.mock.calls[0][0])).toBe(`http://127.0.0.1:8080/api/accounts/${accountId}/reset-password`);
    expect(fetcher.mock.calls[0][1]?.method).toBe("POST"); expect(fetcher.mock.calls[0][1]?.body).toBeUndefined();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
  it("relays a backend refusal code and suppresses a committed password after a session switch", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ code: "MSG-GEN-09" }, { status: 409 }));
    expect((await reset()).status).toBe(409);
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(replacedSession());
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(backendCredential(), { status: 200 }));
    const response = await reset(); expect(response.status).toBe(401); expect(await response.text()).not.toContain("Tmp#12345");
  });
});

describe("create user BFF route", () => {
  it("refuses a non-Owner and malformed bodies before the backend", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    gateway.resolve.mockResolvedValueOnce(resolved({ identity: { ...resolved().session.identity, subjectType: "Staff" } }));
    expect((await handleAccountCreate(post("/api/accounts", createBody()))).status).toBe(403);
    for (const body of [createBody({ username: "ab" }), createBody({ grants: [{ zoneId, role: "OWNER" }] }), createBody({ subjectType: "CooperativeOwner" }), createBody({ employeeId: "x" })])
      expect((await handleAccountCreate(post("/api/accounts", body))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("posts the account with its Grants inline to POST /api/accounts and expects 201", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(backendCredential(), { status: 201 }));
    const grants = [{ zoneId, role: "ZONE_MANAGER" }, { zoneId: null, role: "ACCOUNTANT" }];
    const response = await handleAccountCreate(post("/api/accounts", createBody({ grants })));
    expect(response.status).toBe(200); expect(await response.text()).not.toContain("never-return");
    expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8080/api/accounts");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ displayName: "Quản lý 2", username: "quanlyvung2", phoneNumber: "0912345678", email: null, employeeId: null, grants, note: null });
  });
  it("does not accept a 200 as a created account", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(backendCredential(), { status: 200 }));
    expect((await handleAccountCreate(post("/api/accounts", createBody()))).status).toBe(503);
  });
});
