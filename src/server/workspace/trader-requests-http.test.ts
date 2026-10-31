import { afterEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { handleTraderRequests } from "./trader-requests-http";
import { resolved } from "../employees/__tests__/employee-fixture";
const id = "122bb318-a72e-49aa-a8d7-a6169f889007";
const row = (status = "PENDING_APPROVAL") => ({ accountId: id, displayName: "QA", phoneNumber: "0900000090", note: null, requestedAt: null, status, rejectionReason: null });
function setup(subjectType: "CooperativeOwner" | "Staff" | "Trader" = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8081"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://127.0.0.1:3003"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev"); gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } }));
}
const read = (query = "") => new Request(`http://127.0.0.1:3003/api/trader-requests${query}`);
const write = (body: unknown, origin = "http://127.0.0.1:3003") => new Request("http://127.0.0.1:3003/api/trader-requests", { method: "POST", headers: { Origin: origin, "X-OMTS-Request": "web", "Content-Type": "application/json" }, body: JSON.stringify(body) });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
it("projects the fixed Owner-only list and strips unknown fields", async () => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ ...row("REJECTED"), secret: "hidden" }]));
  const response = await handleTraderRequests(read("?rejected=true")); expect(response.status).toBe(200); expect(JSON.stringify(await response.json())).not.toContain("secret");
  expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8081/api/trader-requests?rejected=true"); expect(response.headers.get("cache-control")).toContain("no-store");
});
it.each(["Staff", "Trader"] as const)("refuses %s before calling backend", async (subject) => {
  setup(subject); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleTraderRequests(read())).status).toBe(403); expect((await handleTraderRequests(write({ action: "approve", accountId: id, confirmed: true }))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
});
it.each(["?rejected=1", "?rejected=true&rejected=false", "?accountId=other"])("rejects query %s", async (query) => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleTraderRequests(read(query))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
it.each([{ action: "approve", accountId: id, confirmed: false }, { action: "reject", accountId: id, confirmed: true, reason: " " }, { action: "reject", accountId: id, confirmed: true, reason: "a".repeat(1001) }])("rejects unconfirmed/invalid decisions", async (body) => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleTraderRequests(write(body))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
});
it("forwards only a trimmed rejection reason and accepts the expected status", async () => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(row("REJECTED")));
  expect((await handleTraderRequests(write({ action: "reject", accountId: id, confirmed: true, reason: " QA reason " }))).status).toBe(200);
  expect(fetcher.mock.calls[0][1]?.body).toBe(JSON.stringify({ reason: "QA reason" }));
});
it("does not accept a wrong ID or decision status as success", async () => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(row("REJECTED")));
  const body = { action: "approve", accountId: id, confirmed: true }; expect((await handleTraderRequests(write(body))).status).toBe(502);
  fetcher.mockResolvedValue(Response.json({ ...row("ACTIVE"), accountId: "11111111-1111-4111-8111-111111111111" })); expect((await handleTraderRequests(write(body))).status).toBe(502);
});
it("rejects foreign-origin writes", async () => {
  setup(); const fetcher = vi.spyOn(globalThis, "fetch"); expect((await handleTraderRequests(write({ action: "approve", accountId: id, confirmed: true }, "https://other.test"))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
});
it("discards a decision acknowledgement when the session changes", async () => {
  setup(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(row("ACTIVE"))); gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" }));
  expect((await handleTraderRequests(write({ action: "approve", accountId: id, confirmed: true }))).status).toBe(401);
});
