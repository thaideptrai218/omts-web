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
vi.mock("@/features/history/record-history", () => ({ RecordHistory: () => null, EditedRecordHistory: ({ id }: { id: string }) => <p>Xem lịch sử {id}</p> }));
vi.mock("@/features/cycles-api/cycle-journey-tab", () => ({ CycleJourneyTab: ({ part, row, onRecord }: { part: string; row: { cycle?: { id: string } | null }; onRecord?(action: unknown): void }) => <section aria-label="Hành trình chu kỳ">{part} {row.cycle?.id}
  <button type="button" onClick={() => onRecord?.({ key: "journey-seeding-record", label: "Ghi nhận thả giống", screen: "seeding" })}>Ghi nhận thả giống</button></section> }));
vi.mock("./raft-journey-record", () => ({ JourneyRecordDialog: ({ action, cycleId, zoneId, onDone, onClose }: { action: { key: string }; cycleId: string; zoneId: string; onDone(): void; onClose(): void }) =>
  <div role="dialog" aria-label="Thả giống tại chỗ"><p>{action.key} · {zoneId} · {cycleId}</p><button type="button" onClick={onDone}>Lưu xong</button><button type="button" onClick={onClose}>Đóng</button></div> }));
vi.mock("@/features/cycles-api/cycle-plan-tab", () => ({ CyclePlanTab: () => <><p>Kế hoạch: sản lượng dự kiến</p><button type="button">Chỉnh sửa kế hoạch</button></> }));
vi.mock("./lane-incidents-board", () => ({ LaneIncidentsBoard: ({ liveLanes }: { liveLanes?: unknown[] }) => <section aria-label="Các làn của bè">Sơ đồ làn · {liveLanes?.length ?? 0} làn tiến độ</section> }));
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
const usage = (patch: object) => ({ id: "5a92b32d-2901-4560-9237-350be750cb40", raftId: raft, raftCode: "QA-RAFT", cycleId: cycle, usageDate: "2026-11-20", repairReason: "Thay phao", itemId: "5a92b32d-2901-4560-9237-350be750cb41", itemCode: "VT01", itemName: "Phao nhựa", unit: "cái",
  quantity: 4, recordedByName: "Lan", recordedAt: "2026-11-20T03:30:00+00:00", canEdit: true, rowVersion: "A", issueId: "5a92b32d-2901-4560-9237-350be750cb50", issueCode: "XD000012", ...patch });
const materials = { raftId: raft, raftCode: "QA-RAFT", canRecord: true, groups: [{ cycle: null, locked: false, repairs: [{ usageDate: "2026-11-20", repairReason: "Thay phao", records: [usage({}), usage({ id: "5a92b32d-2901-4560-9237-350be750cb42", itemCode: "VT02", itemName: "Dây neo", quantity: 2, unit: "sợi" })] }] }] };
const costsOf = { materialCost: 500000, unpricedCount: 0, raft: { id: raft, code: "QA-RAFT" }, usages: [{ usageId: "5a92b32d-2901-4560-9237-350be750cb40", date: "2026-11-20", itemCode: "VT01", itemName: "Phao nhựa", unit: "cái", quantity: 4, unitPrice: 100000, amount: 400000, unpriced: false },
  { usageId: "5a92b32d-2901-4560-9237-350be750cb42", date: "2026-11-20", itemCode: "VT02", itemName: "Dây neo", unit: "sợi", quantity: 2, unitPrice: 50000, amount: 100000, unpriced: false }] };
