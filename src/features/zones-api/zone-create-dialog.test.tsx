// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const workspace = vi.hoisted(() => ({ mutate: vi.fn(), detail: vi.fn(), proposal: vi.fn() }));
const boundaryApi = vi.hoisted(() => ({ startScan: vi.fn(), scanStatus: vi.fn(), save: vi.fn() }));
vi.mock("@/features/api-workspace/workspace-repository", () => ({ createWorkspaceRepository: () => workspace }));
vi.mock("@/features/zone-boundary/zone-boundary-repository", () => ({ zoneBoundaryRepository: boundaryApi }));
import type { ZoneMapReading } from "@/features/zone-boundary/boundary-contract";
import { ZoneCreateDialog } from "./zone-create-dialog";

const zoneId = "5a92b32d-2901-4560-9237-350be750cb10", scanId = "5a92b32d-2901-4560-9237-350be750cb20";
const ok = <T,>(data: T) => ({ status: "success" as const, data });
const reading: ZoneMapReading = { centralMeridian: 107.75, coordinateSystem: "VN-2000", location: "Xã Đông Xá, huyện Vân Đồn", writtenTotalAreaHa: 28.5, zones: [{
  name: "Khu 1", writtenAreaHa: 1, gridAreaHa: 1, areaMatches: true, corners: [[0, 0], [100, 0], [100, 100], [0, 100]].map(([dx, dy], index) => ({ label: `K${index + 1}`, x: 2315876.23 + dx, y: 437512.47 + dy, lat: null, lon: null })) }] };
const zoneRecord = { id: zoneId, code: "KV05", name: "Vùng A", location: null, area: null, statusId: 101, status: "In Use", inUseRaftCount: 0, licenseState: null, latitude: null, longitude: null, boundary: null, rowVersion: "AQID" };
const saved = ok({ zone: { ...zoneRecord, rowVersion: "AQIE" }, warnings: [] });

const onClose = vi.fn(), onCreated = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
  workspace.proposal.mockResolvedValue(ok({ code: "KV05" }));
  workspace.mutate.mockResolvedValue(ok(zoneRecord));
  workspace.detail.mockResolvedValue(ok(zoneRecord));
  boundaryApi.startScan.mockResolvedValue(ok({ scanId }));
  boundaryApi.scanStatus.mockResolvedValue(ok({ status: "Done" as const, errorCode: null, reading }));
  boundaryApi.save.mockResolvedValue(saved);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.clearAllMocks(); });

const open = async () => {
  render(<ZoneCreateDialog onClose={onClose} onCreated={onCreated} />);
  await waitFor(() => expect((screen.getByLabelText("Mã vùng *") as HTMLInputElement).value).toBe("KV05"));
};
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const readMap = async () => {
  fireEvent.change(screen.getByLabelText("Ảnh sơ đồ cấp phép"), { target: { files: [new File([new Uint8Array([255, 216, 255])], "so-do.jpg", { type: "image/jpeg" })] } });
  await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
};
const press = async (name: string) => { fireEvent.click(screen.getByRole("button", { name })); await act(async () => { await vi.advanceTimersByTimeAsync(0); }); };
const value = (label: string) => (screen.getByLabelText(label) as HTMLInputElement).value;

