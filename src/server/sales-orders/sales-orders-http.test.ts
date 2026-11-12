import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved, environment } from "../employees/__tests__/employee-fixture";
import { handleSalesOrders } from "./sales-orders-http";

const id = "122bb318-a72e-49aa-a8d7-a6169f889007", other = "222bb318-a72e-49aa-a8d7-a6169f889008";
function setup(permissions: [string, string][], subject = "Staff") {
  for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType: subject }, permissions: { functionPermissions: permissions.map(([functionCode, action]) => ({ functionCode, action })) } } });
}
const get = (query: string) => new Request(`https://web.example.test/api/sales-orders?${query}`);
const post = (body: unknown, headers: Record<string, string> = {}) => new Request("https://web.example.test/api/sales-orders", {
  method: "POST", headers: { Origin: "https://web.example.test", "X-OMTS-Request": "web", "Content-Type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body),
});
const view = {
  id, code: "DH000001", statusId: 4101, status: "Draft", orderedAt: "2026-11-12T08:00:00+07:00", pickupAt: null, customer: { id, code: "KH000001", name: "An", phoneNumber: null },
  walkInCustomer: false, source: "Phone", receivedBy: { id, name: "Chủ" }, createdBy: { id, name: "Chủ" }, note: null, subtotal: 120000, discount: 0, discountDecidedByOwner: false, total: 120000,
  invoicedTotal: 0, customerPaid: 0, advanceLeft: 0, advanceReserved: false, lines: [], progress: [], advances: [], invoices: [], harvestPlans: [], purchaseRequest: null, allowedActions: ["Edit"],
  createdAt: "2026-11-12T08:00:00+07:00", completedAt: null, completedManually: false, cancelledAt: null, cancelReason: null, rowVersion: "v1",
};
const body = { code: null, customerId: id, walkInCustomer: false, source: "Phone", discount: 0, lines: [{ productId: id, unitId: id, quantity: 2, unitPrice: 60000 }] };
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("sales orders BFF", () => {
  it("forwards only the filters of the list, repeating the statuses, and refuses a malformed value before the API", async () => {
    setup([["SALES_ORDERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 15, total: 0, summary: { total: 0, invoiced: 0, customerPaid: 0 } }));
    expect((await handleSalesOrders(get("action=orders&statusIds=4101,4102&source=AtPort&from=2026-11-01&sortBy=code&sortDir=desc&evil=1&pageSize=15"))).status).toBe(200);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.pathname).toBe("/api/sales-orders");
    expect(url.searchParams.getAll("statusIds")).toEqual(["4101", "4102"]);
    expect(url.searchParams.get("source")).toBe("AtPort");
    expect(url.searchParams.has("evil")).toBe(false);
    for (const bad of ["statusIds=9999", "source=Fax", "from=yesterday", "action=order", "action=order&id=nope", "action=nothing", "action=order-by-code&code=a%20b"]) expect((await handleSalesOrders(get(bad))).status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("reads one order by id and by code and checks the answer names the same record", async () => {
    setup([["SALES_ORDERS", "View"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(view)).mockResolvedValueOnce(Response.json(view)).mockResolvedValueOnce(Response.json({ ...view, id: other }));
    expect((await (await handleSalesOrders(get(`action=order&id=${id}`))).json()).data).toMatchObject({ code: "DH000001" });
    expect((await handleSalesOrders(get("action=order-by-code&code=DH000001"))).status).toBe(200);
    expect(String(fetcher.mock.calls[1][0])).toContain("/api/sales-orders/by-code/DH000001");
    expect((await handleSalesOrders(get(`action=order&id=${id}`))).status).toBe(502);
  });

  it("keeps each action to the permission it needs and the request draft to the Owner", async () => {
    setup([["SALES_ORDERS", "View"], ["SALES_ORDERS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleSalesOrders(get("action=orders-export"))).status).toBe(403);
    expect((await handleSalesOrders(get(`action=order-request-draft&id=${id}`))).status).toBe(403);
    expect((await handleSalesOrders(post({ action: "order-cancel", id, body: { reason: "x" } }))).status).toBe(403);
    expect((await handleSalesOrders(post({ action: "order-update", id, body: { ...body, rowVersion: "v" } }))).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    setup([], "Trader");
    expect((await handleSalesOrders(get("action=orders"))).status).toBe(403);
  });

  it("sends the advance with an update and hands the saved order and its QR on", async () => {
    setup([["SALES_ORDERS", "Edit"]]);
    const advance = { amount: 20000, method: "VietQr", cashAccountId: id };
    const qr = { payload: "000201", bankBin: "970436", bankName: "Vietcombank", accountNumber: "0011", accountHolderName: "HTX", amount: 20000, content: "PT000001" };
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ order: view, message: "ok", messageCode: "MSG-GEN-05", advanceQr: qr }));
    const answer = await handleSalesOrders(post({ action: "order-update", id, body: { ...body, advance, rowVersion: "v1" } }));
    expect(answer.status).toBe(200);
    expect((await answer.json()).data).toMatchObject({ order: { code: "DH000001" }, advanceQr: { content: "PT000001" } });
    expect(String(fetcher.mock.calls[0][0])).toContain(`/api/sales-orders/${id}`);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({ advance, rowVersion: "v1" });
    expect((await handleSalesOrders(post({ action: "order-update", id, body: { ...body, zoneId: id, rowVersion: "v1" } }))).status).toBe(400);
  });

  it("sends a save to the API as JSON and hands the saved order on", async () => {
    setup([["SALES_ORDERS", "Create"]]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ order: view, message: "ok", messageCode: "MSG-GEN-05" }, { status: 201 }));
    const answer = await handleSalesOrders(post({ action: "order-create", body }));
    expect(answer.status).toBe(200);
    expect((await answer.json()).data.order).toMatchObject({ id, code: "DH000001" });
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify(body) });
    expect(String(fetcher.mock.calls[0][0])).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/api\/sales-orders$/);
    expect((await handleSalesOrders(post({ action: "order-create", body: { ...body, lines: [] } }))).status).toBe(400);
    expect((await handleSalesOrders(post({ action: "order-create", body: { ...body, extra: 1 } }))).status).toBe(400);
  });

  it("passes the question of the API on, with the code and the named flag", async () => {
    setup([["SALES_ORDERS", "Create"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ code: "MSG-SALE-10", confirmationField: "lines[0].priceDecidedByOwner", lineNumber: 1, message: "ask" }, { status: 409 }));
    const answer = await handleSalesOrders(post({ action: "order-create", body }));
    expect(answer.status).toBe(409);
    expect(await answer.json()).toMatchObject({ status: "rejected", invoiceConfirmation: { field: "lines[0].priceDecidedByOwner", lineNumber: 1 } });
  });

  it("answers 502 when the API answer does not match the contract", async () => {
    setup([["SALES_ORDERS", "View"]]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ ...view, lines: "none" }));
    expect((await handleSalesOrders(get(`action=order&id=${id}`))).status).toBe(502);
  });

  it("refuses a foreign origin and a body over 64 KB before the API", async () => {
    setup([], "CooperativeOwner");
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleSalesOrders(post({ action: "order-create", body }, { Origin: "https://evil.example.test" }))).status).toBeGreaterThanOrEqual(400);
    expect((await handleSalesOrders(post(JSON.stringify({ action: "order-create", body: { ...body, note: "x".repeat(70_000) } })))).status).toBeGreaterThanOrEqual(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
