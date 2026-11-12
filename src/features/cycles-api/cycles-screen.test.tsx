import { ToastProvider } from "@/components/ui/toast-provider";
// @vitest-environment jsdom
import type { ReactElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render as renderUi, screen, act } from "@testing-library/react";
const state = vi.hoisted(() => ({ read: vi.fn(), params: "" }));
const zoneId = "00000000-0000-4000-8000-000000000001", raftId = "00000000-0000-4000-8000-0000000000a1";
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(state.params) }));
vi.mock("./repository", () => ({ readCycles: state.read, writeCycle: vi.fn() }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async () => ({ status: "success", data: [{ id: zoneId, code: "Z1", name: "Vùng A", location: null, area: null, statusId: 101, status: "In Use", inUseRaftCount: 1, licenseState: null }] }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
import { CyclesScreen } from "./cycles-screen";
const render = (ui: ReactElement) => renderUi(<ToastProvider>{ui}</ToastProvider>);
afterEach(() => { cleanup(); state.params = ""; vi.clearAllMocks(); });
it("opens the raft record in place and ignores late progress after it is collapsed", async () => {
  let finish!: (value: unknown) => void;
  const progress = new Promise(resolve => { finish = resolve; });
  state.read.mockImplementation((query: { action: string }) => query.action === "zone" ? Promise.resolve({ status: "success", data: [{ raftId, raftCode: "B1-01", raftStatusId: 101, raftStatus: "In Use", laneCount: 3, cycle: null, lastCloseDate: null, canStart: false, canEdit: false, canCancel: false }] })
    : query.action === "history" ? Promise.resolve({ status: "success", data: [] }) : progress);
  render(<CyclesScreen />);
  await screen.findByRole("option", { name: "Z1 · Vùng A" });
  fireEvent.click(await screen.findByRole("button", { name: "Xem bè B1-01" }));
  expect(screen.getByRole("region", { name: "Chi tiết chu kỳ của bè" })).toBeTruthy();
  expect(screen.getByRole("tab", { name: "Tiến độ làn" })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thu gọn bè B1-01" }));
  await act(async () => { finish({ status: "success", data: { raftId, raftCode: "B1-01", cycle: null, lanes: [], notSeededLanes: [], date: "2026-11-06" } }); });
  expect(screen.queryByRole("region", { name: "Chi tiết chu kỳ của bè" })).toBeNull();
  expect((screen.getByRole("combobox", { name: "Vùng nuôi" }) as HTMLSelectElement).value).toBe(zoneId);
});

it("opens a linked raft without applying the child lot search to the raft directory", async () => {
  state.params = new URLSearchParams({ zoneId, raftId, recordId: "00000000-0000-4000-8000-0000000000b1", search: "LO-THU-001", cycleId: "00000000-0000-4000-8000-0000000000c1" }).toString();
  state.read.mockImplementation(async (query: { action: string }) => ({ status: "success", data: query.action === "zone" ? [{ raftId, raftCode: "B1-01", raftStatusId: 101, raftStatus: "In Use", laneCount: 3, cycle: null, lastCloseDate: null, canStart: false, canEdit: false, canCancel: false }] : query.action === "history" ? [] : { raftId, raftCode: "B1-01", cycle: null, lanes: [], notSeededLanes: [], date: "2026-11-06" } }));
  render(<CyclesScreen />);
  await screen.findByRole("region", { name: "Chi tiết chu kỳ của bè" });
  expect((screen.getByRole("searchbox", { name: "Tìm bè nuôi" }) as HTMLInputElement).value).toBe("");
  expect(state.read).toHaveBeenCalledWith(expect.objectContaining({ action: "progress", cycleId: "00000000-0000-4000-8000-0000000000c1" }), expect.anything(), expect.anything());
});
