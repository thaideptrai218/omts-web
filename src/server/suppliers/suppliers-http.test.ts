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
