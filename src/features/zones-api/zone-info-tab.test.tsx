// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const workspace = vi.hoisted(() => ({ mutate: vi.fn() }));
const boundaryApi = vi.hoisted(() => ({ startScan: vi.fn(), scanStatus: vi.fn(), save: vi.fn() }));
vi.mock("@/features/api-workspace/workspace-repository", () => ({ createWorkspaceRepository: () => workspace }));
vi.mock("@/features/zone-boundary/zone-boundary-repository", () => ({ zoneBoundaryRepository: boundaryApi }));
import type { ZoneBoundary } from "@/features/zone-boundary/boundary-contract";
import { areaDraft, boundaryOf, cornerDraft } from "@/features/zone-boundary/boundary-geometry";
import { ZoneInfoTab, boundarySummary } from "./zone-info-tab";
import type { ZoneDetail } from "./zone-model";

const ok = <T,>(data: T) => ({ status: "success" as const, data });
const square = (name: string, dx: number) => areaDraft(name, [[0, 0], [100, 0], [100, 100], [0, 100]].map(([x, y], index) => cornerDraft(`${dx === 0 ? "K" : "L"}${index + 1}`, 2315876.23 + dx + x, 437512.47 + y)));
const boundary = boundaryOf([square("Khu 1", 0), square("Khu 2", 500)], 107.75) as ZoneBoundary;
const base: ZoneDetail = { id: "5a92b32d-2901-4560-9237-350be750cb10", code: "V01", name: "Vùng 1", location: "Cô Tô", area: 10, statusId: 101, status: "In Use", rowVersion: "AQID", licenseState: "Missing", inUseRaftCount: 0, latitude: 21, longitude: 107, boundary: null };
const props = (over: Partial<Parameters<typeof ZoneInfoTab>[0]> = {}) => ({ zone: base, canEdit: true, canBoundary: true, canSeeLicense: false, busy: false, dirtyRef: { current: false }, onSaved: vi.fn(), onReload: vi.fn(), onStatus: vi.fn(), onClearBoundary: vi.fn(), ...over });

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("zone facts", () => {
  it("shows Địa điểm and Ranh giới and no Vĩ độ or Kinh độ, even for a zone that still has a pin", () => {
    render(<ZoneInfoTab {...props()} />);
    expect(screen.getByText("Địa điểm")).toBeTruthy();
    expect(screen.getByText("Ranh giới")).toBeTruthy();
    expect(screen.queryByText("Vĩ độ")).toBeNull();
    expect(screen.queryByText("Kinh độ")).toBeNull();
    expect(screen.getByText("Chưa có")).toBeTruthy();
  });
  it("summarises the boundary as the source, the number of khu and the area", () => {
    expect(boundarySummary({ boundary: null })).toBe("Chưa có");
    expect(boundarySummary({ boundary })).toMatch(/^Theo sơ đồ cấp phép, 2 khu, 2(,\d+)? ha$/);
    render(<ZoneInfoTab {...props({ zone: { ...base, boundary } })} />);
    expect(screen.getByText(/^Theo sơ đồ cấp phép, 2 khu/)).toBeTruthy();
  });
  it("shows a dash for an empty Địa điểm and Diện tích", () => {
    render(<ZoneInfoTab {...props({ zone: { ...base, location: null, area: null } })} />);
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });
});

