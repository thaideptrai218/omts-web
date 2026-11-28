import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleInputItems } from "./input-items-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const get = (query: string) => new Request(`https://web.example.test/api/input-items?${query}`);
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("input items BFF", () => {
  it("forwards only the filters an action lists and refuses a malformed id before the API", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 20, total: 0, summary: { stockValue: 0 } }));
    expect((await handleInputItems(get("action=items&stock=InStock&sortBy=onHand&evil=1&pageSize=20"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/farming-input-items/search?stock=InStock&sortBy=onHand&pageSize=20");
    expect(String(fetcher.mock.calls[0][0])).not.toContain("evil");
    expect((await handleInputItems(get("action=item&id=not-a-guid"))).status).toBe(400);
    expect((await handleInputItems(get("action=movements"))).status).toBe(400);
    expect((await handleInputItems(get("action=items&itemGroupId=nope"))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("forwards the adjustment switch and the kind of the movements, and hands the groups on with their parent", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => String(url).includes("input-item-groups")
      ? Response.json([{ id, name: "Lưới", sortOrder: 1, itemCount: 2, rowVersion: "v", parentId: id }])
      : Response.json({ items: [], page: 1, pageSize: 15, total: 0, unit: "cái" }));
    expect((await handleInputItems(get(`action=movements&id=${id}&kind=Receipt&includeReversals=true&page=1&pageSize=15`))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain(`/api/farming-input-items/${id}/movements?kind=Receipt&includeReversals=true&page=1&pageSize=15`);
    const groups = await handleInputItems(get("action=groups"));
    expect(groups.status).toBe(200);
    expect((await groups.json()).data[0].parentId).toBe(id);
  });

  it("keeps the catalogue writes and the disposals to the Owner and the issue reads to those who hold the issue functions", async () => {
    setup([["PURCHASE_RECEIPTS", "View"], ["INPUT_ISSUES", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleInputItems(get("action=items-export"))).status).toBe(403);
    expect((await handleInputItems(get("action=items-template"))).status).toBe(403);
    expect((await handleInputItems(get("action=issues-export"))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    setup([["PURCHASE_RECEIPTS", "Export"]]);
    expect((await handleInputItems(get("action=issues"))).status).toBe(403);
    expect((await handleInputItems(get("action=issue-receivers&zoneId=" + id))).status).toBe(403);
  });
});

describe("issue list over several zones", () => {
  const zones = ["529ec3ce-af8f-42f7-a08f-4bab36ba7e71", "529ec3ce-af8f-42f7-a08f-4bab36ba7e72", "529ec3ce-af8f-42f7-a08f-4bab36ba7e73", "529ec3ce-af8f-42f7-a08f-4bab36ba7e74", "529ec3ce-af8f-42f7-a08f-4bab36ba7e75", "529ec3ce-af8f-42f7-a08f-4bab36ba7e76", "529ec3ce-af8f-42f7-a08f-4bab36ba7e77"];
  it("repeats the comma list of the browser as zoneIds for the backend, even when it is longer than any other value may be, and sends no zoneId", async () => {
    setup([["INPUT_ISSUES", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 15, total: 0, summary: { totalValue: 0, totalKg: 0 } }));
    expect((await handleInputItems(get(`action=issues&zoneIds=${zones.join(",")}`))).status).toBe(200);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.searchParams.getAll("zoneIds")).toEqual(zones);
    expect(url.searchParams.has("zoneId")).toBe(false);
  });
  it("refuses zoneIds together with zoneId, a malformed id and more than 50 ids, before the API", async () => {
    setup([["INPUT_ISSUES", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    for (const bad of [`action=issues&zoneIds=${zones[0]}&zoneId=${zones[1]}`, `action=issues&zoneIds=${zones[0]},nope`, `action=issues&zoneIds=${Array.from({ length: 51 }, (_, i) => `529ec3ce-af8f-42f7-a08f-4bab36ba${String(i).padStart(4, "0")}`).join(",")}`]) expect((await handleInputItems(get(bad))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("input VAT on the items door", () => {
  const post = (body: unknown) => new Request("https://web.example.test/api/input-items", { method: "POST", headers: { Origin: "https://web.example.test", "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) });
  it("forwards the VAT filter of the list and refuses a rate the API does not know", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 20, total: 0, summary: { stockValue: 0 } }));
    expect((await handleInputItems(get("action=items&purchaseVatRate=8"))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain("purchaseVatRate=8");
    expect((await handleInputItems(get("action=items&purchaseVatRate=12"))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sends the bulk change of the rate to its own endpoint for the Owner and nothing else", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ updated: 2 }));
    const response = await handleInputItems(post({ action: "item-purchase-vat-rate", body: { itemIds: [id, "122bb318-a72e-49aa-a8d7-a6169f889008"], purchaseVatRate: "8" } }));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ updated: 2 });
    expect(String(fetcher.mock.calls[0][0])).toContain("/api/farming-input-items/purchase-vat-rate");
    expect(fetcher.mock.calls[0][1]?.method).toBe("POST");
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ itemIds: [id, "122bb318-a72e-49aa-a8d7-a6169f889008"], purchaseVatRate: "8" });
    expect((await handleInputItems(post({ action: "item-purchase-vat-rate", body: { itemIds: [], purchaseVatRate: "8" } }))).status).toBe(400);
    expect((await handleInputItems(post({ action: "item-purchase-vat-rate", body: { itemIds: [id], purchaseVatRate: "12" } }))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
    setup([["PURCHASE_RECEIPTS", "View"]]);
    expect((await handleInputItems(post({ action: "item-purchase-vat-rate", body: { itemIds: [id], purchaseVatRate: "8" } }))).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("forwards the rate id of the catalogue as a filter and refuses one that is not a guid", async () => {
    setup([["PURCHASE_RECEIPTS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 20, total: 0, summary: { stockValue: 0 } }));
    expect((await handleInputItems(get(`action=items&purchaseVatRateId=${id}`))).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toContain(`purchaseVatRateId=${id}`);
    expect((await handleInputItems(get("action=items&purchaseVatRateId=8"))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("sends the bulk change by rate id, keeps the old field for an API without the catalogue, and takes neither a mix nor an unknown id", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ updated: 1 }));
    expect((await handleInputItems(post({ action: "item-purchase-vat-rate", body: { itemIds: [id], vatRateId: id } }))).status).toBe(200);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ itemIds: [id], vatRateId: id });
    expect((await handleInputItems(post({ action: "item-purchase-vat-rate", body: { itemIds: [id], vatRateId: "8" } }))).status).toBe(400);
    expect((await handleInputItems(post({ action: "item-purchase-vat-rate", body: { itemIds: [id], vatRateId: id, purchaseVatRate: "8" } }))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("passes the rate id of an item save through", async () => {
    setup([], "CooperativeOwner");
    const row = { id, code: "VT000001", name: "Phao", group: "Material", unit: "cái", units: [], onHand: 0, stockValue: 0, statusId: 101, status: "InUse", createdAt: "2026-11-28T00:00:00+07:00", rowVersion: "v", purchaseVatRateId: id, purchaseVatRateName: "8%", purchaseVatPercent: 8 };
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(row));
    expect((await handleInputItems(post({ action: "item-create", body: { name: "Phao", group: "Material", purchaseVatRateId: id } }))).status).toBe(200);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).purchaseVatRateId).toBe(id);
    expect((await handleInputItems(post({ action: "item-create", body: { name: "Phao", group: "Material", purchaseVatRateId: "10" } }))).status).toBe(400);
  });

  it("passes the rate of an item save through and keeps the body strict", async () => {
    setup([], "CooperativeOwner");
    const row = { id, code: "VT000001", name: "Phao", group: "Material", unit: "cái", units: [], onHand: 0, stockValue: 0, statusId: 101, status: "InUse", createdAt: "2026-11-28T00:00:00+07:00", rowVersion: "v", purchaseVatRate: "10" };
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(row));
    const body = { name: "Phao", group: "Material", purchaseVatRate: "10" };
    expect((await handleInputItems(post({ action: "item-create", body }))).status).toBe(200);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body)).purchaseVatRate).toBe("10");
    expect((await handleInputItems(post({ action: "item-create", body: { ...body, purchaseVatRate: "15" } }))).status).toBe(400);
  });
});
