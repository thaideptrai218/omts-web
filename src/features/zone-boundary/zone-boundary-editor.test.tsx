// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const repository = vi.hoisted(() => ({ startScan: vi.fn(), scanStatus: vi.fn() }));
vi.mock("./zone-boundary-repository", () => ({ zoneBoundaryRepository: repository }));
import type { ZoneMapReading } from "./boundary-contract";
import { boundaryOf, cornerDraft, areaDraft } from "./boundary-geometry";
import { ZoneBoundaryEditor, type BoundaryEditorValue } from "./zone-boundary-editor";

const scanId = "5a92b32d-2901-4560-9237-350be750cb20";
const ok = <T,>(data: T) => ({ status: "success" as const, data });
/** The Vân Đồn sample shape: four khu of 8, 7, 6 and 6 corners (27) around K1, with the written areas of the paper. */
function sample(): ZoneMapReading {
  const sizes = [8, 7, 6, 6], written = [12.5, 6.2, 5.8, 4];
  return { centralMeridian: 107.75, coordinateSystem: "VN-2000", location: "Xã Đông Xá, xã Bản Sen, huyện Vân Đồn, tỉnh Quảng Ninh", writtenTotalAreaHa: 28.5,
    zones: sizes.map((size, area) => {
      // A convex ring of radius r (m) around a centre 500 m apart per khu, so no outline crosses itself; area of the ring is what the khu "writes".
      const radius = Math.sqrt((written[area] * 10000) / ((size / 2) * Math.sin((2 * Math.PI) / size))), cx = 2315876.23 + area * 500, cy = 437512.47;
      return { name: `Khu ${area + 1}`, writtenAreaHa: written[area], gridAreaHa: written[area], areaMatches: true, corners: Array.from({ length: size }, (_, index) => ({
        label: `K${sizes.slice(0, area).reduce((sum, count) => sum + count, 0) + index + 1}`, x: cx + radius * Math.cos((2 * Math.PI * index) / size), y: cy + radius * Math.sin((2 * Math.PI * index) / size), lat: null, lon: null })) };
    }) };
}
const done = (reading = sample()) => ok({ status: "Done" as const, errorCode: null, reading });
const photo = () => new File([new Uint8Array([255, 216, 255])], "so-do.jpg", { type: "image/jpeg" });

