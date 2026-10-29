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
