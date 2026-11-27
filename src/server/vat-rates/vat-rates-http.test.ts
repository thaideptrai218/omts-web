import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleVatRates } from "./vat-rates-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007", other = "122bb318-a72e-49aa-a8d7-a6169f889008";
function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const get = (query: string) => new Request(`https://web.example.test/api/vat-rates?${query}`);
const post = (body: unknown, size = 0) => new Request("https://web.example.test/api/vat-rates", { method: "POST", headers: { Origin: "https://web.example.test", "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: size ? JSON.stringify({ ...(body as object), pad: "x".repeat(size) }) : JSON.stringify(body) });
const rate = { id, name: "8%", percent: 8, isExempt: false, isSystem: false, isDefault: false, active: true, sortOrder: 3, itemCount: 0, rowVersion: "v" };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("VAT rates BFF", () => {
  it("lists the rates for an account that reads receipts and forwards only the active filter", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([rate]));
    const response = await handleVatRates(get("action=list&active=true"));
    expect(response.status).toBe(200);
    expect((await response.json()).data[0]).toMatchObject({ id, percent: 8 });
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/vat-rates?active=true");
    expect((await handleVatRates(get("action=list&evil=1"))).status).toBe(400);
    expect((await handleVatRates(get("action=other"))).status).toBe(400);
  });

  it("refuses the list to an account that reads neither items nor receipts, and every write to staff", async () => {
    setup([["CUSTOMERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleVatRates(get("action=list"))).status).toBe(403);
    setup([["PURCHASE_RECEIPTS", "View"], ["PURCHASE_RECEIPTS", "Edit"]]);
    expect((await handleVatRates(post({ action: "create", body: { name: "9%", percent: 9 } }))).status).toBe(403);
    expect((await handleVatRates(post({ action: "default", id }))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("passes the Owner's writes to the API with their paths and bodies", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => String(url).endsWith("/deactivate")
      ? Response.json({ rate: { ...rate, active: false }, movedItems: 2 }) : Response.json(rate, { status: String(url).endsWith("/vat-rates") ? 201 : 200 }));
    expect((await handleVatRates(post({ action: "create", body: { name: " 8% ", percent: 8.25 } }))).status).toBe(200);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ name: "8%", percent: 8.25 }) });
    expect((await handleVatRates(post({ action: "update", id, body: { name: "8%", percent: 8, rowVersion: "v" } }))).status).toBe(200);
    expect(String(fetcher.mock.calls[1][0])).toContain(`/api/vat-rates/${id}`);
    expect(fetcher.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    expect((await handleVatRates(post({ action: "default", id }))).status).toBe(200);
    expect(String(fetcher.mock.calls[2][0])).toContain(`/api/vat-rates/${id}/default`);
    const moved = await handleVatRates(post({ action: "deactivate", id, body: { replacementId: other, rowVersion: "v" } }));
    expect((await moved.json()).data.movedItems).toBe(2);
    expect(JSON.parse(String(fetcher.mock.calls[3][1]?.body))).toEqual({ replacementId: other, rowVersion: "v" });
    expect((await handleVatRates(post({ action: "activate", id }))).status).toBe(200);
  });

  it("refuses a malformed write before the API: a percent over 100 or with three decimals, a missing name, a bad id, an extra field", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch");
    for (const body of [
      { action: "create", body: { name: "x", percent: 100.5 } }, { action: "create", body: { name: "x", percent: 8.125 } }, { action: "create", body: { name: "x", percent: -1 } },
      { action: "create", body: { name: " ", percent: 8 } }, { action: "create", body: { name: "x".repeat(51), percent: 8 } }, { action: "create", body: { name: "x", percent: 8, evil: 1 } },
      { action: "update", id: "nope", body: { name: "x", percent: 8, rowVersion: "v" } }, { action: "update", id, body: { name: "x", percent: 8 } },
      { action: "deactivate", id, body: { replacementId: "nope", rowVersion: "v" } }, { action: "remove", id },
    ]) expect((await handleVatRates(post(body))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refuses a body over 64 KB", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleVatRates(post({ action: "create", body: { name: "x", percent: 8 } }, 70_000))).status).toBeGreaterThanOrEqual(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("passes a missing catalogue (404) through so the web can fall back, and the refusal message of a conflict", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    expect((await handleVatRates(get("action=list"))).status).toBe(404);
    setup([], "CooperativeOwner");
    fetcher.mockResolvedValue(Response.json({ code: "MSG-GEN-09", message: "Không tắt được mức mặc định." }, { status: 409 }));
    const refused = await handleVatRates(post({ action: "deactivate", id, body: { rowVersion: "v" } }));
    expect(refused.status).toBe(409);
    expect((await refused.json()).problem).toMatchObject({ message: "Không tắt được mức mặc định." });
    // The API's problem answer carries its sentence in `detail` (with a reasonCode): the dialog still shows that sentence.
    fetcher.mockResolvedValue(Response.json({ code: "MSG-GEN-09", detail: "Mức thuế hệ thống KCT không sửa được.", reasonCode: "VAT_RATE_SYSTEM" }, { status: 409 }));
    const system = await handleVatRates(post({ action: "deactivate", id, body: { rowVersion: "v" } }));
    expect((await system.json()).problem).toMatchObject({ message: "Mức thuế hệ thống KCT không sửa được." });
  });

  it("does not hand on an answer that is not the shape of a rate", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ id: "x" }]));
    expect((await handleVatRates(get("action=list"))).status).toBe(502);
  });
});
