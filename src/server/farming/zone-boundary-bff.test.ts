import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const gateway = vi.hoisted(() => ({ mode: "api", resolve: vi.fn(), application: vi.fn() }));
vi.mock("../auth/session-gateway.instance", () => ({ getSessionGateway: () => gateway }));
import { resolved } from "../employees/__tests__/employee-fixture";
import { handleFarmingRequest } from "./farming-http";
import { planFarming } from "./farming-plan";
import { farmingIds as ids } from "@/features/farming-api/fixtures";

function configure(subjectType = "CooperativeOwner") {
  vi.stubEnv("NODE_ENV", "test"); vi.stubEnv("OMTS_DATA_SOURCE", "api"); vi.stubEnv("OMTS_API_BASE_URL", "http://127.0.0.1:8080"); vi.stubEnv("OMTS_API_TIMEOUT_MS", "1000");
  vi.stubEnv("OMTS_WEB_ORIGIN", "http://localhost:3002"); vi.stubEnv("OMTS_WEB_COOKIE_PROFILE", "http-loopback-dev");
  gateway.mode = "api"; gateway.resolve.mockResolvedValue(resolved()); gateway.application.mockResolvedValue({ status: "ready", context: { identity: { subjectType }, permissions: { functionPermissions: [] } } });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); vi.clearAllMocks(); });

const scanId = "5a92b32d-2901-4560-9237-350be750cb20";
const base = "http://localhost:3002/api/operations/zone-boundary";
const origin = { Origin: "http://localhost:3002", "X-OMTS-Request": "web" };
const ring = [[107.15, 20.93], [107.16, 20.93], [107.16, 20.94], [107.15, 20.93]];
const boundary = { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "Khu 1", corners: ["K1", "K2", "K3"] }, geometry: { type: "Polygon", coordinates: [ring] } }] };
const zone = { id: ids.zone, code: "KV01", name: "Vùng 1", location: null, area: null, statusId: 101, status: "In Use", inUseRaftCount: 1, licenseState: null, latitude: 20.93, longitude: 107.15, boundary, rowVersion: "AQID" };
const save = (body: unknown, headers: Record<string, string> = origin, query = `action=boundary&id=${ids.zone}`) =>
  new Request(`${base}?${query}`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify(body) });
const scan = (files: File[], query = "action=boundary-scan", headers: Record<string, string> = origin) => {
  const form = new FormData(); form.set("payload", "{}");
  for (const file of files) form.append("photo", file);
  return new Request(`${base}?${query}`, { method: "POST", headers, body: form });
};
const jpeg = () => new File([new Uint8Array([255, 216, 255])], "map.jpg", { type: "image/jpeg" });
const reading = { centralMeridian: 107.75, coordinateSystem: "VN-2000", location: "Xã Đông Xá", writtenTotalAreaHa: 28.5, zones: [{ name: "Khu 1", writtenAreaHa: 12.5, gridAreaHa: 12.49, areaMatches: true, corners: [{ label: "K1", x: 2315876.23, y: 437512.47, lat: null, lon: null }] }] };