describe("boundary actions", () => {
  it("offers Cập nhật ranh giới to the Owner of an In Use zone, and Xóa ranh giới only when there is a boundary", () => {
    const view = render(<ZoneInfoTab {...props()} />);
    expect(screen.getByRole("button", { name: /Cập nhật ranh giới/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Xóa ranh giới/ })).toBeNull();
    view.rerender(<ZoneInfoTab {...props({ zone: { ...base, boundary } })} />);
    expect(screen.getByRole("button", { name: /Xóa ranh giới/ })).toBeTruthy();
  });
  it("hides both for anyone else, and for a zone that is not In Use", () => {
    const view = render(<ZoneInfoTab {...props({ zone: { ...base, boundary }, canBoundary: false })} />);
    expect(screen.queryByRole("button", { name: /ranh giới/ })).toBeNull();
    view.rerender(<ZoneInfoTab {...props({ zone: { ...base, statusId: 102, status: "Discontinued", boundary }, canBoundary: false })} />);
    expect(screen.queryByRole("button", { name: /ranh giới/ })).toBeNull();
    expect(screen.getByText(/^Theo sơ đồ cấp phép/)).toBeTruthy();
  });
  it("puts Xóa ranh giới on the left of the footer and the other actions on the right, and asks the panel to confirm", () => {
    const onClearBoundary = vi.fn();
    const { container } = render(<ZoneInfoTab {...props({ zone: { ...base, boundary }, onClearBoundary })} />);
    const [left, right] = container.querySelectorAll("footer > div");
    expect(within(left as HTMLElement).getByRole("button", { name: /Xóa ranh giới/ })).toBeTruthy();
    expect(within(right as HTMLElement).getAllByRole("button").map(button => button.textContent)).toEqual(["Ngừng sử dụng vùng", "Cập nhật ranh giới", "Chỉnh sửa"]);
    fireEvent.click(within(left as HTMLElement).getByRole("button", { name: /Xóa ranh giới/ }));
    expect(onClearBoundary).toHaveBeenCalledTimes(1);
  });
  it("has the footer actions of the boundary only outside the edit form", () => {
    render(<ZoneInfoTab {...props({ zone: { ...base, boundary } })} />);
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    expect(screen.queryByRole("button", { name: /ranh giới/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeTruthy();
  });
});

describe("editing a zone", () => {
  it("has no latitude or longitude, no star on Địa điểm and Diện tích, and saves without the pin", async () => {
    const onSaved = vi.fn(), dirtyRef = { current: false };
    workspace.mutate.mockResolvedValue(ok({ ...base, location: null, area: 12.5 }));
    const { container } = render(<ZoneInfoTab {...props({ onSaved, dirtyRef })} />);
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    expect(container.querySelector("input[name='latitude'], input[name='longitude']")).toBeNull();
    expect(screen.queryByText(/Vĩ độ|Kinh độ|Vị trí trên bản đồ/)).toBeNull();
    expect(screen.getByLabelText("Địa điểm")).toBeTruthy();
    expect(screen.getByLabelText("Diện tích (ha)")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Địa điểm"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Diện tích (ha)"), { target: { value: "12,5" } });
    expect(dirtyRef.current).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(workspace.mutate).toHaveBeenCalledWith("update", { code: "V01", name: "Vùng 1", location: "", area: 12.5, rowVersion: "AQID" }, base.id));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(screen.queryByLabelText("Địa điểm")).toBeNull();
  });
  it("can clear the area and the location", async () => {
    workspace.mutate.mockResolvedValue(ok(base));
    render(<ZoneInfoTab {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(screen.getByLabelText("Địa điểm"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Diện tích (ha)"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(workspace.mutate).toHaveBeenCalledWith("update", expect.objectContaining({ location: "", area: null }), base.id));
  });
  it("refuses a bad area and a missing name before calling the API", () => {
    render(<ZoneInfoTab {...props()} />);
    fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(screen.getByLabelText("Tên vùng *"), { target: { value: " " } });
    fireEvent.change(screen.getByLabelText("Diện tích (ha)"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(workspace.mutate).not.toHaveBeenCalled();
    expect(screen.getAllByRole("alert").length).toBe(2);
  });
});

describe("updating the boundary", () => {
  const reading = { centralMeridian: 107.75, coordinateSystem: "VN-2000", location: "Xã Đông Xá", writtenTotalAreaHa: 28.5, zones: [{ name: "Khu 9", writtenAreaHa: 1, gridAreaHa: 1, areaMatches: true, corners: [[0, 0], [100, 0], [100, 100]].map(([x, y], index) => ({ label: `N${index + 1}`, x: 2316876.23 + x, y: 437512.47 + y, lat: null, lon: null })) }] };
  const openDialog = () => fireEvent.click(screen.getByRole("button", { name: /Cập nhật ranh giới/ }));
  const savedZone = { ...base, rowVersion: "AQIE", boundary };

  it("loads the saved boundary as the draft, binds a photo read to the zone, and cannot save before something changed", async () => {
    boundaryApi.startScan.mockResolvedValue(ok({ scanId: "5a92b32d-2901-4560-9237-350be750cb20" }));
    boundaryApi.scanStatus.mockResolvedValue(ok({ status: "Done" as const, errorCode: null, reading }));
    render(<ZoneInfoTab {...props({ zone: { ...base, boundary } })} />);
    openDialog();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Cập nhật ranh giới V01/)).toBeTruthy();
    expect(within(dialog).getByLabelText("X của điểm K1, Khu 1")).toBeTruthy();
    expect(dialog.querySelectorAll("details")).toHaveLength(2);
    expect((within(dialog).getByRole("button", { name: "Lưu ranh giới" }) as HTMLButtonElement).disabled).toBe(true);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      fireEvent.change(within(dialog).getByLabelText("Ảnh sơ đồ cấp phép"), { target: { files: [new File([new Uint8Array([255, 216, 255])], "so-do.jpg", { type: "image/jpeg" })] } });
      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    } finally { vi.useRealTimers(); }
    expect(boundaryApi.startScan).toHaveBeenCalledWith(expect.any(File), base.id, expect.any(AbortSignal));
    expect(dialog.querySelectorAll("details")).toHaveLength(3);
    expect((within(dialog).getByRole("button", { name: "Lưu ranh giới" }) as HTMLButtonElement).disabled).toBe(false);
  });
  it("saves the edited boundary with the row version, closes, shows the rafts left outside and hands the record to the panel", async () => {
    const onSaved = vi.fn();
    boundaryApi.save.mockResolvedValue(ok({ zone: savedZone, warnings: [{ code: "RAFTS_OUTSIDE_ZONE_BOUNDARY", details: { count: 2, raftCodes: ["V01-B01", "V01-B02"] } }] }));
    render(<ZoneInfoTab {...props({ zone: { ...base, boundary }, onSaved })} />);
    openDialog();
    fireEvent.change(screen.getByLabelText("X của điểm K1, Khu 1"), { target: { value: "2315870.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ranh giới" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(savedZone));
    const [id, sent, rowVersion] = boundaryApi.save.mock.calls[0];
    expect([id, rowVersion]).toEqual([base.id, "AQID"]);
    expect(sent.features).toHaveLength(2);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toContain("2 bè đang nằm ngoài ranh giới mới: V01-B01, V01-B02");
    fireEvent.click(screen.getByRole("button", { name: "Đã xem" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("shows no warning when no raft is left outside", async () => {
    boundaryApi.save.mockResolvedValue(ok({ zone: savedZone, warnings: [] }));
    render(<ZoneInfoTab {...props({ zone: { ...base, boundary } })} />);
    openDialog();
    fireEvent.change(screen.getByLabelText("X của điểm K1, Khu 1"), { target: { value: "2315870.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ranh giới" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByRole("status")).toBeNull();
  });
  it("blocks saving while a corner has no valid number", () => {
    render(<ZoneInfoTab {...props({ zone: { ...base, boundary } })} />);
    openDialog();
    fireEvent.change(screen.getByLabelText("Y của điểm K2, Khu 1"), { target: { value: "" } });
    expect((screen.getByRole("button", { name: "Lưu ranh giới" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("alert", { name: "Cần sửa trước khi lưu" })).toBeTruthy();
  });
  it("keeps the draft and asks to reload when the record changed meanwhile (MSG06), then saves with the new row version", async () => {
    const onReload = vi.fn();
    boundaryApi.save.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false }).mockResolvedValue(ok({ zone: savedZone, warnings: [] }));
    const view = render(<ZoneInfoTab {...props({ zone: { ...base, boundary }, onReload })} />);
    openDialog();
    fireEvent.change(screen.getByLabelText("X của điểm K1, Khu 1"), { target: { value: "2315870.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ranh giới" }));
    await screen.findByRole("button", { name: "Tải lại hồ sơ" });
    expect(screen.getAllByRole("alert").map(alert => alert.textContent).join(" ")).toContain("Hồ sơ vùng đã thay đổi");
    expect((screen.getByRole("button", { name: "Lưu ranh giới" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Tải lại hồ sơ" }));
    expect(onReload).toHaveBeenCalledTimes(1);
    view.rerender(<ZoneInfoTab {...props({ zone: { ...base, boundary, rowVersion: "NEW" }, onReload })} />);
    expect((screen.getByLabelText("X của điểm K1, Khu 1") as HTMLInputElement).value).toBe("2315870.00");
    fireEvent.click(screen.getByRole("button", { name: "Lưu ranh giới" }));
    await waitFor(() => expect(boundaryApi.save).toHaveBeenCalledTimes(2));
    expect(boundaryApi.save.mock.calls[1][2]).toBe("NEW");
  });
  it("explains a zone that is no longer In Use, and a refused boundary, without losing the draft", async () => {
    boundaryApi.save.mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false })
      .mockResolvedValueOnce({ status: "error", httpStatus: 400, code: "MSG-GEN-01", problem: { field: "Boundary name" }, uncertain: false });
    render(<ZoneInfoTab {...props({ zone: { ...base, boundary } })} />);
    openDialog();
    fireEvent.change(screen.getByLabelText("X của điểm K1, Khu 1"), { target: { value: "2315870.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu ranh giới" }));
    expect((await screen.findAllByText(/không còn ở trạng thái đang sử dụng/)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "Lưu ranh giới" }));
    expect((await screen.findAllByText("Tên khu tối đa 100 ký tự.")).length).toBeGreaterThan(0);
    expect((screen.getByLabelText("X của điểm K1, Khu 1") as HTMLInputElement).value).toBe("2315870.00");
  });
  it("asks before dropping edits and closes at once when nothing changed", async () => {
    render(<ZoneInfoTab {...props({ zone: { ...base, boundary } })} />);
    openDialog();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    openDialog();
    fireEvent.change(screen.getByLabelText("X của điểm K1, Khu 1"), { target: { value: "2315870.00" } });
    fireEvent.click(screen.getByRole("button", { name: "Bỏ qua" }));
    expect(await screen.findByText("Bỏ các thay đổi chưa lưu?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(screen.queryByText("Bỏ các thay đổi chưa lưu?")).toBeNull());
    expect(boundaryApi.save).not.toHaveBeenCalled();
  });
});
