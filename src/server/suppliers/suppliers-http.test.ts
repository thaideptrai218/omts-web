import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleSuppliers } from "./suppliers-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
const row = { id, name: "NCC", code: "NCC000001", supplierType: "Seed", phoneNumber: "0900000000", statusId: 101, status: "In Use", email: null, address: null, province: null, ward: null, companyName: null, taxCode: null, note: null, createdAt: "2026-11-09T00:00:00Z", createdBy: null, totalPurchased: 100, currentDebt: null };
function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const post = (body: unknown) => new Request("https://web.example.test/api/suppliers", {
  method: "POST", headers: { Origin: "https://web.example.test", "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const get = (query: string) => new Request(`https://web.example.test/api/suppliers?${query}`);
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("supplier BFF", () => {
  it("drops an identity number that reaches the list and keeps a null debt null", async () => {
    setup([["SUPPLIERS", "View"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [{ ...row, identityNumber: "012345678901" }], page: 1, pageSize: 15, total: 1 }));
    const response = await handleSuppliers(get("action=list")), text = await response.text();
    expect(response.status).toBe(200);
    expect(text).not.toContain("012345678901");
    expect(JSON.parse(text).data.items[0].currentDebt).toBeNull();
  });
  it("refuses history without receipt rights and export without Export, before the API", async () => {
    setup([["SUPPLIERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleSuppliers(get(`action=history&id=${id}`))).status).toBe(403);
    expect((await handleSuppliers(get("action=export"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("forwards allow-listed sort and filters and rejects unknown parameters", async () => {
    setup([["SUPPLIERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 15, total: 0 }));
    expect((await handleSuppliers(get("action=list&sortBy=currentDebt&sortDir=desc&pageSize=15"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/suppliers?sortBy=currentDebt&sortDir=desc&pageSize=15");
    expect((await handleSuppliers(get("action=list&sortBy=password"))).status).toBe(400);
    expect((await handleSuppliers(get("action=list&evil=1"))).status).toBe(400);
  });
});

describe("supplier BFF save body", () => {
  const body = {
    name: "NCC", supplierType: "Seed", phoneNumber: "0900000000", email: null, note: null, taxCode: "0312345678",
    provinceCode: 92, provinceName: "Thành phố Cần Thơ", wardCode: 920101, wardName: "Phường Ninh Kiều", street: "12 Trần Hưng Đạo", province: "Thành phố Cần Thơ", ward: "Phường Ninh Kiều", address: "12 Trần Hưng Đạo",
    invoiceBuyerType: "Organization", invoiceName: "Cty NCC", personalTaxId: null, invoiceAddressSameAsContact: true, invoiceProvinceCode: null, invoiceProvinceName: null, invoiceWardCode: null, invoiceWardName: null, invoiceStreet: null, invoiceEmail: "hoadon@ncc.vn",
  };
  const detail = { ...row, certificates: [], rowVersion: "v1" };
  it("forwards the contact address, its codes and the invoice info to the API", async () => {
    setup([["SUPPLIERS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(detail, { status: 201 }));
    expect((await handleSuppliers(post({ action: "create", body }))).status).toBe(200);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual(body);
  });
  it("keeps the old create body of the quick supplier form valid", async () => {
    setup([["SUPPLIERS", "Create"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(detail, { status: 201 }));
    expect((await handleSuppliers(post({ action: "create", body: { name: "NCC", supplierType: "Seed", phoneNumber: "0900000000", address: null, email: null } }))).status).toBe(200);
  });
  it("refuses a consumer buyer, the removed identity number and a ward code that is not a number, before the API", async () => {
    setup([["SUPPLIERS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleSuppliers(post({ action: "create", body: { ...body, invoiceBuyerType: "Consumer" } }))).status).toBe(400);
    expect((await handleSuppliers(post({ action: "create", body: { ...body, identityNumber: "012345678901" } }))).status).toBe(400);
    expect((await handleSuppliers(post({ action: "create", body: { ...body, wardCode: "920101" } }))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("hands on the invoice info and the review flag of a supplier, and drops an identity number", async () => {
    setup([["SUPPLIERS", "View"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...detail, identityNumber: "012345678901", ...body, addressNeedsReview: true }));
    const answer = await handleSuppliers(get(`action=detail&id=${id}`)), text = await answer.text();
    expect(answer.status).toBe(200);
    expect(text).not.toContain("012345678901");
    expect(JSON.parse(text).data).toMatchObject({ provinceCode: 92, wardCode: 920101, invoiceBuyerType: "Organization", invoiceEmail: "hoadon@ncc.vn", addressNeedsReview: true });
  });
});
