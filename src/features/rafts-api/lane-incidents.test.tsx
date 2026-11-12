// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";
import { raftFixture } from "@/features/farming-api/fixtures";
const api = vi.hoisted(() => ({ history: vi.fn(), save: vi.fn(), cycle: vi.fn(), photo: vi.fn() }));
const stock = vi.hoisted(() => ({ all: vi.fn() }));
vi.mock("./lane-incident-repository", () => ({ laneIncidentRepository: api }));
vi.mock("@/features/input-items/repository", () => ({ inputRepository: stock }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ children }: { children: import("react").ReactNode }) => <div role="dialog">{children}</div> }));
import { LaneIncidentsBoard } from "./lane-incidents-board";
import { LaneIncidentForm } from "./lane-incident-form";

const id = "00000000-0000-4000-8000-000000000001";
const props = { action: "damage" as const, raftId: id, raftCode: "KV01-B01", zoneId: id, laneNumber: 1, rowVersion: "raft-v1", hasSeed: true, cycleRowVersion: "cycle-v1", onClose: vi.fn(), onSaved: vi.fn() };
const incident = { id, laneNumber: 1, kind: "Damaged", occurredAt: "2026-11-12T10:00:00+07:00", recordedByName: "Nguyễn An", reason: "Đứt dây", materials: [{ itemId: id, itemCode: "VT01", unit: "m", quantity: 2 }] };
function form(extra: Partial<Parameters<typeof LaneIncidentForm>[0]> = {}) { return render(<ToastProvider><LaneIncidentForm {...props} {...extra} /></ToastProvider>); }
beforeEach(() => {
  api.history.mockResolvedValue({ status: "success", data: { incidents: [incident] } });
  api.cycle.mockResolvedValue({ status: "success", data: { cycle: { rowVersion: "cycle-v1" }, lanes: [{ laneNumber: 1, state: "Growing" }] } });
  api.save.mockResolvedValue({ status: "success", data: { incident } });
  stock.all.mockResolvedValue({ status: "success", data: [{ id, code: "VT01", name: "Dây", group: "Material", statusId: 101, unit: "m", onHand: 5 }] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe("lane incidents", () => {
  it("requires a reason, confirms damage and sends the raft version", async () => {
    form();
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText("Nhập lý do (tối đa 500 ký tự).")).toBeTruthy();
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Lý do *"), { target: { value: "Đứt dây" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("damage", { id, zoneId: id, laneNumber: 1 }, { rowVersion: "raft-v1", reason: "Đứt dây" }));
    expect(props.onSaved).toHaveBeenCalledOnce();
  });
  it("loads real stock with units, prevents excess, and retains quantities on refusal", async () => {
    api.save.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-INPUT-01", uncertain: false });
    form({ action: "repair" });
    fireEvent.click(await screen.findByRole("checkbox", { name: /VT01/ }));
    const quantity = screen.getByLabelText("Số lượng VT01 *");
    fireEvent.change(screen.getByLabelText("Nội dung sửa *"), { target: { value: "Buộc dây mới" } });
    fireEvent.change(quantity, { target: { value: "6" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText("Số lượng vật tư phải nằm trong tồn kho hiện có.")).toBeTruthy();
    expect(api.save).not.toHaveBeenCalled();
    fireEvent.change(quantity, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("repair", expect.anything(), { rowVersion: "raft-v1", reason: "Buộc dây mới", materials: [{ itemId: id, quantity: 2, unit: "m" }] }));
    expect((await screen.findByRole("alert")).textContent).toContain("Số lượng còn lại không đủ");
    expect((quantity as HTMLInputElement).value).toBe("2");
    expect(screen.getByText("Tồn kho: 5 m")).toBeTruthy();
  });
  it("quietly disables a missing mutation and exposes an empty-stock alternative", async () => {
    api.save.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
    form(); fireEvent.change(screen.getByLabelText("Lý do *"), { target: { value: "Hỏng" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    expect(await screen.findByText("Chưa có thao tác khả dụng cho làn này.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    cleanup(); stock.all.mockResolvedValue({ status: "success", data: [] }); form({ action: "repair" });
    expect(await screen.findByText(/Kho chưa có vật tư/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Xem Vật tư & Giống" }).getAttribute("href")).toBe("/inputs/items");
  });
  it("only exposes actions in the opened row, shows history materials and tolerates a 404", async () => {
    const raft = raftFixture(); raft.lanes = [{ ...raft.lanes[0], isDamaged: false, state: "Growing" }];
    const view = render(<ToastProvider><LaneIncidentsBoard raft={raft} onChanged={vi.fn()} /></ToastProvider>);
    expect(screen.queryByRole("button", { name: "Báo hỏng" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Làn 1/ }));
    expect(await screen.findByRole("button", { name: "Báo hỏng" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Lịch sử" }));
    expect(await screen.findByText(/Nguyễn An/)).toBeTruthy();
    expect(screen.getByText("Vật tư VT01 (m): — → 2")).toBeTruthy();
    view.unmount(); api.history.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
    render(<ToastProvider><LaneIncidentsBoard raft={raft} onChanged={vi.fn()} /></ToastProvider>);
    fireEvent.click(screen.getByRole("button", { name: /Làn 1/ }));
    expect(await screen.findByText("Chưa có lịch sử sự cố của làn.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Báo hỏng" })).toBeNull(); expect(screen.queryByRole("alert")).toBeNull();
  });
  it("hides a removed lane, offers no action on an out-of-service lane and offers repair on a damaged one", async () => {
    const raft = raftFixture(), base = raft.lanes[0];
    raft.lanes = [{ ...base, id, laneNumber: 1, statusId: 2001, isDamaged: true, isOutOfService: false }, { ...base, id: "00000000-0000-4000-8000-000000000002", laneNumber: 2, statusId: 2001, isDamaged: false, isOutOfService: true },
      { ...base, id: "00000000-0000-4000-8000-000000000003", laneNumber: 3, statusId: 2002, isDamaged: false, isOutOfService: false }];
    render(<ToastProvider><LaneIncidentsBoard raft={raft} onChanged={vi.fn()} /></ToastProvider>);
    expect(screen.queryByRole("button", { name: /Làn 3/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Làn 2/ }).textContent).toContain("Ngừng hoạt động");
    fireEvent.click(screen.getByRole("button", { name: /Làn 1/ }));
    expect(await screen.findByRole("button", { name: "Sửa làn" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Báo hỏng" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Làn 2/ }));
    await screen.findByRole("button", { name: "Lịch sử" });
    expect(screen.queryByRole("button", { name: "Sửa làn" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Ngừng hoạt động$/ })).toBeNull();
  });
  it("states the unquantified loss, confirms discontinuation, and changes cancel role without submitting", async () => {
    const closed = vi.fn();
    form({ action: "discontinue", onSaved: closed });
    expect(screen.getByText(/Làn đang có giống:/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Lý do *"), { target: { value: "Không sửa được" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText(/Một sự kiện mất giống không số lượng/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(api.save).toHaveBeenCalledWith("discontinue", expect.anything(), { rowVersion: "raft-v1", reason: "Không sửa được", confirm: true, cycleRowVersion: "cycle-v1" }));
    expect(screen.getByRole("button", { name: "Tải lại làn" }).getAttribute("type")).toBe("button");
    fireEvent.click(screen.getByRole("button", { name: "Tải lại làn" }));
    expect(api.save).toHaveBeenCalledOnce();
  });
  it("keeps a saved incident separate from a failed optional photo and never replays it", async () => {
    api.photo.mockResolvedValue({ status: "error", httpStatus: 404, uncertain: false });
    form();
    fireEvent.change(screen.getByLabelText("Lý do *"), { target: { value: "Đứt" } });
    fireEvent.change(screen.getByLabelText(/Ảnh sự cố/), { target: { files: [new File(["png"], "a.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    expect(await screen.findByText(/Sự cố đã lưu. Chưa gửi được ảnh/)).toBeTruthy();
    expect(api.photo).toHaveBeenCalledWith({ id, zoneId: id, laneNumber: 1 }, id, expect.any(File));
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(api.save).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Tải lại làn" }).getAttribute("type")).toBe("button");
    api.photo.mockResolvedValue({ status: "success", data: { done: true } });
    fireEvent.click(screen.getByRole("button", { name: "Gửi lại ảnh" }));
    await waitFor(() => expect(api.photo).toHaveBeenCalledTimes(2));
    expect(api.save).toHaveBeenCalledOnce();
  });
  it("requires history comparison and explicit review before retrying an uncertain photo", async () => {
    api.photo.mockResolvedValueOnce({ status: "error", httpStatus: 0, uncertain: true }).mockResolvedValueOnce({ status: "success", data: { done: true } });
    form(); fireEvent.change(screen.getByLabelText("Lý do *"), { target: { value: "Đứt" } });
    fireEvent.change(screen.getByLabelText(/Ảnh sự cố/), { target: { files: [new File(["png"], "a.png", { type: "image/png" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" })); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    const retry = await screen.findByRole("button", { name: "Gửi lại ảnh" }); expect((retry as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Đối chiếu ảnh trong lịch sử" }));
    await screen.findByText(/Lịch sử hiện có 0 ảnh/); fireEvent.click(retry);
    expect(api.photo).toHaveBeenCalledOnce(); fireEvent.click(await screen.findByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(api.photo).toHaveBeenCalledTimes(2)); expect(api.save).toHaveBeenCalledOnce();
  });
});