describe("the form without a map", () => {
  it("has no pin section, no latitude or longitude, and only code and name are required", async () => {
    const { container } = render(<ZoneCreateDialog onClose={onClose} onCreated={onCreated} />);
    expect(screen.queryByText("Vị trí trên bản đồ")).toBeNull();
    expect(container.ownerDocument.querySelector("input[name='latitude'], input[name='longitude']")).toBeNull();
    expect(screen.queryByText(/Vĩ độ|Kinh độ/)).toBeNull();
    expect(screen.getByLabelText("Mã vùng *")).toBeTruthy();
    expect(screen.getByLabelText("Tên vùng *")).toBeTruthy();
    expect(screen.getByLabelText("Địa điểm")).toBeTruthy();
    expect(screen.getByLabelText("Diện tích (ha)")).toBeTruthy();
    expect(screen.queryByLabelText("Địa điểm *")).toBeNull();
    expect(screen.getByText("Sơ đồ cấp phép (tùy chọn)")).toBeTruthy();
  });
  it("creates with only a code and a name, exactly as before, without touching the boundary", async () => {
    await open();
    await press("Lưu");
    expect(workspace.mutate).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Tên vùng *").getAttribute("aria-invalid")).toBe("true");
    type("Tên vùng *", "Vùng A");
    await press("Lưu");
    expect(workspace.mutate).toHaveBeenCalledTimes(1);
    expect(workspace.mutate).toHaveBeenCalledWith("create", { code: "KV05", name: "Vùng A", location: "", area: null });
    expect(boundaryApi.save).not.toHaveBeenCalled();
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
  it("closes at once when nothing was changed, and asks first when something was", async () => {
    await open();
    await press("Bỏ qua");
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();
    await open();
    type("Tên vùng *", "Vùng A");
    await press("Bỏ qua");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Bỏ các thay đổi chưa lưu?")).toBeTruthy();
    await press("Đồng ý");
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("reading the licence map", () => {
  it("fills Địa điểm and Diện tích with the hint, and never the zone name", async () => {
    await open();
    await readMap();
    expect(boundaryApi.startScan).toHaveBeenCalledWith(expect.any(File), undefined, expect.any(AbortSignal));
    expect(value("Địa điểm")).toBe("Xã Đông Xá, huyện Vân Đồn");
    expect(value("Diện tích (ha)")).toBe("28.5");
    expect(value("Tên vùng *")).toBe("");
    expect(screen.getAllByText("Điền từ sơ đồ")).toHaveLength(2);
  });
  it("never overwrites what was typed, and a typed value is no longer replaced by the next read", async () => {
    await open();
    type("Diện tích (ha)", "7");
    await readMap();
    expect(value("Diện tích (ha)")).toBe("7");
    expect(value("Địa điểm")).toBe("Xã Đông Xá, huyện Vân Đồn");
    expect(screen.getAllByText("Điền từ sơ đồ")).toHaveLength(1);
    boundaryApi.scanStatus.mockResolvedValue(ok({ status: "Done" as const, errorCode: null, reading: { ...reading, location: "Nơi khác", writtenTotalAreaHa: 30 } }));
    type("Địa điểm", "Gõ tay");
    await readMap();
    expect(value("Địa điểm")).toBe("Gõ tay");
    expect(value("Diện tích (ha)")).toBe("7");
    expect(screen.queryByText("Điền từ sơ đồ")).toBeNull();
  });
  it("lets a later read replace a value that still comes from the earlier read", async () => {
    await open();
    await readMap();
    boundaryApi.scanStatus.mockResolvedValue(ok({ status: "Done" as const, errorCode: null, reading: { ...reading, location: "Nơi khác", writtenTotalAreaHa: 30 } }));
    await readMap();
    expect(value("Địa điểm")).toBe("Nơi khác");
    expect(value("Diện tích (ha)")).toBe("30");
  });
  it("grows to the wide dialog only while the licence map section is open", async () => {
    await open();
    const dialog = document.querySelector("dialog")!;
    expect(dialog.className).toContain("max-w-4xl");
    const section = screen.getByText("Sơ đồ cấp phép (tùy chọn)").closest("details")!;
    act(() => { section.open = true; section.dispatchEvent(new Event("toggle")); });
    expect(dialog.className).toContain("max-w-6xl");
    act(() => { section.open = false; section.dispatchEvent(new Event("toggle")); });
    expect(dialog.className).toContain("max-w-4xl");
  });
  it("counts a read photo as a change when closing", async () => {
    await open();
    await readMap();
    await press("Bỏ qua");
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("Bỏ các thay đổi chưa lưu?")).toBeTruthy();
  });
});

describe("saving with a boundary", () => {
  it("creates the zone first, then saves the boundary with the new row version, in that order", async () => {
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    await press("Lưu");
    expect(workspace.mutate).toHaveBeenCalledWith("create", { code: "KV05", name: "Vùng A", location: "Xã Đông Xá, huyện Vân Đồn", area: 28.5 });
    expect(boundaryApi.save).toHaveBeenCalledTimes(1);
    const [id, boundary, rowVersion] = boundaryApi.save.mock.calls[0];
    expect([id, rowVersion]).toEqual([zoneId, "AQID"]);
    expect(boundary.features).toHaveLength(1);
    expect(boundary.features[0].geometry.coordinates[0]).toHaveLength(5);
    expect(workspace.mutate.mock.invocationCallOrder[0]).toBeLessThan(boundaryApi.save.mock.invocationCallOrder[0]);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
  it("does not create the zone while the map still has problems, and says so", async () => {
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    fireEvent.change(screen.getByLabelText("Y của điểm K2, Khu 1"), { target: { value: "abc" } });
    await press("Lưu");
    expect(workspace.mutate).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").map(alert => alert.textContent).join(" ")).toContain("Sơ đồ cấp phép còn chỗ cần sửa");
  });
  it("does not create the zone while a photo is still being read", async () => {
    boundaryApi.scanStatus.mockResolvedValue(ok({ status: "Pending" as const, errorCode: null, reading: null }));
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    await press("Lưu");
    expect(workspace.mutate).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").map(alert => alert.textContent).join(" ")).toContain("Đang đọc ảnh sơ đồ cấp phép");
  });
  it("keeps the zone and offers Thử lại and Bỏ qua when the boundary fails; Thử lại reloads the zone and never creates it twice", async () => {
    boundaryApi.save.mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG-GEN-01", problem: { field: "Boundary coordinates" }, uncertain: false });
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    await press("Lưu");
    expect(screen.getByText("Vùng đã tạo, chưa lưu được ranh giới.")).toBeTruthy();
    expect(screen.getByText(/Có điểm góc nằm ngoài Việt Nam/)).toBeTruthy();
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bỏ qua, lưu ranh giới sau" })).toBeTruthy();
    expect((screen.getByLabelText("Tên vùng *") as HTMLInputElement).disabled).toBe(true);
    workspace.detail.mockResolvedValue(ok({ ...zoneRecord, rowVersion: "NEW" }));
    await press("Thử lại");
    expect(workspace.mutate).toHaveBeenCalledTimes(1);
    expect(workspace.detail).toHaveBeenCalledWith(zoneId, undefined);
    expect(boundaryApi.save).toHaveBeenCalledTimes(2);
    expect(boundaryApi.save.mock.calls[1][2]).toBe("NEW");
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
  it("lets the boundary be fixed in the retry step", async () => {
    boundaryApi.save.mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG-GEN-01", problem: { field: "Boundary" }, uncertain: false });
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    await press("Lưu");
    const before = JSON.stringify(boundaryApi.save.mock.calls[0][1]);
    fireEvent.change(screen.getByLabelText("X của điểm K1, Khu 1"), { target: { value: "2315870.00" } });
    await press("Thử lại");
    expect(JSON.stringify(boundaryApi.save.mock.calls[1][1])).not.toBe(before);
    expect(workspace.mutate).toHaveBeenCalledTimes(1);
  });
  it("Bỏ qua leaves the zone as created without a boundary and says where to add it later", async () => {
    boundaryApi.save.mockResolvedValue({ status: "error", httpStatus: 503, uncertain: true });
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    await press("Lưu");
    expect(screen.getByText("Vùng đã tạo, chưa lưu được ranh giới.")).toBeTruthy();
    expect(screen.getByText(/Cập nhật ranh giới để lưu sau/)).toBeTruthy();
    await press("Bỏ qua, lưu ranh giới sau");
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(workspace.mutate).toHaveBeenCalledTimes(1);
    expect(boundaryApi.save).toHaveBeenCalledTimes(1);
  });
  it("closing the dialog after the zone exists is the same as Bỏ qua, never a second create", async () => {
    boundaryApi.save.mockResolvedValue({ status: "error", httpStatus: 400, code: "MSG-GEN-01", uncertain: false });
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    await press("Lưu");
    await press("Đóng hộp thoại");
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(workspace.mutate).toHaveBeenCalledTimes(1);
  });
  it("does not save the boundary again when the retry finds it already stored", async () => {
    boundaryApi.save.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: true });
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    await press("Lưu");
    workspace.detail.mockResolvedValue(ok({ ...zoneRecord, boundary: { type: "FeatureCollection", features: [{ type: "Feature", properties: null, geometry: { type: "Polygon", coordinates: [[[107.1, 20.9], [107.2, 20.9], [107.2, 21], [107.1, 20.9]]] } }] } }));
    await press("Thử lại");
    expect(boundaryApi.save).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledTimes(1);
  });
  it("a failed create keeps the form and nothing is saved", async () => {
    workspace.mutate.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG03", uncertain: false });
    await open();
    type("Tên vùng *", "Vùng A");
    await readMap();
    await press("Lưu");
    expect(boundaryApi.save).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.queryByText("Vùng đã tạo, chưa lưu được ranh giới.")).toBeNull();
    expect(value("Tên vùng *")).toBe("Vùng A");
  });
});
