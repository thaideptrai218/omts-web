import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEmployeeReadAdapter } from "./employee-read-adapter";
import { createBackendTransport } from "../backend/backend-transport";
import { backend, resolved, resolver, environment, employeeId, employeeDetailFixture, accessCanary } from "./__tests__/employee-fixture";
import { employeeListItemFixture, workingZoneId } from "@/features/employee-management/api/employee-wire.fixtures";

function request(search = "", init: RequestInit = {}) {
  return new Request(`${environment.OMTS_WEB_ORIGIN}/read-fixture${search}`, init);
}

describe("unmounted employee read adapter", () => {
  it("sends each fixed operation with only the checked session token", async () => {
    const transport = backend(); const resolve = resolver();
    transport.request.mockResolvedValueOnce({ status: "success", httpStatus: 200,
      data: { items: [employeeListItemFixture()], page: 2, pageSize: 20, total: 21 } })
      .mockResolvedValueOnce({ status: "success", httpStatus: 200, data: employeeDetailFixture() })
      .mockResolvedValueOnce({ status: "success", httpStatus: 200, data: [] });
    const adapter = createEmployeeReadAdapter(environment, { resolve, backend: transport });
    const input = request(`?page=2&statusId=401&zoneId=${workingZoneId}`, { headers: { Cookie: "browser-marker", Authorization: "Bearer ignored" } });
    expect(await adapter.list(input)).toMatchObject({ status: "loaded", page: { page: 2 } });
    expect(transport.request.mock.calls[0][0]).toEqual({ endpoint: "employeeList", accessToken: accessCanary,
      query: { page: 2, pageSize: 20, statusId: 401, zoneId: workingZoneId } });
    expect(await adapter.detail(request(), employeeId)).toMatchObject({ status: "loaded", employee: { id: employeeId } });
    expect(transport.request.mock.calls[1][0]).toEqual({ endpoint: "employeeRead", employeeId, accessToken: accessCanary });
    expect(await adapter.linkableAccounts(request())).toEqual({ status: "loaded", accounts: [] });
    expect(transport.request.mock.calls[2][0]).toEqual({ endpoint: "employeeLinkableAccounts", accessToken: accessCanary });
    expect(resolve).toHaveBeenCalledTimes(6);
    expect(transport.request.mock.calls[0][1]?.signal).toBe(input.signal);
  });

  it.each([
    { status: "anonymous" } as const, { status: "unavailable" } as const,
    { status: "invalid-session", reason: "revoked", clearCookie: true } as const,
    resolved({ phase: "password-change-required" }), resolved({ phase: "contact-verification-required" }),
    ...(["Staff", "Trader", "SystemAdministrator"] as const).map((subjectType) => resolved({ identity: { ...resolved().session.identity, subjectType } })),
  ])("never sends read requests for a denied/gated session case %#", async (session) => {
    const transport = backend(); const resolve = resolver().mockResolvedValue(session);
    const adapter = createEmployeeReadAdapter(environment, { resolve, backend: transport });
    expect((await adapter.list(request())).status).not.toBe("loaded");
    expect((await adapter.detail(request(), employeeId)).status).not.toBe("loaded");
    expect((await adapter.linkableAccounts(request())).status).not.toBe("loaded");
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("does not access the session or transport for invalid inputs/methods or an aborted request", async () => {
    const transport = backend(); const resolve = resolver();
    const adapter = createEmployeeReadAdapter(environment, { resolve, backend: transport });
    expect(await adapter.list(request("?page=0"))).toEqual({ status: "invalid-input" });
    expect(await adapter.detail(request(), "../accounts")).toEqual({ status: "invalid-input" });
    expect(await adapter.detail(request("?page=1"), employeeId)).toEqual({ status: "invalid-input" });
    expect(await adapter.linkableAccounts(request("?zoneId=" + workingZoneId))).toEqual({ status: "invalid-input" });
    expect(await adapter.list(request("", { method: "POST" }))).toEqual({ status: "rejected", httpStatus: 405 });
    const controller = new AbortController(); controller.abort();
    expect(await adapter.list(request("", { signal: controller.signal }))).toEqual({ status: "unavailable" });
    expect(resolve).not.toHaveBeenCalled(); expect(transport.request).not.toHaveBeenCalled();
  });

  it("does not call the resolver/fetch in mock or invalid configuration", async () => {
    const transport = backend(); const resolve = resolver();
    expect(await createEmployeeReadAdapter({ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" }, { resolve, backend: transport }).list(request()))
      .toEqual({ status: "disabled" });
    expect(await createEmployeeReadAdapter({}, { resolve, backend: transport }).list(request())).toEqual({ status: "unavailable" });
    expect(resolve).not.toHaveBeenCalled(); expect(transport.request).not.toHaveBeenCalled();
  });

  it("allows only typed/validated read parameters through the server transport", async () => {
    const fetcher = vi.fn<typeof fetch>();
    for (const input of [
      { endpoint: "employeeList", accessToken: accessCanary, query: { page: "1" } },
      { endpoint: "employeeList", accessToken: accessCanary, query: {}, body: {} },
      { endpoint: "employeeRead", accessToken: accessCanary, employeeId: "../accounts" },
      { endpoint: "employeeLinkableAccounts", accessToken: accessCanary, query: {} },
      { endpoint: "employeeRead", employeeId, url: "https://other.example.test" },
    ]) expect(await createBackendTransport(environment, fetcher).request(input)).toEqual({ status: "invalid-request" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