describe("zone boundary plans", () => {
  const plan = (method: string, query: Record<string, string>) => planFarming("zone-boundary", method, new URLSearchParams(query));
  it("saves with PUT upstream, scans with or without a zone and polls on the route that started the scan", () => {
    expect(plan("POST", { action: "boundary", id: ids.zone })).toMatchObject({ method: "PUT", path: `/api/zones/${ids.zone}/boundary`, ownerOnly: true, jsonMaxBytes: 65_536 });
    expect(plan("POST", { action: "boundary-scan" })).toMatchObject({ method: "POST", path: "/api/zones/boundary-scans", upload: "scan-photo", ownerOnly: true });
    expect(plan("POST", { action: "boundary-scan", id: ids.zone })).toMatchObject({ method: "POST", path: `/api/zones/${ids.zone}/boundary-scans` });
    expect(plan("GET", { action: "boundary-scan-status", scanId })).toMatchObject({ method: "GET", path: `/api/zones/boundary-scans/${scanId}`, ownerOnly: true });
    expect(plan("GET", { action: "boundary-scan-status", scanId, id: ids.zone })).toMatchObject({ path: `/api/zones/${ids.zone}/boundary-scans/${scanId}` });
  });
  it.each([
    ["POST", { action: "boundary" }], ["POST", { action: "boundary", id: "bad" }], ["POST", { action: "boundary", id: ids.zone, scanId }],
    ["GET", { action: "boundary", id: ids.zone }], ["POST", { action: "boundary-scan", scanId }], ["GET", { action: "boundary-scan-status" }],
    ["POST", { action: "boundary-scan-status", scanId }], ["POST", { action: "boundary-scan", id: ids.zone, url: "https://evil.test" }], ["POST", { action: "other" }],
  ])("refuses %s %j", (method, query) => expect(plan(method, query)).toBeUndefined());
  it("refuses a repeated parameter and keeps the actions off the other areas", () => {
    expect(planFarming("zone-boundary", "POST", new URLSearchParams(`action=boundary&id=${ids.zone}&id=${ids.otherZone}`))).toBeUndefined();
    expect(planFarming("zone-licenses", "POST", new URLSearchParams({ action: "boundary", id: ids.zone }))).toBeUndefined();
    expect(planFarming("raft-details", "POST", new URLSearchParams({ action: "boundary-scan" }))).toBeUndefined();
  });
});