let last: BoundaryEditorValue | undefined;
const onChange = vi.fn((value: BoundaryEditorValue) => { last = value; });
beforeEach(() => { vi.useFakeTimers(); last = undefined; repository.startScan.mockResolvedValue(ok({ scanId })); repository.scanStatus.mockResolvedValue(done()); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

async function upload(file = photo()) {
  fireEvent.change(screen.getByLabelText("Ảnh sơ đồ cấp phép"), { target: { files: [file] } });
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
}
const rows = (container: HTMLElement) => container.querySelectorAll("tbody tr").length;
const cards = (container: HTMLElement) => container.querySelectorAll("details");

describe("reading the sample licence map", () => {
  it("shows 4 khu with 27 corners, the meridian, and hands back the boundary and the prefill", async () => {
    const { container } = render(<ZoneBoundaryEditor onChange={onChange} />);
    expect(last).toMatchObject({ boundary: null, blocked: false, touched: false, prefill: null, readCount: 0 });
    await upload();
    expect(repository.startScan).toHaveBeenCalledWith(expect.any(File), undefined, expect.any(AbortSignal));
    expect(cards(container)).toHaveLength(4);
    expect(rows(container)).toBe(27);
    expect(screen.getByText("4 khu")).toBeTruthy();
    expect(screen.getByLabelText("Kinh tuyến trục (VN-2000)")).toHaveProperty("value", "107°45'");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(last?.boundary?.features).toHaveLength(4);
    expect(last?.boundary?.features.map(feature => feature.properties?.name)).toEqual(["Khu 1", "Khu 2", "Khu 3", "Khu 4"]);
    expect(last?.boundary?.features.map(feature => feature.geometry.coordinates[0].length)).toEqual([9, 8, 7, 7]);
    expect(last).toMatchObject({ blocked: false, touched: true, readCount: 1, prefill: { areaHa: 28.5, location: "Xã Đông Xá, xã Bản Sen, huyện Vân Đồn, tỉnh Quảng Ninh" } });
    expect(screen.queryByText("Lệch diện tích")).toBeNull();
  });
  it("uses the sum of the written khu areas when the total row is unread", async () => {
    repository.scanStatus.mockResolvedValue(done({ ...sample(), writtenTotalAreaHa: null }));
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    expect(last?.prefill?.areaHa).toBe(28.5);
  });
  it("leaves the prefill empty for what the photo does not show", async () => {
    repository.scanStatus.mockResolvedValue(done({ ...sample(), location: null, writtenTotalAreaHa: null, zones: sample().zones.map(zone => ({ ...zone, writtenAreaHa: null })) }));
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    expect(last?.prefill).toEqual({ areaHa: null, location: null });
  });
  it("binds the read to the zone in the zone dialog", async () => {
    render(<ZoneBoundaryEditor zoneId="5a92b32d-2901-4560-9237-350be750cb10" onChange={onChange} />);
    await upload();
    expect(repository.startScan).toHaveBeenCalledWith(expect.any(File), "5a92b32d-2901-4560-9237-350be750cb10", expect.any(AbortSignal));
  });
  it("replaces the khu with the same name when another photo is read", async () => {
    const { container } = render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    const shifted = sample();
    shifted.zones = [{ ...shifted.zones[0], corners: shifted.zones[0].corners.slice(0, 4) }];
    repository.scanStatus.mockResolvedValue(done(shifted));
    await upload();
    expect(cards(container)).toHaveLength(4);
    expect(rows(container)).toBe(4 + 7 + 6 + 6);
    expect(last?.readCount).toBe(2);
  });
});

describe("reviewing and editing", () => {
  it("rebuilds the boundary when an X is edited", async () => {
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    const before = JSON.stringify(last?.boundary);
    const x = screen.getByLabelText("X của điểm K1, Khu 1") as HTMLInputElement;
    fireEvent.change(x, { target: { value: String(Number(x.value) + 10) } });
    expect(JSON.stringify(last?.boundary)).not.toBe(before);
    expect(last?.blocked).toBe(false);
  });
  it("blocks a corner without a valid number and names it, then clears when fixed", async () => {
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    const y = screen.getByLabelText("Y của điểm K2, Khu 1") as HTMLInputElement, good = y.value;
    fireEvent.change(y, { target: { value: "abc" } });
    expect(last?.blocked).toBe(true);
    expect(screen.getByRole("alert", { name: "Cần sửa trước khi lưu" }).textContent).toContain("Khu 1: điểm K2 chưa có X, Y hợp lệ");
    expect(screen.getByLabelText("Y của điểm K2, Khu 1").getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(y, { target: { value: good } });
    expect(last?.blocked).toBe(false);
    expect(screen.queryByRole("alert", { name: "Cần sửa trước khi lưu" })).toBeNull();
  });
  it("blocks a khu left with fewer than 3 corners", async () => {
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    const khu3 = screen.getByLabelText("Điểm góc của Khu 3");
    for (let index = 0; index < 4; index += 1) fireEvent.click(within(khu3).getAllByRole("button", { name: /^Xóa điểm/ })[0]);
    expect(within(khu3).getAllByRole("row")).toHaveLength(1 + 2);
    expect(last?.blocked).toBe(true);
    expect(screen.getByRole("alert", { name: "Cần sửa trước khi lưu" }).textContent).toContain("Khu 3 cần ít nhất 3 điểm góc.");
  });
  it("warns, without blocking, when the written area disagrees with the corners", async () => {
    const wrong = sample();
    wrong.zones[0].writtenAreaHa = 20;
    repository.scanStatus.mockResolvedValue(done(wrong));
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    expect(screen.getByText("Lệch diện tích")).toBeTruthy();
    expect(screen.getByRole("status", { name: "Nên kiểm tra lại" }).textContent).toContain("Khu 1");
    expect(last?.blocked).toBe(false);
    expect(last?.boundary?.features).toHaveLength(4);
  });
  it("warns about an outline that crosses itself", async () => {
    const crossing = sample();
    const [a, b] = [crossing.zones[1].corners[0], crossing.zones[1].corners[1]];
    crossing.zones[1].corners[0] = { ...a, x: b.x, y: b.y };
    crossing.zones[1].corners[1] = { ...b, x: a.x, y: a.y };
    crossing.zones[1].writtenAreaHa = null;
    repository.scanStatus.mockResolvedValue(done(crossing));
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    expect(screen.getByRole("status", { name: "Nên kiểm tra lại" }).textContent).toContain("tự cắt nhau");
    expect(last?.blocked).toBe(false);
  });
  it("adds a khu with three empty rows, which blocks until they are filled, and removes it again", async () => {
    const { container } = render(<ZoneBoundaryEditor onChange={onChange} />);
    expect(screen.getByText(/Chưa có khu nào/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thêm khu" }));
    expect(cards(container)).toHaveLength(1);
    expect(rows(container)).toBe(3);
    expect(last?.blocked).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Thêm điểm góc" }));
    expect(rows(container)).toBe(4);
    fireEvent.click(screen.getByRole("button", { name: "Xóa Khu 1" }));
    expect(cards(container)).toHaveLength(0);
    expect(last).toMatchObject({ blocked: false, boundary: null, touched: true });
  });
  it("stops adding at 10 khu and at 100 corners", async () => {
    render(<ZoneBoundaryEditor onChange={onChange} />);
    for (let index = 0; index < 10; index += 1) fireEvent.click(screen.getByRole("button", { name: "Thêm khu" }));
    expect((screen.getByRole("button", { name: "Thêm khu" }) as HTMLButtonElement).disabled).toBe(true);
    const add = screen.getAllByRole("button", { name: "Thêm điểm góc" })[0] as HTMLButtonElement;
    for (let index = 0; index < 97; index += 1) fireEvent.click(add);
    expect(add.disabled).toBe(true);
  });
  it("needs a central meridian between 102° and 110° and moves the boundary when it changes", async () => {
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    const before = JSON.stringify(last?.boundary), meridian = screen.getByLabelText("Kinh tuyến trục (VN-2000)");
    fireEvent.change(meridian, { target: { value: "999" } });
    expect(last?.blocked).toBe(true);
    expect(screen.getByRole("alert", { name: "Cần sửa trước khi lưu" }).textContent).toContain("Kinh tuyến trục phải từ 102°00' đến 110°00'");
    fireEvent.change(meridian, { target: { value: "101°00'" } });
    expect(last?.blocked).toBe(true);
    fireEvent.change(meridian, { target: { value: "107°45'" } });
    expect(last?.blocked).toBe(false);
    expect(JSON.stringify(last?.boundary)).toBe(before);
    fireEvent.change(meridian, { target: { value: "107°00'" } });
    expect(JSON.stringify(last?.boundary)).not.toBe(before);
  });
  it("renames a khu and a corner into the boundary properties", async () => {
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    fireEvent.change(screen.getAllByLabelText("Tên khu")[0], { target: { value: "Khu Đông" } });
    fireEvent.change(screen.getByLabelText("Tên điểm 1 của Khu Đông"), { target: { value: "A1" } });
    expect(last?.boundary?.features[0].properties).toMatchObject({ name: "Khu Đông" });
    expect(last?.boundary?.features[0].properties?.corners?.[0]).toBe("A1");
  });
});

describe("a saved boundary", () => {
  const saved = boundaryOf([areaDraft("Khu 1", [cornerDraft("K1", 2315876.23, 437512.47), cornerDraft("K2", 2315976.23, 437512.47), cornerDraft("K3", 2315976.23, 437612.47), cornerDraft("K4", 2315876.23, 437612.47)])], 107.75)!;
  it("loads as the draft without counting as a change, and hands back exactly the saved boundary until edited", () => {
    const { container } = render(<ZoneBoundaryEditor initialBoundary={saved} onChange={onChange} />);
    expect(cards(container)).toHaveLength(1);
    expect(rows(container)).toBe(4);
    expect(last).toMatchObject({ boundary: saved, touched: false, blocked: false });
    expect(Number((screen.getByLabelText("X của điểm K1, Khu 1") as HTMLInputElement).value)).toBeCloseTo(2315876.23, 0);
  });
  it("is a change once a corner is edited", () => {
    render(<ZoneBoundaryEditor initialBoundary={saved} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("X của điểm K1, Khu 1"), { target: { value: "2315870.00" } });
    expect(last?.touched).toBe(true);
    expect(last?.boundary).not.toEqual(saved);
  });
});

describe("the read itself", () => {
  it("shows progress with Hủy while reading, and Hủy stops it", async () => {
    repository.scanStatus.mockResolvedValue(ok({ status: "Pending" as const, errorCode: null, reading: null }));
    render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    expect(screen.getByRole("status").textContent).toContain("Đang đọc ảnh sơ đồ, đã chờ 2 giây");
    expect(last?.reading).toBe(true);
    expect((screen.getByRole("button", { name: /Chọn ảnh sơ đồ/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(last?.reading).toBe(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(repository.scanStatus).toHaveBeenCalledTimes(1);
  });
  it("shows the busy message with Thử lại and keeps the edits already made", async () => {
    const { container } = render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    fireEvent.change(screen.getByLabelText("Tên điểm 1 của Khu 1"), { target: { value: "EDIT" } });
    repository.startScan.mockResolvedValueOnce({ status: "error", httpStatus: 503, code: "OCR_BUSY", uncertain: false });
    await upload();
    expect(screen.getByRole("alert").textContent).toContain("đang bận đọc ảnh");
    expect(cards(container)).toHaveLength(4);
    expect((screen.getByLabelText("Tên điểm 1 của Khu 1") as HTMLInputElement).value).toBe("EDIT");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(screen.queryByRole("alert")).toBeNull();
    expect((screen.getByLabelText("Tên điểm 1 của Khu 1") as HTMLInputElement).value).toBe("K1");
  });
  it("refuses a photo that is not JPEG or PNG without uploading", async () => {
    render(<ZoneBoundaryEditor onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Ảnh sơ đồ cấp phép"), { target: { files: [new File(["x"], "so-do.pdf", { type: "application/pdf" })] } });
    expect(screen.getByRole("alert").textContent).toContain("JPEG hoặc PNG");
    expect(screen.queryByRole("button", { name: "Thử lại" })).toBeNull();
    expect(repository.startScan).not.toHaveBeenCalled();
  });
  it("disables everything while the parent saves", async () => {
    const { rerender } = render(<ZoneBoundaryEditor onChange={onChange} />);
    await upload();
    rerender(<ZoneBoundaryEditor onChange={onChange} disabled />);
    expect((screen.getByLabelText("X của điểm K1, Khu 1") as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Thêm khu" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: /Chọn ảnh sơ đồ/ }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("offers a slot for a map preview, shown only while the boundary can be saved", async () => {
    const preview = vi.fn(({ boundary }: { boundary: unknown }) => <p>Xem trước {(boundary as { features: unknown[] }).features.length} khu</p>);
    render(<ZoneBoundaryEditor onChange={onChange} preview={preview} />);
    expect(screen.queryByText(/Xem trước/)).toBeNull();
    await upload();
    expect(screen.getByText("Xem trước 4 khu")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Y của điểm K2, Khu 1"), { target: { value: "abc" } });
    expect(screen.queryByText(/Xem trước/)).toBeNull();
  });
});
