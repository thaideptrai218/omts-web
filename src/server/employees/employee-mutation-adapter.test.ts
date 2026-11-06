import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createEmployeeMutationAdapter } from "./employee-mutation-adapter";
import { accessCanary, backend, employeeId, environment, putBody, request, resolved, resolver } from "./__tests__/employee-fixture";

const invalidCsrfRequests: RequestInit[] = [
  { headers: { Origin: "https://other.example.test" } },
  { headers: { "X-OMTS-Request": "" } },
  { headers: { "Sec-Fetch-Site": "cross-site" } },
];

describe("unmounted employee BFF adapter access/input boundary", () => {
  it.each([
    [{ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock", OMTS_WEB_ORIGIN: environment.OMTS_WEB_ORIGIN, OMTS_WEB_COOKIE_PROFILE: "https" }, "disabled"],
    [{}, "unavailable"],
  ])("does not resolve sessions or send when disabled/invalid case %#", async (env, status) => {
    const transport = backend(); const resolve = resolver();
    expect(await createEmployeeMutationAdapter(env, { resolve, backend: transport }).mutate(request(), employeeId)).toEqual({ status });
    expect(resolve).not.toHaveBeenCalled(); expect(transport.request).not.toHaveBeenCalled();
  });

  it.each(invalidCsrfRequests)("rejects invalid CSRF before session/token access case %#", async (init) => {
    const transport = backend(); const resolve = resolver();
    expect(await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request("DELETE", init), employeeId))
      .toEqual({ status: "rejected", httpStatus: 403 });
    expect(resolve).not.toHaveBeenCalled(); expect(transport.request).not.toHaveBeenCalled();
  });

  it.each([
    [() => request("DELETE", { method: "GET" }), 405],
    [() => request("PUT", { body: "{" }), 400],
    [() => request("PUT", { headers: { "Content-Type": "text/plain" } }), 415],
    [() => request("DELETE", { body: "{}" }), 413],
  ] as const)("rejects method/body violations before session access case %#", async (makeRequest, httpStatus) => {
    const transport = backend(); const resolve = resolver();
    expect(await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(makeRequest(), employeeId))
      .toEqual({ status: "rejected", httpStatus });
    expect(resolve).not.toHaveBeenCalled(); expect(transport.request).not.toHaveBeenCalled();
  });

  it("rejects an invalid route ID before reading the session", async () => {
    const transport = backend(); const resolve = resolver();
    expect(await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request(), "../accounts"))
      .toEqual({ status: "invalid-input" });
    expect(resolve).not.toHaveBeenCalled(); expect(transport.request).not.toHaveBeenCalled();
  });

  it.each([
    "", "?rowVersion=AAAAAAAA+/8=", "?rowVersion=AAAAAAAA%252B%252F8%253D",
    "?rowVersion=AAAAAAAA%2B%2F8%3D&rowVersion=AAAAAAAA%2B%2F8%3D",
    "?rowVersion=AAAAAAAA%2B%2F8%3D&url=https://other.example.test",
  ])("rejects missing/duplicate/invalid query case %#", async (query) => {
    const transport = backend(); const resolve = resolver();
    expect(await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request("DELETE", {}, query), employeeId))
      .toEqual({ status: "invalid-input" });
    expect(resolve).not.toHaveBeenCalled(); expect(transport.request).not.toHaveBeenCalled();
  });

  it.each([
    { status: "anonymous" }, { status: "invalid-session", reason: "revoked", clearCookie: true }, { status: "unavailable" },
    resolved({ phase: "password-change-required" }), resolved({ phase: "contact-verification-required" }),
  ] as const)("does not send for an unavailable/unauthenticated/onboarding session case %#", async (resolution) => {
    const transport = backend(); const resolve = resolver().mockResolvedValue(resolution);
    const result = await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request(), employeeId);
    expect(result.status).not.toBe("saved"); expect(transport.request).not.toHaveBeenCalled();
  });

  it.each(["Staff", "Trader", "SystemAdministrator"] as const)("denies %s despite browser-supplied credentials", async (subjectType) => {
    const transport = backend(); const identity = resolved().session.identity;
    const resolve = resolver().mockResolvedValue(resolved({ identity: { ...identity, subjectType } }));
    expect(await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(request("DELETE", {
      headers: { Authorization: `Bearer ${accessCanary}`, Cookie: "role=Owner" },
    }), employeeId)).toEqual({ status: "forbidden" });
    expect(transport.request).not.toHaveBeenCalled();
  });

  it("uses the checked server token only and returns a projected, credential-free result", async () => {
    const transport = backend(); const resolve = resolver();
    const browserToken = crypto.randomUUID();
    const input = request("DELETE", { headers: { Authorization: `Bearer ${browserToken}`, Cookie: "browser-session-marker" } });
    const result = await createEmployeeMutationAdapter(environment, { resolve, backend: transport }).mutate(input, employeeId);
    expect(transport.request).toHaveBeenCalledExactlyOnceWith({ endpoint: "employeeUnlink", employeeId,
      recordVersion: "AAAAAAAA+/8=", accessToken: accessCanary }, { signal: input.signal });
    expect(resolve).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: "saved", employee: { account: null } });
    expect(JSON.stringify(result)).not.toMatch(new RegExp(`${accessCanary}|${browserToken}|browser-session-marker|Saved`));
  });

  it("keeps a PUT with null accountId as PUT and validates its payload/query", async () => {
    const transport = backend(); const resolve = resolver();
    const adapter = createEmployeeMutationAdapter(environment, { resolve, backend: transport });
    await adapter.mutate(request("PUT", { body: JSON.stringify({ ...putBody(), accountId: null }) }), employeeId);
    expect(transport.request.mock.calls[0][0]).toMatchObject({ endpoint: "employeeUpdate", body: { accountId: null, rowVersion: "AAAAAAAA+/8=" } });
    expect(await adapter.mutate(request("PUT", {}, "?rowVersion=AAAAAAAA%2B%2F8%3D"), employeeId)).toEqual({ status: "invalid-input" });
    expect(await adapter.mutate(request("PUT", { body: JSON.stringify({ ...putBody(), status: "Left" }) }), employeeId)).toEqual({ status: "invalid-input" });
    expect(transport.request).toHaveBeenCalledTimes(1);
  });
});
