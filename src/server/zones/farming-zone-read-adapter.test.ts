import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createFarmingZoneReadAdapter } from "./farming-zone-read-adapter";
import { accessCanary, environment, resolved, resolver } from "../employees/__tests__/employee-fixture";
import type { BackendTransportResult } from "../backend/backend-result";
import type { BackendRequest } from "../backend/backend-request";
import type { BackendRequestOptions } from "../backend/backend-transport";

const zone = {
  id: "529ec3ce-af8f-42f7-a08f-4bab36ba7e62",
  code: "KV-01", name: "Khu Đông", location: null, area: 3,
  statusId: 101, status: "Đang dùng", inUseRaftCount: 2, licenseState: null,
};

function request(query = "", init: RequestInit = {}) {
  return new Request(`${environment.OMTS_WEB_ORIGIN}/fixture/zones${query}`, init);
}

function dependencies() {
  return {
    resolve: resolver(),
    backend: { request: vi.fn<(input: BackendRequest, options?: BackendRequestOptions) => Promise<BackendTransportResult>>()
      .mockResolvedValue({ status: "success", httpStatus: 200,
        data: { items: [zone], page: 1, pageSize: 20, total: 1 } }) },
  };
}

describe("unmounted farming zone read adapter", () => {
  it("reads with the server session token and rechecks that session before publishing", async () => {
    const deps = dependencies();
    const input = request("?search=Khu+%C4%90%C3%B4ng&page=1&pageSize=20", {
      headers: { Cookie: "browser-marker", Authorization: "Bearer browser-token" },
    });
    const result = await createFarmingZoneReadAdapter(environment, deps).list(input);
    expect(result).toMatchObject({ status: "loaded", page: { items: [{ id: zone.id }], total: 1 } });
    expect(deps.backend.request).toHaveBeenCalledWith({
      endpoint: "farmingZoneList", accessToken: accessCanary,
      query: { search: "Khu Đông", page: 1, pageSize: 20 },
    }, { signal: input.signal });
    expect(deps.resolve).toHaveBeenCalledTimes(2);
  });

  it("does not publish a prior account's response after session replacement", async () => {
    const deps = dependencies();
    deps.resolve.mockResolvedValueOnce(resolved())
      .mockResolvedValueOnce(resolved({ revision: "new-revision" }));
    expect(await createFarmingZoneReadAdapter(environment, deps).list(request()))
      .toEqual({ status: "session-changed" });
  });

  it("rejects invalid queries, gated sessions and wrong success payloads", async () => {
    const deps = dependencies();
    const adapter = createFarmingZoneReadAdapter(environment, deps);
    expect(await adapter.list(request("?page=1&page=2"))).toEqual({ status: "invalid-input" });
    expect(await adapter.list(request("?statusId=301"))).toEqual({ status: "invalid-input" });
    expect(deps.resolve).not.toHaveBeenCalled();
    deps.resolve.mockResolvedValueOnce(resolved({ phase: "password-change-required" }));
    expect((await adapter.list(request())).status).not.toBe("loaded");
    expect(deps.backend.request).not.toHaveBeenCalled();
    deps.resolve.mockResolvedValue(resolved());
    deps.backend.request.mockResolvedValueOnce({ status: "success", httpStatus: 200,
      data: { items: [{ ...zone, inUseRaftCount: -1 }], page: 1, pageSize: 20, total: 1 } });
    expect(await adapter.list(request())).toEqual({ status: "invalid-response" });
  });
});
