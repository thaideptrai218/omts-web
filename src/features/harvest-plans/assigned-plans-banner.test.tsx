// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const ids = { zone: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a11", raft: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a12", raft2: "5b0e2f6e-6c5b-4c75-a0a3-0c7a1e3e1a13", plan: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b06", line: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b07", line2: "0f1c0a8e-3d3a-4f6b-9e57-2a3c7f1d0b08" };
const state = vi.hoisted(() => ({
  context: { identity: { subjectType: "Staff", username: "qlv" }, permissions: { functionPermissions: [] as { functionCode: string; action: string }[] } },
  assigned: vi.fn(), skip: vi.fn(),
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => state.context }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/features/cultivation-api/records-harvest-form", () => ({ HarvestForm: (props: { plan: { lineId: string; laneNumbers: number[] } }) => <div role="dialog" aria-label="Form thu hoạch">{props.plan.lineId}:{props.plan.laneNumbers.join(",")}</div> }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), planRepository: { assigned: state.assigned, skipLanes: state.skip } }));
import { AssignedPlansBanner } from "./assigned-plans-banner";
import { ToastProvider } from "@/components/ui/toast-provider";

const plan = {
  id: ids.plan, code: "KHT000001", statusId: 4202, status: "Assigned", zones: [{ id: ids.zone, code: "Z1", name: "Vùng 1" }], plannedAt: "2026-11-14T06:00:00+07:00", note: null, createdBy: null,
  orders: [], progress: { lines: 2, linesDone: 0, lanes: 4, lanesHarvested: 0, lanesSkipped: 1 }, createdAt: "2026-11-12T08:00:00+07:00", allowedActions: ["Harvest", "SkipLane"], rowVersion: "v1",
  lines: [
    { id: ids.line, lineNumber: 1, raftId: ids.raft, raftCode: "B1", zone: { id: ids.zone, code: "Z1", name: "Vùng 1" }, expectedProduct: { id: ids.zone, code: "SP1", name: "Hàu sữa" }, expectedCageCount: 8, state: "Open", canHarvest: true, locked: true,
      lanes: [{ laneId: ids.zone, laneNumber: 1, state: "Planned" }, { laneId: ids.zone, laneNumber: 2, state: "Skipped", skipReason: "x" }, { laneId: ids.zone, laneNumber: 3, state: "Planned" }] },
    { id: ids.line2, lineNumber: 2, raftId: ids.raft2, raftCode: "B2", zone: { id: ids.zone, code: "Z1", name: "Vùng 1" }, state: "Open", canHarvest: true, locked: false, lanes: [{ laneId: ids.zone, laneNumber: 1, state: "Planned" }] },
  ],
};

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => {
  state.context.permissions.functionPermissions = [{ functionCode: "HARVESTS", action: "View" }, { functionCode: "HARVESTS", action: "Create" }];
  state.assigned.mockResolvedValue({ status: "success", data: [plan] });
  state.skip.mockResolvedValue({ status: "success", data: { done: true } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("lists only the lines of this raft with the lanes still to harvest and opens the harvest form with the lanes of the plan", async () => {
  const user = userEvent.setup();
  render(<ToastProvider><AssignedPlansBanner zoneId={ids.zone} raftId={ids.raft} onChanged={() => {}} /></ToastProvider>);
  const banner = await screen.findByRole("region", { name: "Kế hoạch được giao" });
  expect(banner.textContent).toContain("KHT000001");
  expect(banner.textContent).toContain("luống 1, 3");
  expect(banner.textContent).toContain("khoảng 8 lồng");
  expect(banner.textContent).not.toContain("B2");
  await user.click(within(banner).getByRole("button", { name: "Thu hoạch" }));
  expect((await screen.findByRole("dialog", { name: "Form thu hoạch" })).textContent).toBe(`${ids.line}:1,3`);
});

it("asks for lanes and a reason before telling the API a lane will not be harvested, then reloads", async () => {
  const user = userEvent.setup(), changed = vi.fn();
  render(<ToastProvider><AssignedPlansBanner zoneId={ids.zone} raftId={ids.raft} onChanged={changed} /></ToastProvider>);
  await user.click(await screen.findByRole("button", { name: "Không thu" }));
  const dialog = await screen.findByRole("dialog");
  expect(within(dialog).getAllByRole("checkbox")).toHaveLength(2);
  await user.click(within(dialog).getByRole("button", { name: "Ghi không thu" }));
  expect(within(dialog).getByRole("alert").textContent).toContain("Chọn ít nhất một luống");
  await user.click(within(dialog).getByLabelText("Luống 3"));
  await user.click(within(dialog).getByRole("button", { name: "Ghi không thu" }));
  expect(within(dialog).getByRole("alert").textContent).toContain("Nhập lý do");
  await user.type(within(dialog).getByLabelText("Lý do không thu"), " Hàu chưa đủ cỡ ");
  await user.click(within(dialog).getByRole("button", { name: "Ghi không thu" }));
  await waitFor(() => expect(state.skip).toHaveBeenCalledWith(ids.plan, ids.line, [3], "Hàu chưa đủ cỡ"));
  await waitFor(() => expect(changed).toHaveBeenCalled());
  expect(state.assigned).toHaveBeenCalledTimes(2);
});

it("shows nothing without the right to record a harvest, for another zone, or when the plan does not allow it", async () => {
  state.context.permissions.functionPermissions = [];
  const { unmount } = render(<ToastProvider><AssignedPlansBanner zoneId={ids.zone} raftId={ids.raft} onChanged={() => {}} /></ToastProvider>);
  await waitFor(() => expect(screen.queryByRole("region")).toBeNull());
  expect(state.assigned).not.toHaveBeenCalled();
  unmount();
  state.context.permissions.functionPermissions = [{ functionCode: "HARVESTS", action: "View" }];
  render(<ToastProvider><AssignedPlansBanner zoneId={ids.zone} raftId={ids.raft} onChanged={() => {}} /></ToastProvider>);
  await waitFor(() => expect(state.assigned).toHaveBeenCalled());
  expect(screen.queryByRole("button", { name: "Thu hoạch" })).toBeNull();
});