const log = (patch: object) => ({ id: "5a92b32d-2901-4560-9237-350be750cb60", cycleId: cycle, raftId: raft, raftCode: "QA-RAFT", visitDate: "2026-11-21", logType: "CLEANING", notes: "Vệ sinh lưới, kiểm tra phao neo và dây buộc các làn phía đông", photos: [{ key: "k1", sortOrder: 1, url: "x" }, { key: "k2", sortOrder: 2, url: "y" }],
  recordedByAccountId: "5a92b32d-2901-4560-9237-350be750cb61", recordedByName: "Minh", recordedAt: "2026-11-21T02:15:00+00:00", canCorrect: true, rowVersion: "A", ...patch });
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
  mocks.ops.mockImplementation(async (action: string) => ({ status: "success", data: action === "list" ? materials : { ...record(), zone: { id: zone, code: "QA01", name: "Vùng QA" }, photos: [{ id: "5a92b32d-2901-4560-9237-350be750cb70", sortOrder: 1, url: "/api/operations/raft-details?action=photo&id=x&photoId=y" }] } }));
  mocks.costs.mockResolvedValue({ status: "success", data: { materialCost: 500000, rafts: [costsOf] } });
  mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "raft-list" ? [] : {} }));
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("raft detail loads lazily", () => {
  it("reads only the raft record and the photos of Thông tin when a raft opens, and shows Hiện trạng from the record without water", async () => {
    mount({ currentCycle });
    expect((await screen.findByLabelText("Hiện trạng")).textContent).toContain("Chu kỳ đang mở từ 12/11/2026 · 15 ngày nuôi · Giống: Hàu giống A · 6/10 làn đang nuôi · 4 chưa thả");
    expect(screen.queryByText(/pH|Đo nước|nước/)).toBeNull();
    expect(mocks.detail).toHaveBeenCalledTimes(1);
    for (const other of [mocks.cycles, mocks.costs, mocks.log]) expect(other).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.ops).toHaveBeenCalledTimes(1));
    expect(mocks.ops).toHaveBeenCalledWith("detail", { id: raft }, expect.anything(), expect.anything());
    expect(screen.getAllByRole("tab").map(item => item.textContent)).toEqual(["Thông tin", "Chu kỳ nuôi", "Nhật ký", "Vật tư", "Làn"]);
  });
  it("reads each tab's data only when the tab is first opened", async () => {
    mount({ currentCycle });
    await screen.findByLabelText("Hiện trạng");
    await waitFor(() => expect(mocks.ops).toHaveBeenCalledTimes(1));
    mocks.ops.mockClear();
    fireEvent.click(tab("Chu kỳ nuôi"));
    await screen.findByLabelText("Hành trình chu kỳ");
    expect(readsOf("history")).toHaveLength(1);
    expect(mocks.log).not.toHaveBeenCalled(); expect(mocks.costs).not.toHaveBeenCalled(); expect(mocks.ops).not.toHaveBeenCalled();
    fireEvent.click(tab("Nhật ký"));
    await waitFor(() => expect(mocks.log).toHaveBeenCalledWith("raft-list", raft, expect.anything(), undefined, undefined, expect.anything()));
    expect(mocks.costs).not.toHaveBeenCalled();
    fireEvent.click(tab("Vật tư"));
    await waitFor(() => expect(mocks.costs).toHaveBeenCalledWith(raft, expect.anything()));
    await waitFor(() => expect(mocks.ops).toHaveBeenCalledWith("list", { id: raft, zoneId: zone }, expect.anything(), expect.anything()));
    mocks.ops.mockClear();
    fireEvent.click(tab("Làn"));
    await waitFor(() => expect(readsOf("progress")).toHaveLength(1));
    expect(mocks.ops).not.toHaveBeenCalled();
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
    expect((await screen.findByLabelText("Hành trình chu kỳ")).textContent).toContain(`all ${cycle}`);
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
  it("shows the journey of the open cycle and nothing to start; the plan is a button in the footer, not an inline card", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Chu kỳ nuôi" }));
    expect((await screen.findByLabelText("Hành trình chu kỳ")).textContent).toContain(`all ${cycle}`);
    expect(screen.queryByRole("button", { name: "Bắt đầu chu kỳ nuôi" })).toBeNull();
    expect(screen.queryByText(/Kế hoạch: sản lượng dự kiến/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Kế hoạch chu kỳ" }));
    const plan = await screen.findByRole("dialog", { name: "Kế hoạch chu kỳ" });
    expect(within(plan).getByRole("button", { name: "Chỉnh sửa kế hoạch" })).toBeTruthy();
  });
  it("records seeding in a window on this screen with the zone and open cycle, and reads the tab again once saved without a second toast", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Chu kỳ nuôi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ghi nhận thả giống" }));
    const form = await screen.findByRole("dialog", { name: "Thả giống tại chỗ" });
    expect(within(form).getByText(`journey-seeding-record · ${zone} · ${cycle}`)).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Chu kỳ nuôi" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(within(form).getByRole("button", { name: "Lưu xong" }));
    await waitFor(() => expect(readsOf("history")).toHaveLength(2));
    expect(onChanged).toHaveBeenCalledWith("");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("lists past cycles with the cycle as a link that opens a read-only card", async () => {
    mocks.cycles.mockImplementation(async (query: { action: string }) => query.action === "history" ? { status: "success", data: [summary({ id: older, startDate: "2026-05-01", closeDate: "2026-08-01", statusId: 602, status: "Closed" })] } : { status: "success", data: [] });
    mount({ currentCycle: null });
    fireEvent.click(await screen.findByRole("tab", { name: "Chu kỳ nuôi" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem chu kỳ từ 01/05/2026" }));
    const card = await screen.findByRole("dialog", { name: "Chu kỳ từ 01/05/2026" });
    expect(within(card).getByText("01/08/2026")).toBeTruthy();
    expect(within(card).getByLabelText("Hành trình chu kỳ").textContent).toContain(`all ${older}`);
    expect(within(card).queryByRole("button", { name: /Chỉnh sửa|Kết thúc/ })).toBeNull();
  });
});

describe("Nhật ký tab", () => {
  it("lists the care logs of the open cycle as a table, the care date being the link, and offers + Ghi nhật ký", async () => {
    mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "raft-list" ? [log({})] : {} }));
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    const row = (await screen.findByRole("button", { name: "Xem nhật ký ngày 21/11/2026" })).closest("tr")!;
    expect(within(row).getByText("21/11/2026 09:15")).toBeTruthy();
    expect(within(row).getByText("Vệ sinh bè/lồng")).toBeTruthy();
    expect(within(row).getByText("Minh")).toBeTruthy();
    expect(within(row).getByText(/Vệ sinh lưới/)).toBeTruthy();
    expect(within(row).getByText("2")).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Nhật ký", "Chu kỳ", "Loại", "Thời gian ghi", "Người ghi", "Nội dung", "Ảnh"]);
    expect(screen.getByRole("button", { name: "Ghi nhật ký" })).toBeTruthy();
    expect(readsOf("history")).toHaveLength(0);
  });
  it("opens a log as a card with its photos and the actions the backend allows, and removes it with a reason", async () => {
    mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "raft-list" ? [log({})] : { removed: true } }));
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem nhật ký ngày 21/11/2026" }));
    const card = await screen.findByRole("dialog", { name: "Nhật ký ngày 21/11/2026" });
    expect(within(card).getAllByRole("button", { name: /Phóng to Ảnh/ })).toHaveLength(2);
    expect(within(card).getByRole("button", { name: "Sửa" })).toBeTruthy();
    fireEvent.click(within(card).getByRole("button", { name: "Gỡ nhật ký" }));
    fireEvent.change(await screen.findByLabelText("Lý do"), { target: { value: "Ghi nhầm" } });
    fireEvent.click(screen.getByRole("button", { name: "Đồng ý" }));
    await waitFor(() => expect(mocks.log).toHaveBeenCalledWith("remove", log({}).id, expect.anything(), { reason: "Ghi nhầm" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Nhật ký ngày 21/11/2026" })).toBeNull());
  });
  it("filters the log table by type, shows a log without a type as Khác, and shows the type in the card", async () => {
    mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "raft-list" ? [log({}), log({ id: "5a92b32d-2901-4560-9237-350be750cb62", visitDate: "2026-11-22", logType: undefined, recordedAt: "2026-11-22T02:15:00+00:00" })] : {} }));
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    await screen.findByRole("button", { name: "Xem nhật ký ngày 22/11/2026" });
    expect(within(screen.getByRole("button", { name: "Xem nhật ký ngày 22/11/2026" }).closest("tr")!).getByText("Khác")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Lọc theo loại nhật ký"), { target: { value: "CLEANING" } });
    expect(screen.queryByRole("button", { name: "Xem nhật ký ngày 22/11/2026" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem nhật ký ngày 21/11/2026" }));
    const card = await screen.findByRole("dialog", { name: "Nhật ký ngày 21/11/2026" });
    expect(within(card).getByText("Vệ sinh bè/lồng")).toBeTruthy();
    expect(within(card).getByText(/Xem lịch sử/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Lọc theo loại nhật ký"), { target: { value: "DISEASE" } });
  });
  it("creates a log with the chosen type", async () => {
    mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "raft-list" ? [] : { log: log({}) } }));
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ghi nhật ký" }));
    const form = await screen.findByRole("dialog", { name: "Ghi nhật ký chăm sóc" });
    fireEvent.change(within(form).getByLabelText("Loại nhật ký *"), { target: { value: "REPAIR" } });
    fireEvent.change(within(form).getByLabelText("Thêm ảnh", { selector: "input" }), { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
    fireEvent.click(within(form).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(mocks.log.mock.calls.some(call => call[0] === "raft-create")).toBe(true));
    const call = mocks.log.mock.calls.find(item => item[0] === "raft-create")!;
    expect(call[1]).toBe(raft); expect(call[3]).toMatchObject({ logType: "REPAIR" });
  });
  it("hides Sửa and Gỡ for a log the backend no longer lets this account correct", async () => {
    mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "raft-list" ? [log({ canCorrect: false })] : {} }));
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem nhật ký ngày 21/11/2026" }));
    const card = await screen.findByRole("dialog", { name: "Nhật ký ngày 21/11/2026" });
    expect(within(card).queryByRole("button", { name: "Sửa" })).toBeNull(); expect(within(card).queryByRole("button", { name: "Gỡ nhật ký" })).toBeNull();
  });
  it("opens the log form in groups with photo previews that can be dropped before saving", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    fireEvent.click(await screen.findByRole("button", { name: "Ghi nhật ký" }));
    const form = await screen.findByRole("dialog", { name: "Ghi nhật ký chăm sóc" });
    expect((within(form).getByLabelText("Loại nhật ký *") as HTMLSelectElement).value).toBe("OTHER");
    expect(within(form).getByText("Thông tin nhật ký")).toBeTruthy(); expect(within(form).getByText("Ảnh chăm sóc")).toBeTruthy();
    const input = within(form).getByLabelText("Thêm ảnh", { selector: "input" });
    fireEvent.change(input, { target: { files: [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })] } });
    expect(await within(form).findByRole("button", { name: "Phóng to a.png" })).toBeTruthy();
    fireEvent.click(within(form).getByRole("button", { name: "Bỏ ảnh a.png" }));
    expect(within(form).queryByRole("button", { name: "Phóng to a.png" })).toBeNull();
    expect(within(form).getByRole("button", { name: "Phóng to b.png" })).toBeTruthy();
  });
  it("lists and writes logs on a raft with no open cycle, marking a log outside every cycle", async () => {
    mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "raft-list" ? [log({ cycleId: null, cycleStartDate: null }), log({ id: "5a92b32d-2901-4560-9237-350be750cb63", visitDate: "2026-11-20", cycleStartDate: "2026-09-02" })] : {} }));
    mount({ currentCycle: null, statusId: 102 });
    fireEvent.click(await screen.findByRole("tab", { name: "Nhật ký" }));
    const rows = await screen.findAllByRole("row");
    expect(within(rows[1]).getByText("Không thuộc chu kỳ")).toBeTruthy();
    expect(within(rows[2]).getByText("Từ 02/09/2026")).toBeTruthy();
    // A raft stopped for repair still gets logs.
    expect(screen.getByRole("button", { name: "Ghi nhật ký" })).toBeTruthy();
    expect(mocks.log).toHaveBeenCalledWith("raft-list", raft, expect.anything(), undefined, undefined, expect.anything());
  });
});

