import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment, replacedSession } from "../employees/__tests__/employee-fixture";
import { handleAdministrativeUnits, handleTaxLookup, planTaxLookup, planUnits } from "./address-http";

function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const units = (query: string) => new Request(`https://web.example.test/api/administrative-units?${query}`);
const tax = (query: string) => new Request(`https://web.example.test/api/tax-lookup?${query}`);
const provinces = [{ code: 92, name: "Thành phố Cần Thơ", divisionType: "thành phố trung ương" }, { code: 66, name: "Tỉnh Đắk Lắk", divisionType: "tỉnh" }];
const wards = [{ code: 920101, name: "Phường Ninh Kiều", divisionType: "phường", provinceCode: 92 }];
const company = { taxCode: "0312345678", name: "CÔNG TY TNHH BA", shortName: null, address: "12 Trần Hưng Đạo, Ninh Kiều, Cần Thơ", status: "NNT đang hoạt động",
  province: { code: 92, name: "Thành phố Cần Thơ" }, ward: { code: 920101, name: "Phường Ninh Kiều" }, street: "12 Trần Hưng Đạo" };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("plans", () => {
  it("maps the allowed queries to the backend calls and refuses the rest", () => {
    expect(planUnits(new URLSearchParams("action=provinces"))?.path).toBe("/api/administrative-units/provinces");
    expect(planUnits(new URLSearchParams("action=wards&provinceCode=92"))?.path).toBe("/api/administrative-units/provinces/92/wards");
    for (const bad of ["", "action=wards", "action=wards&provinceCode=../x", "action=wards&provinceCode=0", "action=wards&provinceCode=92&x=1", "action=provinces&x=1", "action=districts"]) expect(planUnits(new URLSearchParams(bad)), bad).toBeUndefined();
    expect(planTaxLookup(new URLSearchParams("taxCode=0312345678"))?.path).toBe("/api/tax-lookup/0312345678");
    expect(planTaxLookup(new URLSearchParams("taxCode=0312345678-001"))?.path).toBe("/api/tax-lookup/0312345678-001");
    for (const bad of ["", "taxCode=12345", "taxCode=0312345678-01", "taxCode=0312345678/../x", "taxCode=0312345678&x=1"]) expect(planTaxLookup(new URLSearchParams(bad)), bad).toBeUndefined();
  });
});

describe("administrative units BFF", () => {
  it("reads the provinces for any signed-in staff and lets the browser keep them for a while", async () => {
    setup([]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(provinces));
    const answer = await handleAdministrativeUnits(units("action=provinces"));
    expect(answer.status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/administrative-units/provinces");
    expect(answer.headers.get("cache-control")).toContain("max-age=3600");
    expect((await answer.json()).data).toEqual(provinces);
  });
  it("reads the wards of one province", async () => {
    setup([]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(wards));
    const answer = await handleAdministrativeUnits(units("action=wards&provinceCode=92"));
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/administrative-units/provinces/92/wards");
    expect((await answer.json()).data[0].provinceCode).toBe(92);
  });
  it("refuses a malformed query before the API, and anything but GET", async () => {
    setup([]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleAdministrativeUnits(units("action=wards&provinceCode=abc"))).status).toBe(400);
    expect((await handleAdministrativeUnits(new Request("https://web.example.test/api/administrative-units?action=provinces", { method: "POST" }))).status).toBe(405);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("answers 502 when the API sends a list of another shape", async () => {
    setup([]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ code: "92", name: "x" }]));
    expect((await handleAdministrativeUnits(units("action=provinces"))).status).toBe(502);
  });
  it("passes on that the upstream registry is down, without caching it", async () => {
    setup([]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ code: "MSG-GEN-01", detail: "upstream" }), { status: 503, headers: { "Content-Type": "application/problem+json" } }));
    const answer = await handleAdministrativeUnits(units("action=provinces"));
    expect(answer.status).toBe(503);
    expect(answer.headers.get("cache-control")).toContain("no-store");
    expect(JSON.stringify(await answer.json())).not.toContain("upstream");
  });
  it("answers 401 without a session and 401 when the session was replaced during the call", async () => {
    setup([]);
    gateway.resolve.mockResolvedValueOnce({ status: "unauthenticated" });
    expect((await handleAdministrativeUnits(units("action=provinces"))).status).toBe(401);
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(replacedSession());
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(provinces));
    expect((await handleAdministrativeUnits(units("action=provinces"))).status).toBe(401);
  });
});

describe("tax lookup BFF", () => {
  it("looks a tax code up for staff who may create or edit customers or suppliers", async () => {
    for (const right of [["CUSTOMERS", "Create"], ["CUSTOMERS", "Edit"], ["SUPPLIERS", "Create"], ["SUPPLIERS", "Edit"]] as [string, string][]) {
      setup([right]);
      const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(company));
      const answer = await handleTaxLookup(tax("taxCode=0312345678"));
      expect(answer.status, right.join(" ")).toBe(200);
      expect(String(fetcher.mock.calls[0][0])).toContain("/api/tax-lookup/0312345678");
      expect(answer.headers.get("cache-control")).toContain("no-store");
      expect((await answer.json()).data).toMatchObject({ name: "CÔNG TY TNHH BA", province: { code: 92 }, ward: { code: 920101 } });
      vi.restoreAllMocks();
    }
  });
  it("accepts a lookup result without the split address", async () => {
    setup([], "CooperativeOwner");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ taxCode: "0312345678", name: "Cty", address: "Số 1, X", status: "NNT ngừng hoạt động" }));
    const answer = await handleTaxLookup(tax("taxCode=0312345678"));
    expect(answer.status).toBe(200);
    expect((await answer.json()).data.status).toBe("NNT ngừng hoạt động");
  });
  it("refuses staff who may only view, and a malformed tax code, before the API", async () => {
    setup([["CUSTOMERS", "View"], ["SUPPLIERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleTaxLookup(tax("taxCode=0312345678"))).status).toBe(403);
    expect((await handleTaxLookup(tax("taxCode=123"))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("passes on not found, too many lookups and a down registry with their status", async () => {
    setup([["CUSTOMERS", "Create"]]);
    for (const status of [404, 429, 503]) {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ title: "x" }), { status, headers: { "Content-Type": "application/problem+json" } }));
      const answer = await handleTaxLookup(tax("taxCode=0312345678"));
      expect(answer.status).toBe(status);
      expect((await answer.json()).status).toBe("rejected");
      vi.restoreAllMocks();
    }
  });
});