describe("zone boundary save", () => {
  it("sends PUT with the boundary and row version, and returns the zone plus only the allow-listed warnings", async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ zone, message: "Saved.", messageCode: "MSG-GEN-05", accessToken: "never-return",
      warnings: [{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 2, raftCodes: ["B01", "B02"] } }, { code: "SOMETHING_ELSE" }] }));
    const response = await handleFarmingRequest(save({ boundary, rowVersion: "AQID" }), "zone-boundary");
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/zones/${ids.zone}/boundary`);
    expect(fetcher.mock.calls[0][1]?.method).toBe("PUT");
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({ boundary, rowVersion: "AQID" });
    const text = await response.text();
    expect(text).not.toContain("never-return");
    const body = JSON.parse(text);
    expect(body.data.zone.boundary.features).toHaveLength(1);
    expect(body.data.warnings).toEqual([{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 2, raftCodes: ["B01", "B02"] } }]);
  });
  it("clears the boundary with null", async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ zone: { ...zone, boundary: null }, message: "Saved.", messageCode: "MSG-GEN-05", warnings: [] }));
    const response = await handleFarmingRequest(save({ boundary: null, rowVersion: "AQID" }), "zone-boundary");
    expect(response.status).toBe(200);
    expect(JSON.parse(fetcher.mock.calls[0][1]?.body as string)).toEqual({ boundary: null, rowVersion: "AQID" });
    expect((await response.json()).data.zone.boundary).toBeNull();
  });
  it.each([
    ["a missing row version", { boundary }],
    ["an extra field", { boundary, rowVersion: "AQID", zoneId: ids.zone }],
    ["a boundary of the wrong type", { boundary: { type: "Feature" }, rowVersion: "AQID" }],
    ["an unclosed ring of two points", { boundary: { ...boundary, features: [{ ...boundary.features[0], geometry: { type: "Polygon", coordinates: [[[1, 2], [3, 4]]] } }] }, rowVersion: "AQID" }],
    ["more than 10 khu", { boundary: { ...boundary, features: Array.from({ length: 11 }, () => boundary.features[0]) }, rowVersion: "AQID" }],
    ["a ring over 101 positions", { boundary: { ...boundary, features: [{ ...boundary.features[0], geometry: { type: "Polygon", coordinates: [Array.from({ length: 102 }, (_, index) => [107 + index / 1000, 20.9])] } }] }, rowVersion: "AQID" }],
  ])("refuses %s before anything is sent", async (_name, body) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleFarmingRequest(save(body), "zone-boundary")).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("accepts a maximal boundary (10 khu of 100 corners) within the 64 KB body limit", async () => {
    configure();
    const big = { type: "FeatureCollection", features: Array.from({ length: 10 }, (_, area) => {
      const open = Array.from({ length: 100 }, (_, corner) => [107.1 + area / 100 + corner / 100000, 20.9 + corner / 100000]);
      return { type: "Feature", properties: { name: `Khu ${area + 1}`, corners: open.map((__, corner) => `K${corner + 1}`) }, geometry: { type: "Polygon", coordinates: [[...open, open[0]]] } };
    }) };
    const body = JSON.stringify({ boundary: big, rowVersion: "AQID" });
    expect(body.length).toBeLessThan(65_536);
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ zone: { ...zone, boundary: big }, warnings: [] }));
    expect((await handleFarmingRequest(save({ boundary: big, rowVersion: "AQID" }), "zone-boundary")).status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("refuses a body over 64 KB", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    const response = await handleFarmingRequest(save({ boundary: null, rowVersion: "x".repeat(70_000) }), "zone-boundary");
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("needs the CSRF header and a same-origin request", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleFarmingRequest(save({ boundary: null, rowVersion: "AQID" }, { Origin: "http://localhost:3002" }), "zone-boundary")).status).toBe(403);
    expect((await handleFarmingRequest(save({ boundary: null, rowVersion: "AQID" }, { Origin: "https://evil.test", "X-OMTS-Request": "web" }), "zone-boundary")).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(["Staff", "Trader", "SystemAdministrator"])("is for the Owner only: %s is refused before the backend is called", async subject => {
    configure(subject); const fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleFarmingRequest(save({ boundary: null, rowVersion: "AQID" }), "zone-boundary")).status).toBe(403);
    expect((await handleFarmingRequest(scan([jpeg()]), "zone-boundary")).status).toBe(403);
    expect((await handleFarmingRequest(new Request(`${base}?action=boundary-scan-status&scanId=${scanId}`), "zone-boundary")).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("requires a session", async () => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch"); gateway.resolve.mockResolvedValueOnce({ status: "anonymous" });
    expect((await handleFarmingRequest(save({ boundary: null, rowVersion: "AQID" }), "zone-boundary")).status).toBe(401);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("passes on the refused field of a bad boundary and a stale row version as codes, nothing else of the backend body", async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ code: "MSG-GEN-01", field: "Boundary coordinates", hint: "Kiểm tra lại tọa độ.", stack: "never-return" }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ code: "MSG06" }, { status: 409 }));
    const refused = await handleFarmingRequest(save({ boundary, rowVersion: "AQID" }), "zone-boundary");
    expect(refused.status).toBe(400);
    const refusedText = await refused.text();
    expect(refusedText).not.toContain("never-return");
    expect(JSON.parse(refusedText)).toMatchObject({ status: "rejected", code: "MSG-GEN-01", problem: { field: "Boundary coordinates" } });
    const stale = await handleFarmingRequest(save({ boundary, rowVersion: "AQID" }), "zone-boundary");
    expect(stale.status).toBe(409);
    expect(await stale.json()).toMatchObject({ code: "MSG06" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("does not accept an unusable answer as a save", async () => {
    configure(); vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ zone: { id: "x" } }));
    expect((await handleFarmingRequest(save({ boundary: null, rowVersion: "AQID" }), "zone-boundary")).status).toBe(502);
  });
});

describe("licence map scan", () => {
  it("starts a zone-less scan with the photo field and answers the scan id (backend 202)", async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ scanId }, { status: 202 }));
    const response = await handleFarmingRequest(scan([jpeg()]), "zone-boundary");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "success", data: { scanId } });
    expect(fetcher.mock.calls[0][0].toString()).toBe("http://127.0.0.1:8080/api/zones/boundary-scans");
    expect(fetcher.mock.calls[0][1]?.method).toBe("POST");
    const form = fetcher.mock.calls[0][1]?.body as FormData;
    expect([...form.keys()]).toEqual(["photo"]);
    expect((form.get("photo") as File).type).toBe("image/jpeg");
    expect(fetcher.mock.calls[0][1]?.headers).not.toHaveProperty("Content-Type");
  });
  it("starts a zone-bound scan on the zone route", async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ scanId }, { status: 202 }));
    expect((await handleFarmingRequest(scan([jpeg()], `action=boundary-scan&id=${ids.zone}`), "zone-boundary")).status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/zones/${ids.zone}/boundary-scans`);
  });
  it.each([
    ["no photo", [] as File[]], ["two photos", [jpeg(), jpeg()]], ["a PDF", [new File(["%PDF"], "map.pdf", { type: "application/pdf" })]],
    ["a photo over 10 MB", [new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" })]],
  ])("refuses %s as a bad photo before the backend is called", async (_name, files) => {
    configure(); const fetcher = vi.spyOn(globalThis, "fetch");
    const response = await handleFarmingRequest(scan(files), "zone-boundary");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "MSG-GEN-01", problem: { field: "Photo" } });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks CSRF before reading the multipart body", async () => {
    configure(); const request = scan([jpeg()], "action=boundary-scan", { Origin: "https://evil.test", "X-OMTS-Request": "web" }), read = vi.spyOn(request.body!, "getReader"), fetcher = vi.spyOn(globalThis, "fetch");
    expect((await handleFarmingRequest(request, "zone-boundary")).status).toBe(403);
    expect(read).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("keeps the busy queue (503 OCR_BUSY) and the hourly limit (429) as their own answers", async () => {
    configure();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ code: "OCR_BUSY" }, { status: 503 })).mockResolvedValueOnce(Response.json({ code: "TOO_MANY_REQUESTS" }, { status: 429 }));
    const busy = await handleFarmingRequest(scan([jpeg()]), "zone-boundary");
    expect(busy.status).toBe(503);
    expect(await busy.json()).toMatchObject({ status: "rejected", code: "OCR_BUSY" });
    const limited = await handleFarmingRequest(scan([jpeg()]), "zone-boundary");
    expect(limited.status).toBe(429);
  });
  it("polls the status on the zone-less route and returns the reading", async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ status: "Done", errorCode: null, reading, extra: "never-return" }));
    const response = await handleFarmingRequest(new Request(`${base}?action=boundary-scan-status&scanId=${scanId}`), "zone-boundary");
    expect(response.status).toBe(200);
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/zones/boundary-scans/${scanId}`);
    expect(fetcher.mock.calls[0][1]?.method).toBe("GET");
    const text = await response.text();
    expect(text).not.toContain("never-return");
    expect(JSON.parse(text).data).toMatchObject({ status: "Done", reading: { writtenTotalAreaHa: 28.5, location: "Xã Đông Xá" } });
  });
  it("polls a zone-bound scan on the zone route and relays a failed or expired scan", async () => {
    configure();
    const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ status: "Failed", errorCode: "TIMEOUT", reading: null })).mockResolvedValueOnce(Response.json({ code: "MSG-GEN-08" }, { status: 404 }));
    const failed = await handleFarmingRequest(new Request(`${base}?action=boundary-scan-status&scanId=${scanId}&id=${ids.zone}`), "zone-boundary");
    expect(fetcher.mock.calls[0][0].toString()).toBe(`http://127.0.0.1:8080/api/zones/${ids.zone}/boundary-scans/${scanId}`);
    expect((await failed.json()).data).toEqual({ status: "Failed", errorCode: "TIMEOUT", reading: null });
    expect((await handleFarmingRequest(new Request(`${base}?action=boundary-scan-status&scanId=${scanId}&id=${ids.zone}`), "zone-boundary")).status).toBe(404);
  });
});