describe("Vật tư tab", () => {
  it("opens the material-use form with the zone, raft and open cycle already set and reads the costs again after a save", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    await screen.findByRole("button", { name: "Xem phiếu XD000012" });
    fireEvent.click(screen.getByRole("button", { name: "Dùng vật tư" }));
    const form = await screen.findByRole("dialog", { name: "Ghi nhận sử dụng vật tư" });
    expect(within(form).getByText(`vùng ${zone} · bè ${raft} · chu kỳ ${cycle} · mới`)).toBeTruthy();
    fireEvent.click(within(form).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(mocks.costs).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("lists the material-use documents with the Xuất dùng code as the link, the first item and +n, quantity, cost and recorder", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    const row = (await screen.findByRole("button", { name: "Xem phiếu XD000012" })).closest("tr")!;
    expect(within(row).getByText("20/11/2026 10:30")).toBeTruthy();
    expect(within(row).getByText("Phao nhựa +1")).toBeTruthy();
    expect(within(row).getByText("2 dòng")).toBeTruthy();
    expect(within(row).getByText(/500\.000/)).toBeTruthy();
    expect(within(row).getByText("Lan")).toBeTruthy();
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Chứng từ", "Thời gian", "Vật tư", "Số lượng", "Thành tiền", "Người lập"]);
  });
  it("opens the document as a card with its lines and lets a line be corrected with the existing form", async () => {
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    fireEvent.click(await screen.findByRole("button", { name: "Xem phiếu XD000012" }));
    const card = await screen.findByRole("dialog", { name: "Sử dụng vật tư XD000012" });
    expect(within(card).getByText("Thay phao")).toBeTruthy();
    expect(within(card).getByRole("link", { name: "XD000012" }).getAttribute("href")).toBe("/inputs/uses?code=XD000012");
    expect(within(card).getByText(/Dây neo/)).toBeTruthy();
    fireEvent.click(within(card).getByRole("button", { name: "Sửa VT02" }));
    expect(await screen.findByText(new RegExp(`bè ${raft} · chu kỳ ${cycle} · sửa`))).toBeTruthy();
  });
  it("offers Dùng vật tư on a raft with no cycle and on one stopped for repair, never without the Create right", async () => {
    mount({ currentCycle: null });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    expect(await screen.findByRole("button", { name: "Dùng vật tư" })).toBeTruthy();
    cleanup();
    mount({ currentCycle }, { ...access, materialCreate: false });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    await waitFor(() => expect(mocks.costs).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Dùng vật tư" })).toBeNull();
    cleanup();
    mount({ currentCycle: null, statusId: 102 });
    fireEvent.click(await screen.findByRole("tab", { name: "Vật tư" }));
    expect(await screen.findByRole("button", { name: "Dùng vật tư" })).toBeTruthy();
  });
});

describe("Làn tab", () => {
  it("shows only the lane board with today's progress: no photo gallery, no upload and no care-log text", async () => {
    mocks.cycles.mockImplementation(async (query: { action: string }) => query.action === "progress" ? { status: "success", data: { raftId: raft, raftCode: "QA-RAFT", date: "2026-11-27", cycle: null, notSeededLanes: [], lanes: [{ id: "5a92b32d-2901-4560-9237-350be750cb30", laneNumber: 1, statusId: 2001, status: "In Use", state: "NotSeeded" }] } } : { status: "success", data: [] });
    mount({ currentCycle });
    fireEvent.click(await screen.findByRole("tab", { name: "Làn" }));
    expect((await screen.findByLabelText("Các làn của bè")).textContent).toContain("1 làn tiến độ");
    expect(screen.queryByText(/Thêm ảnh|Ảnh bè|Nhật ký chăm sóc/)).toBeNull();
    expect(mocks.log).not.toHaveBeenCalled(); expect(mocks.ops.mock.calls.every(call => call[0] === "detail")).toBe(true);
  });
  it("skips the progress read for an account that may not read cycles", async () => {
    mount({ currentCycle }, { ...access, cycles: false });
    fireEvent.click(await screen.findByRole("tab", { name: "Làn" }));
    expect(await screen.findByLabelText("Các làn của bè")).toBeTruthy();
    expect(readsOf("progress")).toHaveLength(0);
  });
});
