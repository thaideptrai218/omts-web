// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/features/auth/api/bff-fetch", () => ({ bffFetch: fetcher }));
import { boundaryErrorText, scanFailureText } from "./boundary-error-text";
import { zoneBoundaryRepository } from "./zone-boundary-repository";

const zoneId = "5a92b32d-2901-4560-9237-350be750cb10", scanId = "5a92b32d-2901-4560-9237-350be750cb20";
const zone = { id: zoneId, code: "KV01", name: "Vùng 1", location: null, area: null, statusId: 101, status: "In Use", inUseRaftCount: 0, licenseState: null, latitude: null, longitude: null, boundary: null, rowVersion: "AQID" };
afterEach(() => vi.clearAllMocks());

describe("zone boundary repository", () => {
  it("uploads the photo as multipart without a zone and reads the scan id", async () => {
    fetcher.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: "success", data: { scanId } }) });
    const result = await zoneBoundaryRepository.startScan(new File(["x"], "map.jpg", { type: "image/jpeg" }));
    expect(result).toEqual({ status: "success", data: { scanId } });
    expect(fetcher.mock.calls[0][0]).toBe("/api/operations/zone-boundary?action=boundary-scan");
    expect(fetcher.mock.calls[0][1].method).toBe("POST");
    expect(fetcher.mock.calls[0][1].headers).toMatchObject({ "X-OMTS-Request": "web" });
    expect(fetcher.mock.calls[0][1].headers).not.toHaveProperty("Content-Type");
    expect((fetcher.mock.calls[0][1].body as FormData).get("photo")).toBeInstanceOf(File);
  });
  it("names the zone on a zone-bound scan and polls with the scan id", async () => {
    fetcher.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: "success", data: { status: "Pending", errorCode: null, reading: null } }) });
    await zoneBoundaryRepository.startScan(new File(["x"], "map.png", { type: "image/png" }), zoneId);
    expect(fetcher.mock.calls[0][0]).toBe(`/api/operations/zone-boundary?action=boundary-scan&id=${zoneId}`);
    expect(await zoneBoundaryRepository.scanStatus(scanId, zoneId)).toEqual({ status: "success", data: { status: "Pending", errorCode: null, reading: null } });
    expect(fetcher.mock.calls[1][0]).toBe(`/api/operations/zone-boundary?action=boundary-scan-status&scanId=${scanId}&id=${zoneId}`);
    expect(fetcher.mock.calls[1][1].method).toBe("GET");
  });
  it("saves as one JSON body and returns the zone with its warnings", async () => {
    fetcher.mockResolvedValue({ ok: true, status: 200, json: async () => ({ status: "success", data: { zone, warnings: [{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 1, raftCodes: ["B01"] } }] } }) });
    const result = await zoneBoundaryRepository.save(zoneId, null, "AQID");
    expect(result).toMatchObject({ status: "success", data: { zone: { rowVersion: "AQID" }, warnings: [{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY" }] } });
    expect(fetcher.mock.calls[0][0]).toBe(`/api/operations/zone-boundary?action=boundary&id=${zoneId}`);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ boundary: null, rowVersion: "AQID" });
  });
  it("keeps the code, the refused field and whether the outcome is uncertain", async () => {
    fetcher.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ status: "rejected", code: "MSG-GEN-01", problem: { field: "Boundary coordinates", secret: "no" } }) });
    expect(await zoneBoundaryRepository.save(zoneId, null, "AQID")).toEqual({ status: "error", httpStatus: 400, code: "MSG-GEN-01", problem: { field: "Boundary coordinates" }, uncertain: false });
    fetcher.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ status: "unavailable" }) });
    expect(await zoneBoundaryRepository.save(zoneId, null, "AQID")).toMatchObject({ httpStatus: 503, uncertain: true });
    fetcher.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ status: "success", data: { nope: true } }) });
    expect(await zoneBoundaryRepository.save(zoneId, null, "AQID")).toMatchObject({ httpStatus: 502, uncertain: true });
    fetcher.mockRejectedValueOnce(new Error("offline"));
    expect(await zoneBoundaryRepository.save(zoneId, null, "AQID")).toMatchObject({ httpStatus: 0, uncertain: true });
  });
  it("never calls a failed photo upload or a poll uncertain, and an aborted poll is not a fault", async () => {
    fetcher.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ status: "rejected", code: "OCR_BUSY" }) });
    expect(await zoneBoundaryRepository.startScan(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toMatchObject({ httpStatus: 503, code: "OCR_BUSY", uncertain: false });
    fetcher.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    expect(await zoneBoundaryRepository.scanStatus(scanId)).toEqual({ status: "error", httpStatus: 0, uncertain: false });
  });
});

describe("boundary error texts", () => {
  it("says a busy queue and the hourly limit are temporary", () => {
    expect(boundaryErrorText({ httpStatus: 503, code: "OCR_BUSY" })).toContain("đang bận đọc ảnh");
    expect(boundaryErrorText({ httpStatus: 429 })).toContain("quá nhiều ảnh");
    expect(boundaryErrorText({ httpStatus: 503 })).toBeUndefined();
  });
  it("tells what to fix for the field the backend refused", () => {
    expect(boundaryErrorText({ httpStatus: 400, code: "MSG-GEN-01", problem: { field: "Boundary name" } })).toContain("Tên khu tối đa 100");
    expect(boundaryErrorText({ httpStatus: 400, code: "MSG-GEN-01", problem: { field: "Boundary corners" } })).toContain("Tên điểm góc");
    expect(boundaryErrorText({ httpStatus: 400, code: "MSG-GEN-01", problem: { field: "Photo" } })).toContain("JPEG hoặc PNG");
    expect(boundaryErrorText({ httpStatus: 400, code: "MSG-GEN-01", problem: { field: "Name" } })).toBeUndefined();
  });
  it("explains a zone no longer In Use, a stale row version and an expired scan", () => {
    expect(boundaryErrorText({ httpStatus: 409, code: "MSG-GEN-09" })).toContain("không còn ở trạng thái đang sử dụng");
    expect(boundaryErrorText({ httpStatus: 409, code: "MSG06" })).toContain("tải lại hồ sơ");
    expect(boundaryErrorText({ httpStatus: 404 })).toContain("hết hạn");
  });
  it("words each failure of a read", () => {
    expect(scanFailureText("BAD_RESPONSE")).toContain("chụp rõ hơn");
    expect(scanFailureText("NOT_CONFIGURED")).toContain("chưa bật");
    expect(scanFailureText("TIMEOUT")).toContain("thử lại");
    expect(scanFailureText(null)).toContain("thử lại");
  });
});
