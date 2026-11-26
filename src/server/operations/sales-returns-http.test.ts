import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { handleOperationRequest } from "./operation-http";
import { resolved } from "../employees/__tests__/employee-fixture";
import type { FunctionPermission } from "@/features/access/domain/function-permission";

const invoice = "529ec3ce-af8f-42f7-a08f-4bab36ba7e62", lot = "529ec3ce-af8f-42f7-a08f-4bab36ba7e63", line = "529ec3ce-af8f-42f7-a08f-4bab36ba7e64";
function configure(subjectType = "CooperativeOwner", permissions: FunctionPermission[] = []) {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: permissions } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const grant = (action: FunctionPermission["action"]): FunctionPermission => ({ functionCode: "SALES_RETURNS", action, scope: { kind: "all-zones" }, dataScope: "AssignedZone" });
const read = (query: string) => handleOperationRequest(new Request(`http://localhost:3002/api/operations/sales-returns?${query}`), "sales-returns");
const post = (body: unknown) => handleOperationRequest(new Request("http://localhost:3002/api/operations/sales-returns", {
  method: "POST", headers: { Origin: "http://localhost:3002", "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify(body),
}), "sales-returns");
const body = { reason: "Hàu chết", rowVersion: "AAA", lines: [{ invoiceLineId: line, outcome: "ThrownAway" }] };
const problem = (extra: object, status = 409) => Response.json({ title: "MSG-GEN-09", status, ...extra }, { status, headers: { "Content-Type": "application/problem+json" } });

describe("the sales-returns door of the BFF", () => {
  it("lets an account that only views read the list but not preview or save a return, and calls nothing upstream for the refused ones", async () => {
    configure("Staff", [grant("View")]);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], total: 0, page: 1, pageSize: 15, totals: { value: 0, backForSaleKg: 0, discardedKg: 0 } }));
    expect((await read("action=list")).status).toBe(200);
    expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8080/api/sales-returns?page=1&pageSize=10");
    expect((await read(`action=preview&id=${invoice}`)).status).toBe(403);
    expect((await post({ action: "create", id: invoice, body })).status).toBe(403);
    expect((await post({ action: "cancel", id: invoice, body: { reason: "x", rowVersion: "AAA" } })).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("refuses an account without any right on sales returns", async () => {
    configure("Staff", []); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await read("action=list")).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("refuses a malformed request before it reaches the API", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await read("action=list&sort=customer")).status).toBe(400);
    expect((await post({ action: "create", id: invoice, body: { ...body, lines: [] } })).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("hands the questions of the API to the browser by name and numbers only, so the editor can ask them", async () => {
    configure();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(problem({ confirmationField: "thrownAwayLots", harvestLotId: lot, lotCode: "LTH000008", discardedKg: 20, remainingKg: 40, detail: "Lot LTH000008 is still for sale" }));
    const answer = await post({ action: "create", id: invoice, body });
    expect(answer.status).toBe(409);
    const json = await answer.json();
    expect(json).toMatchObject({ status: "rejected", invoiceConfirmation: { field: "thrownAwayLots", harvestLotId: lot, lotCode: "LTH000008", discardedKg: 20, remainingKg: 40 } });
    expect(JSON.stringify(json)).not.toContain("still for sale");
  });
  it("hands over the lots a cancellation would bring below zero, and nothing for an unknown question", async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(problem({ confirmationField: "confirmNegativeRemaining", lots: [{ lotCode: "LTH000007", remainingKg: -18 }] }));
    const cancel = { action: "cancel", id: invoice, body: { reason: "Nhập nhầm", rowVersion: "AAA" } };
    expect(await (await post(cancel)).json()).toMatchObject({ invoiceConfirmation: { field: "confirmNegativeRemaining", lots: [{ lotCode: "LTH000007", remainingKg: -18 }] } });
    fetcher.mockResolvedValueOnce(problem({ confirmationField: "somethingElse" }));
    expect(await (await post(cancel)).json()).not.toHaveProperty("invoiceConfirmation");
  });
  it("sends the save to the invoice and keeps the answer of the API, checked against the contract", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ nothing: true }, { status: 201 }));
    expect((await post({ action: "create", id: invoice, body })).status).toBe(502);
    expect(String(fetcher.mock.calls[0][0])).toBe(`http://127.0.0.1:8080/api/sales-invoices/${invoice}/sales-return`);
    expect(JSON.parse(String(fetcher.mock.calls[0][1]!.body))).toEqual(body);
  });
  it("names the exported file after the screen and the day", async () => {
    configure();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(new Uint8Array([80, 75]), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } }));
    const answer = await read("action=export&statusId=4101");
    expect(answer.status).toBe(200);
    expect(answer.headers.get("Content-Disposition")).toMatch(/^attachment; filename="tra-hang-ban-\d{8}\.xlsx"$/);
  });
});
