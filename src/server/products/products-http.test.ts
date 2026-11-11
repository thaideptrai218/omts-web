import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleProducts } from "./products-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007", other = "222bb318-a72e-49aa-a8d7-a6169f889008";
function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const get = (query: string) => new Request(`https://web.example.test/api/products?${query}`);
const post = (body: unknown, headers: Record<string, string> = {}) => new Request("https://web.example.test/api/products", {
  method: "POST", headers: { Origin: "https://web.example.test", "X-OMTS-Request": "web", "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body),
});
const product = { id, code: "SP000001", name: "Hàu sữa", unitPrice: 60000, statusId: 101, status: "In Use", rowVersion: "v1", categoryId: null, categoryName: null, unit: "kg",
  units: [{ id, unitId: id, name: "kg", factor: 1, code: "SP000001-K", isBase: true }], description: null, note: null, photoUrl: null, minKg: null, maxKg: null, onHandKg: 0, isUsed: false,
  createdAt: "2026-11-10T00:00:00+07:00", createdBy: "Chủ", photos: [] };
const body = { code: null, name: "Hàu sữa", unitPrice: 60000, categoryId: null, description: null, note: null, minKg: null, maxKg: null, units: [] };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("products BFF", () => {
  it("forwards only the filters an action lists and refuses a malformed id or group before the API", async () => {
    setup([["SALES_INVOICES", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 20, total: 0, summary: { totalOnHandKg: 0 } }));
    expect((await handleProducts(get("action=products&stock=InStock&status=All&sortBy=onHand&evil=1&pageSize=20"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/products/search?stock=InStock&status=All&sortBy=onHand&pageSize=20");
    expect(String(fetcher.mock.calls[0][0])).not.toContain("evil");
    expect((await handleProducts(get("action=product&id=not-a-guid"))).status).toBe(400);
    expect((await handleProducts(get("action=movements"))).status).toBe(400);
    expect((await handleProducts(get("action=products&categoryId=nope"))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("lets a harvest recorder read only the plain list and detail, and a trader nothing", async () => {
    setup([["HARVESTS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));
    expect((await handleProducts(get("action=products-all"))).status).toBe(200);
    expect((await handleProducts(get("action=products"))).status).toBe(403);
    expect((await handleProducts(get(`action=movements&id=${id}`))).status).toBe(403);
    expect((await handleProducts(get("action=groups"))).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
    setup([], "Trader");
    expect((await handleProducts(get("action=products-all"))).status).toBe(403);
  });

  it("keeps the catalogue writes to the Owner and the disposal writes to those holding the disposal function", async () => {
    setup([["SALES_INVOICES", "Create"], ["PRODUCT_DISPOSALS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleProducts(post({ action: "product-create", body }))).status).toBe(403);
    expect((await handleProducts(post({ action: "group-reorder", body: { ids: [id] } }))).status).toBe(403);
    expect((await handleProducts(post({ action: "disposal-create", body: { zoneId: id, lines: [] } }))).status).toBe(403);
    expect((await handleProducts(get("action=disposals-export"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    setup([["PRODUCT_DISPOSALS", "Create"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id, code: "XHS000001", statusId: 4001, status: "Draft", disposedAt: "2026-11-12T08:00:00+07:00", zoneId: id, zoneCode: "Z1", reason: null, notes: null, totalKg: 0,
      createdAt: "2026-11-12T08:00:00+07:00", createdBy: null, completedAt: null, cancelledAt: null, cancelReason: null, rowVersion: "v", lines: [] }, { status: 201 }));
    expect((await handleProducts(post({ action: "disposal-create", body: { zoneId: id, lines: [] } }))).status).toBe(200);
  });

  it("hands the saved product on without the answer wrapper and sends the body to the API as JSON", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ product, message: "ok", messageCode: "MSG-GEN-05" }, { status: 201 }));
    const answer = await handleProducts(post({ action: "product-create", body }));
    expect(answer.status).toBe(200);
    expect((await answer.json()).data).toMatchObject({ id, code: "SP000001" });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify(body) });
    expect(String(fetcher.mock.calls[0][0])).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/products$/);
  });

  it("answers 502 when the API answer does not match the contract or names another record", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ ...product, units: "none" })).mockResolvedValueOnce(Response.json({ ...product, id: other }));
    expect((await handleProducts(get(`action=product&id=${id}`))).status).toBe(502);
    expect((await handleProducts(get(`action=product&id=${id}`))).status).toBe(502);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("turns a 204 into done and rechecks the session", async () => {
    setup([], "CooperativeOwner");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const answer = await handleProducts(post({ action: "group-delete", id }));
    expect(await answer.json()).toEqual({ status: "success", data: { done: true } });
  });

  it("refuses a foreign origin and a body over 64 KB before the API", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleProducts(post({ action: "group-create", body: { name: "A" } }, { Origin: "https://evil.test" }))).status).toBe(403);
    const big = JSON.stringify({ action: "product-create", body: { ...body, description: "x".repeat(70_000) } });
    expect((await handleProducts(post(big))).status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("takes an import or a photo as one file field only", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ imported: 1, errors: [] }));
    const upload = (query: string, fields: Record<string, string | File>) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(fields)) form.append(key, value);
      return new Request(`https://web.example.test/api/products?${query}`, { method: "POST", headers: { Origin: "https://web.example.test", "X-OMTS-Request": "web" }, body: form });
    };
    const file = new File([new Uint8Array([80, 75])], "san-pham.xlsx");
    expect((await handleProducts(upload("action=import", { file }))).status).toBe(200);
    expect((await handleProducts(upload("action=import", { file, extra: "1" }))).status).toBe(400);
    expect((await handleProducts(upload("action=photo", { file }))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(fetcher.mock.calls[0][0])).toMatch(/\/api\/products\/import$/);
  });
});
