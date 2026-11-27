// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ToastProvider } from "@/components/ui/toast-provider";

const mocks = vi.hoisted(() => ({ page: vi.fn(), params: "", cycles: vi.fn(), log: vi.fn(), subject: "CooperativeOwner" as string, functions: [] as { functionCode: string; action: string }[] }));
const zoneA = "00000000-0000-4000-8000-000000000001", zoneB = "00000000-0000-4000-8000-000000000002", raftA = "00000000-0000-4000-8000-0000000000a1", cycleA = "00000000-0000-4000-8000-0000000000c1", logId = "00000000-0000-4000-8000-0000000000d1";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mocks.params) }));
vi.mock("./log-page-repository", () => ({ readLogPage: mocks.page }));
vi.mock("@/features/cycles-api/repository", () => ({ readCycles: mocks.cycles }));
vi.mock("@/features/cycles-api/log-repository", async original => ({ ...(await original<typeof import("@/features/cycles-api/log-repository")>()), logRequest: mocks.log }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: mocks.subject }, permissions: { functionPermissions: mocks.functions } }) }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async (kind: string, _signal: AbortSignal, query?: { zoneId?: string }) => ({ status: "success", data: kind === "zones"
  ? [{ id: zoneA, code: "KV01", name: "Vùng A", statusId: 101, status: "In Use" }, { id: zoneB, code: "KV02", name: "Vùng B", statusId: 101, status: "In Use" }]
  : query?.zoneId === zoneA ? [{ id: raftA, code: "B1-01" }] : [] }) }));
vi.mock("@/components/ui/dialog", () => ({ Dialog: ({ title, children }: { title: string; children: ReactNode }) => <div role="dialog" aria-label={title}>{children}</div> }));
vi.mock("@/features/history/record-history", () => ({ EditedRecordHistory: () => <p>Xem lịch sử</p>, RecordHistory: () => null }));
import { LogsScreen } from "./logs-screen";

const item = (patch: object = {}) => ({ id: logId, cycleId: cycleA, raftId: raftA, raftCode: "B1-01", zoneId: zoneA, zoneCode: "KV01", zoneName: "Vùng A", visitDate: "2026-11-21", logType: "CLEANING", notes: "Vệ sinh lưới bè phía đông",
  photos: [{ key: "k1", sortOrder: 1, url: "x" }], recordedByAccountId: "00000000-0000-4000-8000-0000000000e1", recordedByName: "Minh", recordedAt: "2026-11-21T02:15:00+00:00", canCorrect: true, rowVersion: "A", ...patch });
const answer = (items: object[] = [item()]) => ({ status: "success", data: { items, page: 1, pageSize: 20, total: items.length } });
const lastQuery = () => mocks.page.mock.calls.at(-1)![0] as Record<string, string>;
const show = () => render(<ToastProvider><LogsScreen /></ToastProvider>);

