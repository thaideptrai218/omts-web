import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prepareBackendRequest } from "../backend/backend-request";
import { resolveBackendEndpoint } from "../backend/backend-endpoint";
import { createBackendTransport } from "../backend/backend-transport";
import { parseServerBackendConfig } from "../config/backend-config";
import { accessCanary, employeeId, environment, putBody } from "./__tests__/employee-fixture";
const update = () => ({ endpoint: "employeeUpdate", employeeId, body: putBody(), accessToken: accessCanary });
describe("employee server target and transport preparation", () => {
  it("prepares PUT with only server bearer, exact body and validated identity", () => {
    const input = update(); const prepared = prepareBackendRequest(input);
    expect(prepared).toMatchObject({ endpoint: "employeeUpdate", headers: { Authorization: `Bearer ${accessCanary}`, Accept: "application/json", "Content-Type": "application/json" }, parameters: { employeeId }, body: JSON.stringify(input.body) });
    expect(Object.isFrozen(prepared?.parameters)).toBe(true);
    const config = parseServerBackendConfig(environment); if (config.status !== "valid") throw new Error("fixture config");
    expect(resolveBackendEndpoint(config.config, "employeeUpdate", { employeeId })).toMatchObject({ status: "resolved", target: { method: "PUT", url: `${environment.OMTS_API_BASE_URL}/api/employees/${employeeId}` } });
  });
  it("refuses removed unlink routing", () => {
    const config = parseServerBackendConfig(environment); if (config.status !== "valid") throw new Error("fixture config");
    expect(resolveBackendEndpoint(config.config, "employeeUnlink", { employeeId, recordVersion: "AAAAAAAA+/8=" })).toEqual({ status: "invalid-target" });
  });
  it.each([{ accessToken: undefined }, { accessToken: "bad\r\nheader" }, { employeeId: "../accounts" }, { body: { status: "Left" } }, { headers: { Cookie: "browser-only" } }, { url: "https://other.example.test" }])("rejects incompatible server requests before fetch %j", async change => {
    const input = { ...update(), ...change }; const fetcher = vi.fn<typeof fetch>();
    expect(prepareBackendRequest(input)).toBeUndefined(); expect(await createBackendTransport(environment, fetcher).request(input)).toEqual({ status: "invalid-request" }); expect(fetcher).not.toHaveBeenCalled();
  });
  it("does not send in mock mode, follow redirects, or retry MSG06", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "MSG06", detail: accessCanary }, { status: 409 }));
    expect(await createBackendTransport({ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" }, fetcher).request(update())).toEqual({ status: "disabled" }); expect(fetcher).not.toHaveBeenCalled();
    const result = await createBackendTransport(environment, fetcher).request(update()); expect(result).toMatchObject({ status: "http-error", httpStatus: 409, code: "MSG06" }); expect(JSON.stringify(result)).not.toContain(accessCanary); expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]).toMatchObject({ method: "PUT", credentials: "omit", redirect: "error", cache: "no-store" });
  });
});
