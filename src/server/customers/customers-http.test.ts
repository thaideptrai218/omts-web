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
const post = (body: unknown) => new Request("https://web.example.test/api/customers", {
  method: "POST", headers: { Origin: "https://web.example.test", "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body),
});
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

describe("customer BFF save body", () => {
  const body = {
    name: "Chú Ba", phoneNumber: "0900000000", customerType: "Individual", taxCode: null,
    provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 920101, wardName: "Phường Ninh Kiều", street: "12 Trần Hưng Đạo", province: "Thành phố Cần Thơ", ward: "Phường Ninh Kiều", address: "12 Trần Hưng Đạo",
    invoiceBuyerType: "Consumer", invoiceName: null, personalTaxId: null, invoiceAddressSameAsContact: false, invoiceProvinceCode: null, invoiceProvinceName: null, invoiceWardCode: null, invoiceWardName: null, invoiceStreet: null, invoiceEmail: null,
  };
  const saved = { customer: { id, code: "KH000001", phoneLocked: false, rowVersion: "v1", statusId: 101, status: "In Use", createdAt: "2026-11-09T00:00:00Z", ...body } };
  it("forwards the contact address, its codes and the invoice info of a consumer to the API", async () => {
    setup([["CUSTOMERS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(saved, { status: 201 }));
    expect((await handleCustomers(post({ action: "create", body }))).status).toBe(200);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual(body);
  });
  it("updates with the row version and refuses the removed identity number and an unknown buyer type", async () => {
    setup([["CUSTOMERS", "Edit"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(saved));
    expect((await handleCustomers(post({ action: "update", id, body: { ...body, rowVersion: "v1" } }))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain(`/api/customers/${id}`);
    expect((await handleCustomers(post({ action: "update", id, body: { ...body, rowVersion: "v1", identityNumber: "012345678901" } }))).status).toBe(400);
    expect((await handleCustomers(post({ action: "update", id, body: { ...body, rowVersion: "v1", invoiceBuyerType: "Company" } }))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("hands on the invoice info and the review flag of a customer, and drops an identity number", async () => {
    setup([["CUSTOMERS", "View"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...saved.customer, identityNumber: "012345678901", invoiceBuyerType: "Organization", invoiceName: "Cty Ba", invoiceEmail: "hoadon@ba.vn", addressNeedsReview: true }));
    const answer = await handleCustomers(get(`action=detail&id=${id}`)), text = await answer.text();
    expect(answer.status).toBe(200);
    expect(text).not.toContain("012345678901");
    expect(JSON.parse(text).data).toMatchObject({ provinceCode: 92, invoiceBuyerType: "Organization", invoiceEmail: "hoadon@ba.vn", addressNeedsReview: true });
  });
});
