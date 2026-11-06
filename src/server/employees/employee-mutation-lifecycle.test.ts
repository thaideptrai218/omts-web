import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEmployeeMutationAdapter } from "./employee-mutation-adapter";
import type { BackendTransportResult } from "../backend/backend-result";
import { accessCanary, backend, employeeDetailFixture, employeeId, environment, request, resolved, resolver } from "./__tests__/employee-fixture";

describe("employee mutation lifecycle and redacted failure", () => {
  it.each([
    { status: "anonymous" } as const,
    { status: "invalid-session", reason: "revoked", clearCookie: true } as const,
    resolved({ revision: "revision-2" }), resolved({ idHash: "b".repeat(64) }),
    resolved({ identity: { ...resolved().session.identity, accountId: employeeId } }),
    resolved({ identity: { ...resolved().session.identity, backendSessionId: employeeId } }),
    resolved({ phase: "password-change-required" }),
    resolved({ identity: { ...resolved().session.identity, subjectType: "Staff" } }),
  ])("does not publish old data or clear a newer cookie after session change case %#", async (current) => {
    const transport = backend();
    const resolve = resolver().mockResolvedValueOnce(resolved()).mockResolvedValueOnce(current);
    const result = await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request(), employeeId);
    expect(result).toEqual({ status: "session-changed" });
    expect(result).not.toHaveProperty("employee"); expect(result).not.toHaveProperty("clearCookie");
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed post-write session recheck distinct without publishing data", async () => {
    const transport = backend();
    const resolve = resolver().mockResolvedValueOnce(resolved()).mockRejectedValueOnce(new Error(accessCanary));
    expect(await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request(), employeeId))
      .toEqual({ status: "unavailable" });
    expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("does not fabricate conflict metadata or retry MSG06", async () => {
    const transport = backend();
    transport.request.mockResolvedValue({ status: "http-error", httpStatus: 409, code: "MSG06" });
    const result = await createEmployeeMutationAdapter(environment, { resolve: resolver(), backend: transport }).mutate(request(), employeeId);
    expect(result).toEqual({ status: "contract-blocked", reason: "conflict-metadata", code: "MSG06" });
    expect(result).not.toHaveProperty("message"); expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it.each([
    { status: "http-error", httpStatus: 401, code: "MSG19" },
    { status: "http-error", httpStatus: 403, code: "MSG02" },
    { status: "http-error", httpStatus: 409, code: "MSG24" },
    { status: "timeout" }, { status: "unavailable" }, { status: "invalid-response" },
  ] satisfies BackendTransportResult[])("keeps failure internal/redacted without retry case %#", async (failure) => {
    const transport = backend(); transport.request.mockResolvedValue(failure);
    const result = await createEmployeeMutationAdapter(environment, { resolve: resolver(), backend: transport }).mutate(request(), employeeId);
    expect(result.status).toBe("backend-failure");
    expect(result).not.toHaveProperty("employee"); expect(result).not.toHaveProperty("message");
    expect(JSON.stringify(result)).not.toContain(accessCanary); expect(transport.request).toHaveBeenCalledTimes(1);
  });

  it("catches thrown backend errors without returning causes or logging them", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const transport = backend().request.mockRejectedValue(new Error(accessCanary, { cause: accessCanary }));
      const result = await createEmployeeMutationAdapter(environment, { resolve: resolver(), backend: { request: transport } }).mutate(request(), employeeId);
      expect(result.status).toBe("backend-failure"); expect(JSON.stringify(result)).not.toContain(accessCanary);
      expect(log).not.toHaveBeenCalled(); expect(transport).toHaveBeenCalledTimes(1);
    } finally { log.mockRestore(); }
  });

  it("rejects 204, a wrong employee and a DELETE result that still has a link", async () => {
    const transport = backend();
    const adapter = createEmployeeMutationAdapter(environment, { resolve: resolver(), backend: transport });
    transport.request.mockResolvedValueOnce({ status: "success", httpStatus: 204, data: undefined });
    expect(await adapter.mutate(request(), employeeId)).toEqual({ status: "unexpected-status" });
    transport.request.mockResolvedValueOnce({ status: "success", httpStatus: 200, data: { employee: employeeDetailFixture(), message: "Saved" } });
    expect(await adapter.mutate(request(), employeeId)).toEqual({ status: "invalid-response" });
    transport.request.mockResolvedValueOnce({ status: "success", httpStatus: 200,
      data: { employee: { ...employeeDetailFixture(), id: resolved().session.identity.accountId, account: null }, message: "Saved" } });
    expect(await adapter.mutate(request(), employeeId)).toEqual({ status: "employee-mismatch" });
  });

  it("propagates abort and discards even a nominal success after cancellation", async () => {
    const transport = backend(); const controller = new AbortController();
    transport.request.mockImplementationOnce(async () => {
      controller.abort(); return { status: "success", httpStatus: 200, data: { employee: { ...employeeDetailFixture(), account: null }, message: "Saved" } };
    });
    const input = request("DELETE", { signal: controller.signal });
    const adapter = createEmployeeMutationAdapter(environment, { resolve: resolver(), backend: transport });
    expect(await adapter.mutate(input, employeeId)).toEqual({ status: "unavailable" });
    expect(transport.request.mock.calls[0][1]?.signal).toBe(input.signal);
    expect(transport.request).toHaveBeenCalledTimes(1);
    expect(await adapter.mutate(request("DELETE", { signal: controller.signal }), employeeId)).toEqual({ status: "unavailable" });
    expect(transport.request).toHaveBeenCalledTimes(1);
  });
});
