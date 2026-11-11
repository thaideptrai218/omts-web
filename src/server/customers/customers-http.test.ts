import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleCustomers } from "./customers-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const get = (query: string) => new Request(`https://web.example.test/api/customers?${query}`);
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("customer BFF", () => {
  it("forwards the allow-listed filters and refuses unknown ones before the API", async () => {
    setup([["CUSTOMERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 15, total: 0, summary: null }));
    expect((await handleCustomers(get("action=list&status=All&sortBy=currentDebt&sortDir=desc&pageSize=15"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/customers?status=All&sortBy=currentDebt&sortDir=desc&pageSize=15");
    expect((await handleCustomers(get("action=list&sortBy=password"))).status).toBe(400);
    expect((await handleCustomers(get("action=list&evil=1"))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("asks the debt, payment and invoice rights of the account for their tabs", async () => {
    setup([["CUSTOMERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleCustomers(get(`action=debt&id=${id}`))).status).toBe(403);
    expect((await handleCustomers(get(`action=payment-form&customerId=${id}`))).status).toBe(403);
    expect((await handleCustomers(get(`action=invoices&customerId=${id}&from=2026-01-01&to=2026-11-10`))).status).toBe(403);
    expect((await handleCustomers(get("action=export"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards the over-limit filter only as true", async () => {
    setup([["CUSTOMERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 15, total: 0, summary: null }));
    expect((await handleCustomers(get("action=list&overDebtLimit=true"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/customers?overDebtLimit=true");
    expect((await handleCustomers(get("action=list&overDebtLimit=false"))).status).toBe(400);
  });
  it("reads the customer settings with the right to view customers", async () => {
    setup([["CUSTOMERS", "View"]]);
    const settings = { debtWarningEnabled: true, maxDebtAmount: 500000, maxDebtDays: null, allowMoreDebtOverLimit: true, noDebtForWalkIn: true, rowVersion: "v1",
      requiredFields: { phoneNumber2: false, email: true, gender: false, birthDate: false, address: false, facebook: false, bank: false, taxCode: false } };
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(settings));
    const answer = await handleCustomers(get("action=settings"));
    expect(answer.status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/customer-settings");
    expect((await answer.json()).data.requiredFields.email).toBe(true);
  });
});
