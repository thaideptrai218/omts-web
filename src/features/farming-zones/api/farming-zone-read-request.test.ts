import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prepareFarmingZoneListRequest } from "./farming-zone-read-request";
import { prepareBackendRequest } from "@/server/backend/backend-request";
import { resolveBackendEndpoint } from "@/server/backend/backend-endpoint";

const config = { source: "api" as const, origin: "https://backend.example.test", timeoutMs: 5000 };

describe("farming zone list transport boundary", () => {
  it("serializes a fixed GET route and an encoded search", () => {
    const query = { search: "Khu Đông & Nam", statusId: 101 as const, page: 2, pageSize: 20 };
    const prepared = prepareBackendRequest({ endpoint: "farmingZoneList", accessToken: "fake", query });
    expect(prepared).toMatchObject({
      endpoint: "farmingZoneList",
      headers: { Accept: "application/json", Authorization: "Bearer fake" },
      parameters: { query },
    });
    expect(prepared?.body).toBeUndefined();
    expect(resolveBackendEndpoint(config, prepared?.endpoint, prepared?.parameters)).toEqual({
      status: "resolved",
      target: {
        url: "https://backend.example.test/api/zones?search=Khu+%C4%90%C3%B4ng+%26+Nam&statusId=101&page=2&pageSize=20",
        method: "GET",
      },
    });
  });

  it("rejects invalid status, paging and transport overrides", () => {
    for (const query of [
      { statusId: 301, page: 1, pageSize: 20 },
      { page: 0, pageSize: 20 },
      { page: 1, pageSize: 101 },
      { page: 1, pageSize: 20, url: "https://other.example" },
    ]) {
      expect(prepareFarmingZoneListRequest(query)).toEqual({ status: "invalid-input" });
      expect(prepareBackendRequest({ endpoint: "farmingZoneList", accessToken: "fake", query })).toBeUndefined();
    }
    expect(prepareBackendRequest({ endpoint: "farmingZoneList", accessToken: "fake", query: { page: 1, pageSize: 20 }, method: "POST" })).toBeUndefined();
  });
});
