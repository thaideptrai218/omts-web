import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEmployeeReadAdapter } from "./employee-read-adapter";
import type { BackendTransportResult } from "../backend/backend-result";
import { backend, resolver, resolved, environment, employeeId, employeeDetailFixture, accessCanary } from "./__tests__/employee-fixture";

const request = (signal?: AbortSignal) => new Request(environment.OMTS_WEB_ORIGIN + "/read-fixture", { signal });
const success = (): BackendTransportResult => ({ status: "success", httpStatus: 200, data: employeeDetailFixture() });

describe("employee GET lifecycle", () => {
  it.each([
    { status: "anonymous" } as const,
    { status: "invalid-session", reason: "revoked", clearCookie: true } as const,
    resolved({ revision: "new-revision" }), resolved({ idHash: "b".repeat(64) }),
    resolved({ identity: { ...resolved().session.identity, accountId: employeeId } }),
    resolved({ identity: { ...resolved().session.identity, backendSessionId: employeeId } }),
    resolved({ identity: { ...resolved().session.identity, subjectType: "Staff" } }),
    resolved({ phase: "contact-verification-required" }),
  ])("discards data after session identity/phase changes case %#", async (current) => {
    const transport = backend(); transport.request.mockResolvedValue(success());
    const resolve = resolver().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(current);
    expect(await createEmployeeReadAdapter(environment, { resolve, backend: transport }).detail(request(), employeeId))
      .toEqual({ status: "session-changed" });
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("withholds a pending response if logout happens before it returns", async () => {
    let finish!: (value: BackendTransportResult) => void;
    const transport = backend();
    transport.request.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const resolve = resolver();
    const pending = createEmployeeReadAdapter(environment, { resolve, backend: transport }).detail(request(), employeeId);
    await vi.waitFor(() => expect(transport.request).toHaveBeenCalledTimes(1));
    resolve.mockResolvedValue({ status: "anonymous" });
    finish(success());
    expect(await pending).toEqual({ status: "session-changed" });
  });

  it("does not publish a nominal success after caller cancellation", async () => {
    const controller = new AbortController(); const transport = backend();
    transport.request.mockImplementationOnce(async () => { controller.abort(); return success(); });
    const input = request(controller.signal);
    expect(await createEmployeeReadAdapter(environment, { resolve: resolver(), backend: transport }).detail(input, employeeId))
      .toEqual({ status: "unavailable" });
    expect(transport.request.mock.calls[0][1]?.signal).toBe(input.signal);
  });

  it("does not mix two concurrent detail requests or maintain a shared last-result cache", async () => {
    const otherId = "122bb318-a72e-49aa-a8d7-a6169f889007";
    let first!: (value: BackendTransportResult) => void;
    const transport = backend();
    transport.request.mockImplementationOnce(() => new Promise((resolve) => { first = resolve; }))
      .mockResolvedValueOnce({ status: "success", httpStatus: 200, data: { ...employeeDetailFixture(), id: otherId } });
    const adapter = createEmployeeReadAdapter(environment, { resolve: resolver(), backend: transport });
    const pending = adapter.detail(request(), employeeId);
    await vi.waitFor(() => expect(transport.request).toHaveBeenCalledTimes(1));
    expect(await adapter.detail(request(), otherId)).toMatchObject({ status: "loaded", employee: { id: otherId } });
    first(success());
    expect(await pending).toMatchObject({ status: "loaded", employee: { id: employeeId } });
  });

  it.each([
    { status: "http-error", httpStatus: 401, code: "MSG19" },
    { status: "http-error", httpStatus: 403, code: "MSG02" },
    { status: "http-error", httpStatus: 404 }, { status: "timeout" }, { status: "unavailable" },
  ] satisfies BackendTransportResult[])("keeps transport failures redacted and does not retry case %#", async (failure) => {
    const transport = backend(); transport.request.mockResolvedValue(failure);
    const result = await createEmployeeReadAdapter(environment, { resolve: resolver(), backend: transport }).detail(request(), employeeId);
    expect(result.status).toBe("backend-failure"); expect(result).not.toHaveProperty("employee");
    expect(JSON.stringify(result)).not.toContain(accessCanary); expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("catches resolver/backend exceptions and rejects data when recheck is unavailable", async () => {
    const transport = backend(); const resolve = resolver().mockRejectedValueOnce(new Error(accessCanary));
    const adapter = createEmployeeReadAdapter(environment, { resolve, backend: transport });
    expect(await adapter.detail(request(), employeeId)).toEqual({ status: "unavailable" });
    expect(transport.request).not.toHaveBeenCalled();
    transport.request.mockRejectedValueOnce(new Error(accessCanary));
    expect((await adapter.detail(request(), employeeId)).status).toBe("backend-failure");
    transport.request.mockResolvedValue(success());
    resolve.mockResolvedValueOnce(resolved()).mockRejectedValueOnce(new Error(accessCanary));
    expect(await adapter.detail(request(), employeeId)).toEqual({ status: "unavailable" });
  });
});
