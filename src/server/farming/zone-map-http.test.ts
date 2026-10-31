import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { handleZoneMap } from "./zone-map-http";
import { mapPointUrl } from "@/features/farming-api/zone-map-contract";
const id = "11111111-1111-4111-8111-111111111111";
const fixture = () => [{ id, code: "Z1", name: "Vùng 1", latitude: 0, longitude: 0, statusId: 101, status: "In Use",
  rafts: [{ id, code: "R1", latitude: null, longitude: null, secret: "hidden" }], secret: "hidden" }];
function configure(subjectType: "CooperativeOwner" | "Staff" | "Trader" = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  gateway.resolve.mockResolvedValue(resolved({ identity: { ...resolved().session.identity, subjectType } }));
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });
describe("zone position read", () => {
  it.each(["CooperativeOwner", "Staff"] as const)("projects fixed scoped backend response for %s", async (subject) => {
    configure(subject); const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(fixture()));
    const response = await handleZoneMap(new Request("http://localhost:3002/api/zone-map?includeDiscontinued=true"));
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toContain("no-store");
    const value = await response.json(); expect(value.data[0].rafts[0].code).toBe("R1"); expect(JSON.stringify(value)).not.toContain("secret");
    expect(String(fetcher.mock.calls[0][0])).toBe("http://127.0.0.1:8080/api/zones/map?includeDiscontinued=true");
  });
  it.each(["?includeDiscontinued=true&includeDiscontinued=false", "?includeDiscontinued=1", "?zoneId=other", "?url=https://example.test"])("rejects query %s before fetch", async (query) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleZoneMap(new Request(`http://localhost:3002/api/zone-map${query}`))).status).toBe(400); expect(fetcher).not.toHaveBeenCalled();
  });
  it("denies Trader without fetching positions", async () => {
    configure("Trader"); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleZoneMap(new Request("http://localhost:3002/api/zone-map"))).status).toBe(403); expect(fetcher).not.toHaveBeenCalled();
  });
  it("drops positions after a session revision changes", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(fixture()));
    gateway.resolve.mockResolvedValueOnce(resolved()).mockResolvedValueOnce(resolved({ revision: "changed" }));
    expect((await handleZoneMap(new Request("http://localhost:3002/api/zone-map"))).status).toBe(401);
  });
  it("rejects invalid backend coordinates", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([{ ...fixture()[0], latitude: 100 }]));
    expect((await handleZoneMap(new Request("http://localhost:3002/api/zone-map"))).status).toBe(502);
  });
  it("preserves valid zero coordinates and does not invent missing points", () => {
    expect(mapPointUrl({ latitude: 0, longitude: 0 })).toContain("query=0%2C0");
    expect(mapPointUrl({ latitude: null, longitude: 0 })).toBeUndefined();
  });
});
