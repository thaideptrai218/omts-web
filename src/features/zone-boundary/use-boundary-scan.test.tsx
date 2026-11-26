// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

const repository = vi.hoisted(() => ({ startScan: vi.fn(), scanStatus: vi.fn() }));
vi.mock("./zone-boundary-repository", () => ({ zoneBoundaryRepository: repository }));
import type { ZoneMapReading } from "./boundary-contract";
import { photoProblem, useBoundaryScan } from "./use-boundary-scan";

const scanId = "5a92b32d-2901-4560-9237-350be750cb20", zoneId = "5a92b32d-2901-4560-9237-350be750cb10";
const reading: ZoneMapReading = { centralMeridian: 107.75, coordinateSystem: null, location: "Xã Đông Xá", writtenTotalAreaHa: 28.5,
  zones: [{ name: "Khu 1", writtenAreaHa: 12.5, gridAreaHa: null, areaMatches: null, corners: [{ label: "K1", x: 2315876.23, y: 437512.47, lat: null, lon: null }] }] };
const ok = <T,>(data: T) => ({ status: "success" as const, data });
const pending = ok({ status: "Pending" as const, errorCode: null, reading: null });
const done = ok({ status: "Done" as const, errorCode: null, reading });
const failure = (httpStatus: number, code?: string) => ({ status: "error" as const, httpStatus, code, uncertain: false });
const photo = (type = "image/jpeg", bytes = 4) => new File([new Uint8Array(bytes)], "map.jpg", { type });

