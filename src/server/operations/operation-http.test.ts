import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { handleOperationRequest, localFileTarget } from "./operation-http";
import { resolved } from "../employees/__tests__/employee-fixture";
import { ids, receiptFixture, waterFixture } from "@/features/operations/__tests__/fixtures";
import type { FunctionPermission } from "@/features/access/domain/function-permission";
function configure(subjectType = "CooperativeOwner", permissions: FunctionPermission[] = []) {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.resolve.mockResolvedValue(resolved());
  gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: permissions } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
const get = (query: string) => new Request(`http://localhost:3002/api/operations/water?${query}`);
describe("operations BFF authorization and evidence boundary", () => {
  it("requires CSRF on the newly approved sales writes before calling upstream", async () => {
    configure("Trader"); const fetcher = vi.spyOn(globalThis, "fetch");
    const request = new Request("http://localhost:3002/api/operations/purchase-requests", { method: "POST", headers: { Origin: "https://evil.test", "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify({ action: "submit", body: { productId: ids.item, requestedCages: 2, pickupDate: "2026-10-31", note: null, clientOperationId: ids.receipt } }) });
    expect((await handleOperationRequest(request, "purchase-requests")).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not let a Trader respond as Owner or choose an employee for leave", async () => {
    configure("Trader"); const fetcher = vi.spyOn(globalThis, "fetch");
    const post = (body: unknown) => new Request("http://localhost:3002/api/operations/purchase-requests", { method: "POST", headers: { Origin: "http://localhost:3002", "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify(body) });
    expect((await handleOperationRequest(post({ action: "respond", id: ids.receipt, body: { accept: false, acceptedCages: null, pickupDate: null, allowPayLater: false, note: "QA", rowVersion: "opaque" } }), "purchase-requests")).status).toBe(403);
    configure("Staff");
    expect((await handleOperationRequest(post({ action: "leave", body: { from: "2026-10-31", to: "2026-10-31", reason: "QA", clientOperationId: ids.receipt, employeeId: ids.item } }), "my-work")).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps bodyless workforce commands explicit and rechecks the session after 204", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" }));
    const request = new Request("http://localhost:3002/api/operations/workforce", { method: "POST", headers: { Origin: "http://localhost:3002", "Content-Type": "application/json", "X-OMTS-Request": "web" }, body: JSON.stringify({ action: "remove", id: ids.receipt, zoneId: ids.zone, body: {} }) });
    expect((await handleOperationRequest(request, "workforce")).status).toBe(401); expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "DELETE", body: undefined });
  });
  it("serves only the current Staff personal work endpoint, including a truthful unlinked result", async () => {
    configure("Staff"); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ employeeId: null, name: null, assignments: [], attendance: [], requests: [] }));
    expect((await handleOperationRequest(get("from=2026-10-01&to=2026-10-31"), "my-work")).status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe("http://127.0.0.1:8080/api/me/workforce?from=2026-10-01&to=2026-10-31");
    configure("Trader"); expect((await handleOperationRequest(get("from=2026-10-01&to=2026-10-31"), "my-work")).status).toBe(403);
  });
  it("keeps Trader reads on the personal endpoint and denies cooperative/all-product reads", async () => {
    configure("Trader"); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [], page: 1, pageSize: 20, total: 0 }));
    expect((await handleOperationRequest(get("action=mine"), "purchase-requests")).status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe("http://127.0.0.1:8080/api/me/purchase-requests?page=1&pageSize=20");
    expect((await handleOperationRequest(get("action=list"), "purchase-requests")).status).toBe(403);
    expect((await handleOperationRequest(get("action=all"), "sales-products")).status).toBe(403);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects a validly shaped purchase request returned with another ID", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: ids.otherZone, code: "YC-QA", productId: ids.item, productName: "Hàu QA", quantityUnit: "Cage", requestedCages: 2,
      requestedPickupDate: "2026-10-31", note: null, status: "AWAITING_RESPONSE", acceptedCages: null, acceptedPickupDate: null, allowPayLater: false, responseNote: null,
      respondedAt: null, cancelledAt: null, cancellationReason: null, createdAt: "2026-10-31T02:00:00+07:00", customerName: "QA", rowVersion: "opaque" }));
    expect((await handleOperationRequest(get(`action=detail&id=${ids.receipt}`), "purchase-requests")).status).toBe(502);
  });
  it("rejects workforce rows outside the current view-zone grants", async () => {
    configure("Staff", [{ functionCode: "WORK_ASSIGNMENTS", action: "View", scope: { kind: "zones", zoneIds: [ids.zone] }, dataScope: "AssignedZone" }]);
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ id: ids.receipt, employeeId: ids.item, employeeName: "QA outside", zoneId: ids.otherZone, raftId: null, raftCode: null, jobTypeId: null, job: "QA", date: "2026-10-31", checkedInAt: null, checkedOutAt: null }]));
    const response = await handleOperationRequest(get("day=2026-10-31"), "workforce");
    expect(response.status).toBe(502); expect(await response.text()).not.toContain("QA outside");
  });
  it("does not release new-module data after the session changes", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));
    expect((await handleOperationRequest(get(""), "sales-products")).status).toBe(401);
  });
  it("blocks wrong-origin multipart uploads before consuming the body or calling backend", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    const form = new FormData(); form.set("photo", new File(["image"], "qa.png", { type: "image/png" })); form.set("payload", JSON.stringify({ clientOperationId: ids.water }));
    const request = new Request(`http://localhost:3002/api/operations/water?action=recognize&zoneId=${ids.zone}`, { method: "POST", headers: { Origin: "https://evil.test", "X-OMTS-Request": "web" }, body: form });
    const reader = vi.spyOn(request.body!, "getReader");
    expect((await handleOperationRequest(request, "water")).status).toBe(403); expect(reader).not.toHaveBeenCalled(); expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires All zones for supplier payments and View as well as Export", async () => {
    const fetcher = vi.spyOn(globalThis, "fetch");
    configure("Staff", [{ functionCode: "SUPPLIER_PAYMENTS", action: "View", scope: { kind: "zones", zoneIds: [ids.zone] }, dataScope: "AssignedZone" }]);
    expect((await handleOperationRequest(get(""), "supplier-payments")).status).toBe(403);
    configure("Staff", [{ functionCode: "WATER_MEASUREMENTS", action: "Export", scope: { kind: "all-zones" }, dataScope: "AssignedZone" }]);
    expect((await handleOperationRequest(get(`action=export&zoneId=${ids.zone}`), "water")).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks the requested water zone before making a backend request", async () => {
    configure("Staff", [{ functionCode: "WATER_MEASUREMENTS", action: "View", scope: { kind: "zones", zoneIds: [ids.zone] }, dataScope: "AssignedZone" }]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleOperationRequest(get(`zoneId=${ids.otherZone}`), "water")).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not turn an OwnRecords grant into all records of a zone", async () => {
    configure("Staff", [{ functionCode: "WATER_MEASUREMENTS", action: "View", scope: { kind: "zones", zoneIds: [ids.zone] }, dataScope: "OwnRecords" }]);
    const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleOperationRequest(get(`zoneId=${ids.zone}`), "water")).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("replaces signed evidence URLs with permission-checked BFF paths", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(waterFixture({ photoUrl: "/api/files/local/water/qa.png?sig=private-signed-link&expires=123" })));
    const response = await handleOperationRequest(get(`action=detail&id=${ids.water}`), "water");
    const body = await response.text(); expect(response.status).toBe(200); expect(body).not.toContain("private-signed-link"); expect(body).toContain(`/api/operations/water?action=photo&id=${ids.water}`);
  });
  it("rechecks the session before returning an uploaded record or file", async () => {
    configure(); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "replaced" }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(waterFixture()));
    const response = await handleOperationRequest(get(`action=detail&id=${ids.water}`), "water");
    expect(response.status).toBe(401); expect(await response.text()).not.toContain("Vùng QA");
  });
  it("loads the owning receipt before reading local evidence and never sends bearer to the file request", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(receiptFixture({ invoicePhotoUrls: ["/api/files/local/invoices/qa.png?expires=123&sig=abc"] })))
      .mockResolvedValueOnce(new Response(new Uint8Array([1, 2, 3]), { headers: { "Content-Type": "image/png" } }));
    const response = await handleOperationRequest(get(`action=invoice&id=${ids.receipt}&index=0`), "purchase-receipts");
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/purchase-receipts/${ids.receipt}`);
    expect(fetcher.mock.calls[1][1]?.headers).toBeUndefined();
  });
  it.each(["https://evil.test/api/files/local/a", "//evil.test/api/files/local/a", "/api/me", "/api/files/local/../../me", "http://user@127.0.0.1:8080/api/files/local/a"])("rejects untrusted file target %s", (value) => {
    expect(localFileTarget(value, "http://127.0.0.1:8080")).toBeUndefined();
  });
});
