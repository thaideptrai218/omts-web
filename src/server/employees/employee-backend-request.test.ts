import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prepareBackendRequest, MAX_REQUEST_BYTES } from "../backend/backend-request";
import { resolveBackendEndpoint } from "../backend/backend-endpoint";
import { createBackendTransport } from "../backend/backend-transport";
import { parseServerBackendConfig } from "../config/backend-config";
import { accessCanary, employeeId, environment, putBody } from "./__tests__/employee-fixture";

const unlink = () => ({ endpoint: "employeeUnlink", employeeId, recordVersion: "AAAAAAAA+/8=", accessToken: accessCanary });

describe("employee server target and transport preparation", () => {
  it("prepares a DELETE with private bearer and raw immutable routing parameters", () => {
    const input = unlink();
    const prepared = prepareBackendRequest(input);
    expect(prepared).toMatchObject({
      endpoint: "employeeUnlink", headers: { Authorization: `Bearer ${accessCanary}`, Accept: "application/json" },
      parameters: { employeeId, recordVersion: "AAAAAAAA+/8=" },
    });
    expect(prepared?.body).toBeUndefined();
    expect(prepared?.headers).not.toHaveProperty("Content-Type");
    expect(Object.isFrozen(prepared?.parameters)).toBe(true);
    input.recordVersion = "AAAAAAAB+/8=";
    expect(prepared?.parameters?.recordVersion).toBe("AAAAAAAA+/8=");
  });

  it("resolves only the GUID/validated version within the configured origin", () => {
    const config = parseServerBackendConfig(environment);
    if (config.status !== "valid") throw new Error("Expected fixture config");
    expect(resolveBackendEndpoint(config.config, "employeeUnlink", { employeeId, recordVersion: "AAAAAAAA+/8=" }))
      .toEqual({ status: "resolved", target: {
        method: "DELETE", url: `${environment.OMTS_API_BASE_URL}/api/employees/${employeeId}/account?rowVersion=AAAAAAAA%2B%2F8%3D`,
      } });
    expect(resolveBackendEndpoint(config.config, "employeeUpdate", { employeeId }))
      .toMatchObject({ status: "resolved", target: { method: "PUT", url: `${environment.OMTS_API_BASE_URL}/api/employees/${employeeId}` } });
    for (const parameters of [undefined, {}, { employeeId: "../accounts" }, { employeeId, url: "https://other.example.test" }]) {
      expect(resolveBackendEndpoint(config.config, "employeeUpdate", parameters)).toEqual({ status: "invalid-target" });
    }
    expect(resolveBackendEndpoint(config.config, "identity", { employeeId })).toEqual({ status: "invalid-target" });
  });

  it.each([
    { ...unlink(), accessToken: undefined }, { ...unlink(), accessToken: "bad\r\nheader" },
    { ...unlink(), employeeId: "../accounts" }, { ...unlink(), recordVersion: "AAAAAAAA%2B%2F8%3D" },
    { ...unlink(), recordVersion: undefined }, { ...unlink(), url: "https://other.example.test" },
    { ...unlink(), body: {} }, { ...unlink(), headers: { Cookie: "browser-only" } },
    { endpoint: "employeeUpdate", employeeId, accessToken: accessCanary, body: { status: "Left" } },
  ])("rejects incompatible server requests before fetch case %#", async (input) => {
    const fetcher = vi.fn<typeof fetch>();
    expect(prepareBackendRequest(input)).toBeUndefined();
    expect(await createBackendTransport(environment, fetcher).request(input)).toEqual({ status: "invalid-request" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("applies the shared request budget and preserves exact PUT serialization", async () => {
    const body = putBody();
    const prepared = prepareBackendRequest({ endpoint: "employeeUpdate", employeeId, accessToken: accessCanary, body });
    expect(prepared?.body).toBe(JSON.stringify(body));
    expect(prepared?.parameters).toEqual({ employeeId });
    const oversized = { ...body, workingZoneIds: Array.from({ length: MAX_REQUEST_BYTES }, () => employeeId) };
    expect(prepareBackendRequest({ endpoint: "employeeUpdate", employeeId, accessToken: accessCanary, body: oversized })).toBeUndefined();
  });

  it("does not send in mock mode or retry/refresh after upstream errors", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ code: "MSG06", detail: accessCanary }, { status: 409 }));
    expect(await createBackendTransport({ NODE_ENV: "test", OMTS_DATA_SOURCE: "mock" }, fetcher).request(unlink()))
      .toEqual({ status: "disabled" });
    expect(fetcher).not.toHaveBeenCalled();
    const result = await createBackendTransport(environment, fetcher).request(unlink());
    expect(result).toMatchObject({ status: "http-error", httpStatus: 409, code: "MSG06" });
    expect(JSON.stringify(result)).not.toContain(accessCanary);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, init] = fetcher.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("rowVersion")).toBe("AAAAAAAA+/8=");
    expect(init).toMatchObject({ method: "DELETE", credentials: "omit", redirect: "error", cache: "no-store" });
    expect(init?.headers).not.toHaveProperty("Cookie");
  });
});
