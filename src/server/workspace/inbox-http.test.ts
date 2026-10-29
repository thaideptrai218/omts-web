import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { handleInbox } from "./inbox-http";
import { resolved } from "../employees/__tests__/employee-fixture";
const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
function setup() {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8081"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3003"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev"); gateway.resolve.mockResolvedValue(resolved());
}
const request = (body: unknown, origin = "http://localhost:3003") => new Request("http://localhost:3003/api/inbox", { method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
it("projects only the signed-in caller's notification payload", async () => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ items: [{ id, type: "WaterAlert", title: "Cảnh báo", body: null, relatedRecordType: null, relatedRecordCode: null, createdAt: "2026-10-30T00:00:00Z", readAt: null, isMandatory: true, recipientAccountId: "hidden" }], total: 1, unreadCount: 1 }));
  const response = await handleInbox(new Request("http://localhost:3003/api/inbox?page=2")); expect(response.status).toBe(200); expect(JSON.stringify(await response.json())).not.toContain("recipientAccountId");
  expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8081/api/me/notifications?page=2&pageSize=20"); expect(response.headers.get("cache-control")).toContain("no-store");
});
it.each(["?page=1&page=2", "?page=0", "?accountId=other", "?page=NaN"])("refuses forged query %s", async (query) => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleInbox(new Request(`http://localhost:3003/api/inbox${query}`))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
it.each([{ action: "read", id }, { action: "read-all" }])("accepts bodyless upstream204 for a read command", async (body) => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 })); const response = await handleInbox(request(body));
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ status: "success", data: { saved: true } }); expect(fetcher).toHaveBeenCalledTimes(1); expect(fetcher.mock.calls[0][1]?.body).toBeUndefined();
});
it("rejects foreign-origin writes and injected recipient IDs", async () => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleInbox(request({ action: "read-all" }, "https://other.test"))).status).toBe(403);
  expect((await handleInbox(request({ action: "read-all", accountId: id }))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
it("drops even a successful write acknowledgement after session replacement", async () => {
  setup(); vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 })); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" }));
  expect((await handleInbox(request({ action: "read-all" }))).status).toBe(401);
});
it("returns404 from a backend without the new endpoint without inventing data", async () => {
  setup(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ title: "Not Found", status: 404 }, { status: 404 }));
  expect((await handleInbox(new Request("http://localhost:3003/api/inbox"))).status).toBe(404);
});