beforeEach(() => { mocks.params = ""; mocks.subject = "CooperativeOwner"; mocks.functions = []; mocks.page.mockResolvedValue(answer()); mocks.log.mockResolvedValue({ status: "success", data: [] }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Nhật ký chăm sóc screen", () => {
  it("lists the logs as a table with the raft code as a link to the raft's Nhật ký tab, by code", async () => {
    show();
    const row = (await screen.findByRole("button", { name: "Xem nhật ký B1-01 ngày 21/11/2026" })).closest("tr")!;
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual(["Ngày chăm sóc", "Vùng · Bè", "Loại", "Nội dung", "Ảnh", "Người ghi", "Thời gian ghi"]);
    expect(within(row).getByText("Vệ sinh bè/lồng")).toBeTruthy();
    expect(within(row).getByText("21/11/2026 09:15")).toBeTruthy();
    expect(within(row).getByRole("link", { name: "B1-01" }).getAttribute("href")).toBe(`/farming/rafts?zoneId=${zoneA}&search=B1-01&tab=logs`);
    expect(lastQuery()).toMatchObject({ page: "1", pageSize: "20" });
    expect(lastQuery().zoneId).toBe("");
  });
  it("sends the filters and the search to the server and starts again from the first page", async () => {
    show();
    await screen.findByRole("button", { name: "Xem nhật ký B1-01 ngày 21/11/2026" });
    fireEvent.change(screen.getByLabelText("Vùng nuôi"), { target: { value: zoneA } });
    await waitFor(() => expect(lastQuery().zoneId).toBe(zoneA));
    await waitFor(() => expect(within(screen.getByLabelText("Bè")).getByRole("option", { name: "B1-01" })).toBeTruthy());
    fireEvent.change(screen.getByLabelText("Bè"), { target: { value: raftA } });
    fireEvent.change(screen.getByLabelText("Loại nhật ký"), { target: { value: "REPAIR" } });
    fireEvent.change(screen.getByLabelText("Tìm nhật ký"), { target: { value: " lưới " } });
    await waitFor(() => expect(lastQuery()).toMatchObject({ zoneId: zoneA, raftId: raftA, logType: "REPAIR", search: "lưới", page: "1" }));
  });
  it("sends the visit dates of the time filter", async () => {
    show();
    await screen.findByRole("button", { name: "Xem nhật ký B1-01 ngày 21/11/2026" });
    fireEvent.click(screen.getByRole("button", { name: /Toàn thời gian/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Hôm nay" }));
    await waitFor(() => expect(lastQuery().from).toMatch(/^\d{4}-\d{2}-\d{2}$/));
    expect(lastQuery().to).toBe(lastQuery().from);
  });
  it("preselects the zone and raft of a link", async () => {
    mocks.params = new URLSearchParams({ zoneId: zoneA, raftId: raftA }).toString();
    show();
    await waitFor(() => expect(mocks.page).toHaveBeenCalled());
    expect(lastQuery()).toMatchObject({ zoneId: zoneA, raftId: raftA });
  });
  it("opens the log card from a row, with the type, photos, history only when edited, and Sửa / Gỡ for a log that can be corrected", async () => {
    show();
    fireEvent.click(await screen.findByText("Vệ sinh lưới bè phía đông"));
    const card = await screen.findByRole("dialog", { name: "Nhật ký ngày 21/11/2026" });
    expect(within(card).getByText("Vệ sinh bè/lồng")).toBeTruthy();
    expect(within(card).getByRole("button", { name: /Phóng to Ảnh 1/ })).toBeTruthy();
    expect(within(card).getByText("Xem lịch sử")).toBeTruthy();
    expect(within(card).getByRole("button", { name: "Sửa" })).toBeTruthy(); expect(within(card).getByRole("button", { name: "Gỡ nhật ký" })).toBeTruthy();
    expect(screen.queryByRole("row", { name: /Chi tiết/ })).toBeNull();
  });
  it("hides Sửa and Gỡ when the backend says the log cannot be corrected, and without the edit right", async () => {
    mocks.page.mockResolvedValue(answer([item({ canCorrect: false })]));
    show();
    fireEvent.click(await screen.findByText("Vệ sinh lưới bè phía đông"));
    const card = await screen.findByRole("dialog", { name: "Nhật ký ngày 21/11/2026" });
    expect(within(card).queryByRole("button", { name: "Sửa" })).toBeNull();
    cleanup();
    mocks.subject = "Staff"; mocks.functions = [{ functionCode: "CULTIVATION_LOGS", action: "View", dataScope: "AssignedZone", scope: { kind: "all-zones" } }] as never; mocks.page.mockResolvedValue(answer());
    show();
    fireEvent.click(await screen.findByText("Vệ sinh lưới bè phía đông"));
    const readOnly = await screen.findByRole("dialog", { name: "Nhật ký ngày 21/11/2026" });
    expect(within(readOnly).queryByRole("button", { name: "Sửa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ghi nhật ký" })).toBeNull();
  });
  it("picks zone and a raft with an open cycle before the log form, and reloads the list after saving", async () => {
    mocks.cycles.mockResolvedValue({ status: "success", data: [
      { raftId: raftA, raftCode: "B1-01", raftStatusId: 101, raftStatus: "In Use", laneCount: 2, cycle: { id: cycleA, startDate: "2026-11-01", closeDate: null, statusId: 601, status: "Open", rowVersion: "A" }, lastCloseDate: null, canStart: false, canEdit: true, canCancel: false },
      { raftId: "00000000-0000-4000-8000-0000000000a2", raftCode: "B1-02", raftStatusId: 101, raftStatus: "In Use", laneCount: 2, cycle: null, lastCloseDate: null, canStart: true, canEdit: false, canCancel: false }] });
    mocks.log.mockImplementation(async (action: string) => ({ status: "success", data: action === "create" ? { log: item() } : [] }));
    show();
    await screen.findByRole("button", { name: "Xem nhật ký B1-01 ngày 21/11/2026" });
    fireEvent.click(screen.getByRole("button", { name: "Ghi nhật ký" }));
    const picker = await screen.findByRole("dialog", { name: "Ghi nhật ký chăm sóc" });
    await waitFor(() => expect(within(picker).getByRole("option", { name: "B1-01" })).toBeTruthy());
    expect(within(picker).queryByRole("option", { name: "B1-02" })).toBeNull();
    expect((within(picker).getByRole("button", { name: "Tiếp tục" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(within(picker).getByLabelText("Bè *"), { target: { value: raftA } });
    fireEvent.click(within(picker).getByRole("button", { name: "Tiếp tục" }));
    const form = await screen.findByRole("dialog", { name: "Ghi nhật ký chăm sóc" });
    expect((within(form).getByLabelText("Loại nhật ký *") as HTMLSelectElement).value).toBe("OTHER");
    fireEvent.change(within(form).getByLabelText("Thêm ảnh", { selector: "input" }), { target: { files: [new File(["a"], "a.png", { type: "image/png" })] } });
    const before = mocks.page.mock.calls.length;
    fireEvent.click(within(form).getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(mocks.log.mock.calls.some(call => call[0] === "create" && call[1] === cycleA)).toBe(true));
    await waitFor(() => expect(mocks.page.mock.calls.length).toBeGreaterThan(before));
  });
  it("shows an empty state and a load error with a retry", async () => {
    mocks.page.mockResolvedValueOnce(answer([])).mockResolvedValueOnce({ status: "error", httpStatus: 500, uncertain: false }).mockResolvedValue(answer());
    show();
    expect(await screen.findByText("Chưa có nhật ký chăm sóc nào.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Tìm nhật ký"), { target: { value: "x" } });
    fireEvent.click(await screen.findByRole("button", { name: "Tải lại" }));
    expect(await screen.findByRole("button", { name: "Xem nhật ký B1-01 ngày 21/11/2026" })).toBeTruthy();
  });
  it("refuses an account that may not read care logs", () => {
    mocks.subject = "Staff"; mocks.functions = [];
    show();
    expect(screen.getByRole("alert").textContent).toContain("không có quyền");
    expect(mocks.page).not.toHaveBeenCalled();
  });
});