beforeEach(() => { vi.useFakeTimers(); repository.startScan.mockResolvedValue(ok({ scanId })); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

function mount(id?: string) {
  const onReading = vi.fn();
  return { onReading, ...renderHook(() => useBoundaryScan({ zoneId: id, onReading })) };
}
const tick = (ms = 2000) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const begin = async (view: ReturnType<typeof mount>, file = photo()) => { await act(async () => { void view.result.current.start(file); await vi.advanceTimersByTimeAsync(0); }); };

describe("photo rules", () => {
  it("accepts JPEG and PNG up to 10 MB only", () => {
    expect(photoProblem(photo("image/jpeg"))).toBeUndefined();
    expect(photoProblem(photo("image/png"))).toBeUndefined();
    expect(photoProblem(photo("image/gif"))).toContain("JPEG hoặc PNG");
    expect(photoProblem(photo("application/pdf"))).toContain("JPEG hoặc PNG");
    expect(photoProblem(photo("image/jpeg", 10 * 1024 * 1024 + 1))).toContain("10 MB");
    expect(photoProblem(photo("image/jpeg", 10 * 1024 * 1024))).toBeUndefined();
  });
});

describe("boundary scan", () => {
  it("uploads, polls every 2 s while Pending and delivers the reading once when Done", async () => {
    repository.scanStatus.mockResolvedValueOnce(pending).mockResolvedValueOnce(pending).mockResolvedValueOnce(done);
    const view = mount(), file = photo();
    await begin(view, file);
    expect(repository.startScan).toHaveBeenCalledWith(file, undefined, expect.any(AbortSignal));
    expect(view.result.current.phase).toBe("reading");
    expect(repository.scanStatus).not.toHaveBeenCalled();
    await tick(); expect(repository.scanStatus).toHaveBeenCalledTimes(1);
    expect(view.result.current.elapsedMs).toBe(2000);
    await tick(); expect(repository.scanStatus).toHaveBeenCalledTimes(2);
    expect(view.onReading).not.toHaveBeenCalled();
    await tick();
    expect(repository.scanStatus).toHaveBeenCalledTimes(3);
    expect(repository.scanStatus).toHaveBeenLastCalledWith(scanId, undefined, expect.any(AbortSignal));
    expect(view.onReading).toHaveBeenCalledTimes(1);
    expect(view.onReading).toHaveBeenCalledWith(reading);
    expect(view.result.current.phase).toBe("idle");
    await tick(10_000);
    expect(repository.scanStatus).toHaveBeenCalledTimes(3);
  });
  it("binds the read to the zone when it has one", async () => {
    repository.scanStatus.mockResolvedValue(done);
    const view = mount(zoneId);
    await begin(view);
    await tick();
    expect(repository.startScan).toHaveBeenCalledWith(expect.any(File), zoneId, expect.any(AbortSignal));
    expect(repository.scanStatus).toHaveBeenCalledWith(scanId, zoneId, expect.any(AbortSignal));
  });
  it("gives up at 120 s and offers a retry of the same photo", async () => {
    repository.scanStatus.mockResolvedValue(pending);
    const view = mount(), file = photo();
    await begin(view, file);
    await tick(118_000);
    expect(view.result.current.phase).toBe("reading");
    await tick(2_000);
    expect(view.result.current.phase).toBe("failed");
    expect(view.result.current.error).toContain("quá 2 phút");
    expect(repository.scanStatus).toHaveBeenCalledTimes(60);
    expect(view.onReading).not.toHaveBeenCalled();
    repository.scanStatus.mockResolvedValue(done);
    await act(async () => { view.result.current.retry(); await vi.advanceTimersByTimeAsync(0); });
    expect(repository.startScan).toHaveBeenCalledTimes(2);
    expect(repository.startScan.mock.calls[1][0]).toBe(file);
    await tick();
    expect(view.onReading).toHaveBeenCalledTimes(1);
  });
  it("stops polling when the screen is left, and aborts the request in flight", async () => {
    repository.scanStatus.mockResolvedValueOnce(pending).mockReturnValue(new Promise(() => undefined));
    const view = mount();
    await begin(view);
    await tick(4000);
    expect(repository.scanStatus).toHaveBeenCalledTimes(2);
    const inFlight = repository.scanStatus.mock.calls[1][2] as AbortSignal;
    expect(inFlight.aborted).toBe(false);
    view.unmount();
    expect(inFlight.aborted).toBe(true);
    await tick(20_000);
    expect(repository.scanStatus).toHaveBeenCalledTimes(2);
    expect(view.onReading).not.toHaveBeenCalled();
  });
  it("drops an answer that arrives after Hủy", async () => {
    let release: (value: unknown) => void = () => undefined;
    repository.scanStatus.mockReturnValue(new Promise(resolve => { release = resolve; }));
    const view = mount();
    await begin(view);
    await tick();
    act(() => view.result.current.cancel());
    expect(view.result.current.phase).toBe("idle");
    await act(async () => { release(done); await vi.advanceTimersByTimeAsync(0); });
    expect(view.onReading).not.toHaveBeenCalled();
    expect(view.result.current.phase).toBe("idle");
    await tick(10_000);
    expect(repository.scanStatus).toHaveBeenCalledTimes(1);
  });
  it("starting another photo cancels the read in progress", async () => {
    repository.scanStatus.mockReturnValueOnce(new Promise(() => undefined)).mockResolvedValue(pending);
    const view = mount();
    await begin(view);
    await tick();
    const first = repository.scanStatus.mock.calls[0][2] as AbortSignal;
    expect(first.aborted).toBe(false);
    await begin(view);
    expect(first.aborted).toBe(true);
    expect(repository.startScan).toHaveBeenCalledTimes(2);
  });
  it("says a busy queue is temporary and lets the user retry", async () => {
    repository.startScan.mockResolvedValueOnce(failure(503, "OCR_BUSY"));
    const view = mount();
    await begin(view);
    expect(view.result.current.phase).toBe("failed");
    expect(view.result.current.error).toContain("đang bận đọc ảnh");
    expect(view.result.current.canRetry).toBe(true);
    expect(repository.scanStatus).not.toHaveBeenCalled();
  });
  it("says the hourly limit is reached (429)", async () => {
    repository.startScan.mockResolvedValueOnce(failure(429, "TOO_MANY_REQUESTS"));
    const view = mount();
    await begin(view);
    expect(view.result.current.error).toContain("quá nhiều ảnh");
  });
  it("reports a read the server could not do", async () => {
    repository.scanStatus.mockResolvedValue(ok({ status: "Failed" as const, errorCode: "BAD_RESPONSE", reading: null }));
    const view = mount();
    await begin(view);
    await tick();
    expect(view.result.current.phase).toBe("failed");
    expect(view.result.current.error).toContain("chụp rõ hơn");
  });
  it("treats a photo with no readable table as a failure, not as an empty result", async () => {
    repository.scanStatus.mockResolvedValue(ok({ status: "Done" as const, errorCode: null, reading: { ...reading, zones: [{ ...reading.zones[0], corners: [] }] } }));
    const view = mount();
    await begin(view);
    await tick();
    expect(view.result.current.phase).toBe("failed");
    expect(view.result.current.error).toContain("Không thấy bảng tọa độ góc");
    expect(view.onReading).not.toHaveBeenCalled();
  });
  it("retries a poll that fails for a moment, but gives up after three in a row", async () => {
    repository.scanStatus.mockResolvedValueOnce(failure(0)).mockResolvedValueOnce(failure(503)).mockResolvedValueOnce(done);
    const view = mount();
    await begin(view);
    await tick(6000);
    expect(view.onReading).toHaveBeenCalledTimes(1);
    repository.scanStatus.mockReset();
    repository.scanStatus.mockResolvedValue(failure(502));
    await begin(view);
    await tick(6000);
    expect(view.result.current.phase).toBe("failed");
    expect(repository.scanStatus).toHaveBeenCalledTimes(3);
  });
  it("stops at once when the scan is gone (404)", async () => {
    repository.scanStatus.mockResolvedValue(failure(404));
    const view = mount();
    await begin(view);
    await tick();
    expect(view.result.current.phase).toBe("failed");
    expect(view.result.current.error).toContain("hết hạn");
    expect(repository.scanStatus).toHaveBeenCalledTimes(1);
  });
  it("refuses a photo that is not JPEG/PNG or over 10 MB before any upload", async () => {
    const view = mount();
    await begin(view, photo("image/gif"));
    expect(view.result.current.phase).toBe("failed");
    expect(view.result.current.canRetry).toBe(false);
    await begin(view, photo("image/png", 10 * 1024 * 1024 + 1));
    expect(view.result.current.error).toContain("10 MB");
    expect(repository.startScan).not.toHaveBeenCalled();
  });
});
