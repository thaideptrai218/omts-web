// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("./repository", () => ({ readCycles: state.read }));
vi.mock("@/features/operations/lookups", () => ({ loadOptions: async () => ({ status: "success", data: [{ id: "zone-a", name: "Vùng A" }] }) }));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: "CooperativeOwner" }, permissions: { functionPermissions: [] } }) }));
import { CyclesScreen } from "./cycles-screen";
afterEach(() => { cleanup(); vi.clearAllMocks(); });
it("opens the inline detail immediately and ignores late progress after returning to the list", async () => {
  let finish!: (value: unknown) => void;
  const progress = new Promise(resolve => { finish = resolve; });
  state.read.mockImplementation((query: { action: string }) => query.action === "zone" ? Promise.resolve({ status: "success", data: [{ raftId: "raft-a", raftCode: "B1-01", laneCount: 3, cycle: null, canStart: false }] }) : query.action === "history" ? Promise.resolve({ status: "success", data: [] }) : progress);
  render(<CyclesScreen />);
  await screen.findByRole("option", { name: "Vùng A" });
  fireEvent.change(screen.getByRole("combobox", { name: "Vùng nuôi" }), { target: { value: "zone-a" } });
  fireEvent.click(await screen.findByRole("button", { name: "Xem bè B1-01" }));
  expect(screen.getByRole("heading", { name: "Lịch sử và tiến độ · B1-01" })).toBeTruthy();
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Thu gọn hồ sơ" }));
  await act(async () => { finish({ status: "success", data: { raftId: "raft-a", raftCode: "B1-01", cycle: null, lanes: [], date: "2026-11-06" } }); });
  expect(screen.queryByRole("heading", { name: "Lịch sử và tiến độ · B1-01" })).toBeNull();
  expect((screen.getByRole("combobox", { name: "Vùng nuôi" }) as HTMLSelectElement).value).toBe("zone-a");
});
