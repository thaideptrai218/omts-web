// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const mocks = vi.hoisted(() => ({ detail: vi.fn(), cycles: vi.fn(), write: vi.fn(), ops: vi.fn(), costs: vi.fn(), log: vi.fn(), params: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mocks.params) }));
vi.mock("./raft-model", async original => ({ ...(await original<typeof import("./raft-model")>()), readRaftDetail: mocks.detail }));
vi.mock("@/features/cycles-api/repository", () => ({ readCycles: mocks.cycles, writeCycle: mocks.write, readCycleSummary: vi.fn(), readClosePreview: vi.fn(), closeCycle: vi.fn() }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: () => ({ read: mocks.ops, write: vi.fn(), post: vi.fn(), upload: vi.fn() }) }));
vi.mock("@/features/purchase-documents/repository", () => ({ getRaftCosts: mocks.costs }));
vi.mock("@/features/cycles-api/log-repository", async original => ({ ...(await original<typeof import("@/features/cycles-api/log-repository")>()), logRequest: mocks.log }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("@/features/history/record-history", () => ({ RecordHistory: () => null }));
vi.mock("@/features/cycles-api/cycle-journey-tab", () => ({ CycleJourneyTab: ({ part, row }: { part: string; row: { cycle?: { id: string } | null } }) => <section aria-label="Hành trình chu kỳ">{part} {row.cycle?.id}</section> }));
vi.mock("@/features/cycles-api/cycle-plan-tab", () => ({ CyclePlanTab: () => <p>Biểu mẫu kế hoạch</p> }));
vi.mock("./lane-incidents-board", () => ({ LaneIncidentsBoard: () => <p>Sơ đồ làn</p> }));
vi.mock("@/features/cultivation-api/records-material-form", () => ({ MaterialForm: ({ zoneId, raftId, cycleId, record, onSaved, onClose }: { zoneId: string; raftId: string; cycleId?: string; record: unknown; onSaved(): void; onClose(): void }) =>
  <div role="dialog" aria-label="Ghi nhận sử dụng vật tư"><p>vùng {zoneId} · bè {raftId} · chu kỳ {cycleId} · {record === null ? "mới" : "sửa"}</p><button type="button" onClick={onSaved}>Lưu</button><button type="button" onClick={onClose}>Bỏ qua</button></div> }));
import { RaftDetailPanel, type RaftAccess } from "./raft-detail-panel";

const zone = "5a92b32d-2901-4560-9237-350be750cb10", raft = "5a92b32d-2901-4560-9237-350be750cb13", cycle = "5a92b32d-2901-4560-9237-350be750cb20", older = "5a92b32d-2901-4560-9237-350be750cb21";
const record = (patch: object = {}) => ({ id: raft, code: "QA-RAFT", statusId: 101, status: "In Use", laneCount: 10, latitude: 21, longitude: 107, location: "Cửa sông", size: "20 x 10 m", conditionNotes: null, rowVersion: "AQID",
  lanes: [{ id: "5a92b32d-2901-4560-9237-350be750cb30", laneNumber: 1, statusId: 2001, status: "In Use" }], ...patch });
const open = { farming: 6, notSeeded: 4, harvested: 0, damaged: 0, outOfService: 0 };
const currentCycle = { id: cycle, startDate: "2026-11-12", daysFarming: 15, seedNames: ["Hàu giống A"], laneSummary: open };
const summary = (over: object) => ({ id: cycle, startDate: "2026-11-12", closeDate: null, statusId: 601, status: "Open", rowVersion: "A", nurseryBatchId: null, ...over });
const access: RaftAccess = { edit: true, photoEdit: true, cycles: true, costs: true, logs: true, materialCreate: true,
  cycle: { view: true, create: true, edit: true, remove: true, logs: true, logsCreate: true, logsEdit: true } };
const guard = { dirty: { current: false }, pending: { current: false }, leave: async (apply: () => void) => apply(), dialog: null } as never;
const onChanged = vi.fn();
const mount = (patch: object = {}, rights: RaftAccess = access, initialTab?: string) => {
  mocks.detail.mockResolvedValue({ status: "success", data: record(patch) });
  return render(<ToastProvider><RaftDetailPanel id={raft} zoneId={zone} zoneLabel="QA01 · Vùng QA" access={rights} guard={guard} initialTab={initialTab} onChanged={onChanged} /></ToastProvider>);
};
const tab = (name: string) => screen.getByRole("tab", { name });
const readsOf = (action: string) => mocks.cycles.mock.calls.filter(([query]) => query.action === action);

beforeEach(() => {
  mocks.params = "";
  mocks.cycles.mockImplementation(async (query: { action: string }) => query.action === "history" ? { status: "success", data: [summary({})] } : { status: "success", data: [] });
  mocks.ops.mockResolvedValue({ status: "success", data: record({ zone: { id: zone, code: "QA01", name: "Vùng QA" }, photos: [] }) });
  mocks.costs.mockResolvedValue({ status: "success", data: { materialCost: 0, rafts: [] } });
  mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "list" ? [] : {} }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("raft detail loads lazily", () => {
  it("makes exactly one read when a raft opens, and shows Hiện trạng from the record without water", async () => {
    mount({ currentCycle });
    expect((await screen.findByLabelText("Hiện trạng")).textContent).toContain("Chu kỳ đang mở từ 12/11/2026 · 15 ngày nuôi · Giống: Hàu giống A · 6/10 làn đang nuôi · 4 chưa thả");
    expect(screen.queryByText(/pH|Đo nước|nước/)).toBeNull();
    expect(mocks.detail).toHaveBeenCalledTimes(1);
    for (const other of [mocks.cycles, mocks.ops, mocks.costs, mocks.log]) expect(other).not.toHaveBeenCalled();
    expect(screen.getAllByRole("tab").map(item => item.textContent)).toEqual(["Thông tin", "Chu kỳ nuôi", "Nhật ký", "Vật tư", "Làn & ảnh"]);
  });
  it("reads each tab's data only when the tab is first opened", async () => {
    mount({ currentCycle });
    await screen.findByLabelText("Hiện trạng");
    fireEvent.click(tab("Chu kỳ nuôi"));
    await screen.findByLabelText("Hành trình chu kỳ");
    expect(readsOf("history")).toHaveLength(1);
    expect(mocks.log).not.toHaveBeenCalled(); expect(mocks.costs).not.toHaveBeenCalled(); expect(mocks.ops).not.toHaveBeenCalled();
    fireEvent.click(tab("Nhật ký"));
    await waitFor(() => expect(mocks.log).toHaveBeenCalledWith("list", cycle, expect.anything(), undefined, undefined, expect.anything()));
    expect(mocks.costs).not.toHaveBeenCalled();
    fireEvent.click(tab("Vật tư"));
    await waitFor(() => expect(mocks.costs).toHaveBeenCalledWith(raft, expect.anything()));
    expect(mocks.ops).not.toHaveBeenCalled();
    fireEvent.click(tab("Làn & ảnh"));
    await waitFor(() => expect(mocks.ops).toHaveBeenCalledWith("detail", { id: raft }, expect.anything(), expect.anything()));
    await waitFor(() => expect(readsOf("progress")).toHaveLength(1));
    expect(mocks.detail).toHaveBeenCalledTimes(1);
  });
  it("shows no Hiện trạng claim when the backend does not send the open cycle yet, and says 'Chưa có chu kỳ' when there is none", async () => {
    mount();
    await screen.findByRole("tab", { name: "Thông tin" });
    expect(screen.queryByLabelText("Hiện trạng")).toBeNull();
    cleanup();
    mount({ currentCycle: null });
    expect(await screen.findByText("Chưa có chu kỳ")).toBeTruthy();
  });
  it("replaces the raw coordinates with a link to the zone map and keeps the footer actions", async () => {
    mount({ currentCycle: null });
    const link = await screen.findByRole("link", { name: "Xem trên bản đồ" });
    expect(link.getAttribute("href")).toBe(`/farming/zones?recordId=${zone}&tab=map`);
    expect(screen.queryByText("Vĩ độ")).toBeNull(); expect(screen.queryByText("Kinh độ")).toBeNull();
    expect(screen.getByRole("button", { name: "Ngừng sử dụng bè" })).toBeTruthy(); expect(screen.getByRole("button", { name: "Chỉnh sửa" })).toBeTruthy();
  });
  it("opens the tab a link asked for, including the names of the old cycle screen, and falls back to Thông tin for a tab the account may not read", async () => {
    mount({ currentCycle }, access, "journey");
    expect(await screen.findByLabelText("Hành trình chu kỳ")).toBeTruthy();
    expect(tab("Chu kỳ nuôi").getAttribute("aria-selected")).toBe("true");
    cleanup();
    mount({ currentCycle }, { ...access, cycles: false, logs: false }, "cycles");
    await screen.findByLabelText("Hiện trạng");
    expect(tab("Thông tin").getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByRole("tab", { name: "Chu kỳ nuôi" })).toBeNull();
  });
});

describe("Chu kỳ nuôi tab", () => {
  it("offers to start a cycle when none is open and lists the finished ones below", async () => {
    mocks.cycles.mockImplementation(async (query: { action: string }) => query.action === "history" ? { status: "success", data: [summary({ id: older, startDate: "2026-05-01", closeDate: "2026-08-01", statusId: 602, status: "Closed" })] } : { status: "success", data: [] });
    mount({ currentCycle: null });
    fireEvent.click(await screen.findByRole("tab", { name: "Chu kỳ nuôi" }));
    expect(await screen.findByText("Bè này chưa có chu kỳ nuôi")).toBeTruthy();
    expect(screen.queryByLabelText("Hành trình chu kỳ")).toBeNull();
    const history = screen.getByLabelText("Lịch sử chu kỳ");
    expect(within(history).getByText("01/05/2026")).toBeTruthy(); expect(within(history).getByText("Đã đóng")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu chu kỳ nuôi" }));
    expect(await screen.findByRole("dialog", { name: "Bắt đầu chu kỳ nuôi · QA-RAFT" })).toBeTruthy();
  });
  it("starts a cycle from the tab: asks the nursery batch and yield, sends the start for this raft, reads the cycles again and reports the change", async () => {
    const batch = "00000000-0000-4000-8000-0000000000b1";
    let started = false;
    mocks.cycles.mockImplementation(async (query: { action: string }) => query.action === "nursery-available" ? { status: "success", data: [{ id: batch, code: "NU000007", name: "Hàu giống", remaining: 9500 }] }
      : query.action === "history" ? { status: "success", data: started ? [summary({})] : [] } : { status: "success", data: [] });
    mocks.write.mockImplementation(async () => { started = true; return { status: "success", data: { cycle: { id: cycle } } }; });
    mount({ currentCycle: null });
    fireEvent.click(await screen.findByRole("tab", { name: "Chu kỳ nuôi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu chu kỳ nuôi" }));
    const dialog = await screen.findByRole("dialog", { name: "Bắt đầu chu kỳ nuôi · QA-RAFT" });
    fireEvent.change(await within(dialog).findByRole("combobox", { name: "Đợt ươm (loại giống đã ươm) *" }), { target: { value: batch } });
    fireEvent.change(within(dialog).getByLabelText("Sản lượng dự kiến (kg) *"), { target: { value: "2000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Tiếp tục" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Xác nhận bắt đầu chu kỳ" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith("Đã bắt đầu chu kỳ nuôi"));
    expect(mocks.write.mock.calls[0].slice(0, 2)).toEqual(["start", raft]);
    expect((await screen.findByLabelText("Hành trình chu kỳ")).textContent).toBe(`all ${cycle}`);
    expect(mocks.detail).toHaveBeenCalledTimes(2);
  });
  it("hides the start button without the Create right or for a raft not in use", async () => {
    mocks.cycles.mockResolvedValue({ status: "success", data: [] });
    mount({ currentCycle: null }, { ...access, cycle: { ...access.cycle!, create: false } });
    fireEvent.click(await screen.findByRole("tab", { name: "Chu kỳ nuôi" }));
    await screen.findByText("Bè này chưa có chu kỳ nuôi");
    expect(screen.queryByRole("button", { name: "Bắt đầu chu kỳ nuôi" })).toBeNull();
    cleanup();
    mount({ currentCycle: null, statusId: 102 });
    fireEvent.click(await screen.findByRole("tab", { name: "Chu kỳ nuôi" }));
    await screen.findByText(/Bè ngừng sử dụng/);
    expect(screen.queryByRole("button", { name: "Bắt đầu chu kỳ nuôi" })).toBeNull();
  });
  it("shows the journey of the open cycle with its plan, and nothing to start", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Chu kỳ nuôi" }));
    expect((await screen.findByLabelText("Hành trình chu kỳ")).textContent).toBe(`all ${cycle}`);
    expect(screen.getByText("Kế hoạch chu kỳ")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Bắt đầu chu kỳ nuôi" })).toBeNull();
    expect(screen.getByLabelText("Lịch sử chu kỳ")).toBeTruthy();
  });
});

describe("Nhật ký tab", () => {
  it("lists the care logs of the open cycle and offers Ghi nhật ký chăm sóc", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    expect(await screen.findByText("Chu kỳ chưa có nhật ký chăm sóc.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ghi nhật ký chăm sóc" })).toBeTruthy();
    expect(readsOf("history")).toHaveLength(0);
  });
  it("shows an empty state, without reads, when no cycle is open", async () => {
    mount({ currentCycle: null });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    expect(await screen.findByText(/chưa có chu kỳ đang mở nên chưa có nhật ký/)).toBeTruthy();
    expect(mocks.log).not.toHaveBeenCalled();
  });
  it("finds the open cycle in the cycle history while the backend does not send it on the raft", async () => {
    mount();
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    await waitFor(() => expect(mocks.log).toHaveBeenCalledWith("list", cycle, expect.anything(), undefined, undefined, expect.anything()));
    expect(readsOf("history")).toHaveLength(1);
  });
});

describe("Vật tư tab", () => {
  it("opens the material-use form with the zone, raft and open cycle already set and reads the costs again after a save", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    await waitFor(() => expect(mocks.costs).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Dùng vật tư" }));
    const form = await screen.findByRole("dialog", { name: "Ghi nhận sử dụng vật tư" });
    expect(within(form).getByText(`vùng ${zone} · bè ${raft} · chu kỳ ${cycle} · mới`)).toBeTruthy();
    fireEvent.click(within(form).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(mocks.costs).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("offers no Dùng vật tư without an open cycle, without the Create right or for a raft not in use", async () => {
    mount({ currentCycle: null });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    expect(await screen.findByText(/chưa ghi nhận được sử dụng vật tư/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Dùng vật tư" })).toBeNull();
    cleanup();
    mount({ currentCycle }, { ...access, materialCreate: false });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    await waitFor(() => expect(mocks.costs).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Dùng vật tư" })).toBeNull();
    cleanup();
    mount({ currentCycle, statusId: 102 });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    await waitFor(() => expect(mocks.costs).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Dùng vật tư" })).toBeNull();
  });
});
