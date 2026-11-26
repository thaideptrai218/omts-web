// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const ids = { plan: id(1), line1: id(2), line2: id(3), raft1: id(4), raft2: id(5), zone1: id(6), zone2: id(7), an: id(8), binh: id(9), chi: id(10) };
const names: Record<string, string> = { [ids.an]: "An", [ids.binh]: "Bình", [ids.chi]: "Chi" };
const state = vi.hoisted(() => ({ staffing: vi.fn(), saveStaffing: vi.fn(), detail: vi.fn(), picker: vi.fn(), roster: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), planRepository: { staffing: state.staffing, saveStaffing: state.saveStaffing, detail: state.detail, roster: state.roster } }));
vi.mock("@/features/cultivation-api/record-crew-picker", () => ({
  RecordCrewPicker: (props: { label?: string; raftId?: string; zoneId: string; day?: string; values: string[]; locked?: readonly string[]; onChange(values: string[]): void }) => {
    state.picker(props);
    return <fieldset aria-label={props.label}>{Object.entries(names).map(([employee, name]) =>
      <label key={employee}><input type="checkbox" disabled={props.locked?.includes(employee)} checked={props.values.includes(employee)}
        onChange={(event) => props.onChange(event.target.checked ? [...props.values, employee] : props.values.filter((value) => value !== employee))} />{name}</label>)}</fieldset>;
  },
}));
import { ToastProvider } from "@/components/ui/toast-provider";
import type { PlanView } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { PlanDetailPanel } from "./plan-detail";
import { PlanStaffingTab } from "./plan-staffing-tab";

const FUTURE = "2099-01-01", PAST = "2020-01-01";
const owner = { staff: true } as PlanAccess;
const line = (n: 1 | 2, patch: object = {}) => ({
  lineId: n === 1 ? ids.line1 : ids.line2, raftId: n === 1 ? ids.raft1 : ids.raft2, raftCode: n === 1 ? "B01" : "B11", zoneId: n === 1 ? ids.zone1 : ids.zone2, zoneCode: n === 1 ? "KV01" : "KV02",
  laneNumbers: n === 1 ? [1, 2] : [3], plannedDate: FUTURE, employees: [] as unknown[], canEdit: true, ...patch,
});
const staffing = (lines: object[], patch: object = {}) => ({ planId: ids.plan, planCode: "KHT000001", rowVersion: "v1", lines, canEdit: lines.some((row) => (row as { canEdit: boolean }).canEdit), ...patch });
const member = (employee: string, patch: object = {}) => ({ employeeId: employee, code: `NV${employee.slice(-2)}`, name: names[employee], assignmentId: id(40 + Number(employee.slice(-2))), checkedIn: false, ...patch });
const view = (patch: object = {}) => ({
  id: ids.plan, code: "KHT000001", statusId: 4202, status: "Assigned", zones: [{ id: ids.zone1, code: "KV01", name: "Vùng 1" }], plannedAt: `${FUTURE}T06:00:00+07:00`, note: null, createdBy: null, orders: [],
  lines: [], progress: { lines: 0, linesDone: 0, lanes: 0, lanesHarvested: 0, lanesSkipped: 0 }, allowedActions: [], createdAt: "2026-11-12T08:00:00+07:00", rowVersion: "p1", ...patch,
}) as unknown as PlanView;
const ok = (data: unknown) => ({ status: "success", data });
const renderTab = (plan = view(), access = owner) => render(<ToastProvider><PlanStaffingTab plan={plan} access={access} /></ToastProvider>);

beforeEach(() => { state.staffing.mockReset(); state.saveStaffing.mockReset(); state.picker.mockReset(); state.detail.mockReset();
  // The roster has its own tests (plan-roster-section.test.tsx): here it is an empty roster nobody can change.
  state.roster.mockReset().mockResolvedValue({ status: "success", data: { planId: ids.plan, planCode: "KHT000001", rowVersion: "p1", rosterVersion: "v0", requiredPeople: null, canEdit: false, people: [],
    summary: { requiredPeople: null, confirmed: 0, invited: 0, declined: 0, external: 0, missing: 0, ready: true } } });
});
afterEach(cleanup);

it("shows each line with its raft link, zone, lanes, day, the employees and who checked in", async () => {
  state.staffing.mockResolvedValue(ok(staffing([line(1, { employees: [member(ids.an), member(ids.binh, { checkedIn: true })] }), line(2)])));
  renderTab();
  const first = await screen.findByRole("region", { name: "Nhân công bè B01" });
  expect(within(first).getByRole("link", { name: "B01" }).getAttribute("href")).toContain(`/farming/rafts?zoneId=${ids.zone1}&recordId=${ids.raft1}`);
  expect(within(first).getByText("Vùng KV01 · Ngày 01/01/2099")).toBeTruthy();
  expect(within(first).getByRole("link", { name: "An" }).getAttribute("href")).toBe(`/employees?recordId=${ids.an}`);
  expect(within(first).getAllByText("Đã điểm danh")).toHaveLength(1);
  expect(within(screen.getByRole("region", { name: "Nhân công bè B11" })).getByText("Chưa chọn nhân công cho bè này.")).toBeTruthy();
  expect(state.staffing).toHaveBeenCalledWith(ids.plan, expect.anything());
});

it("chooses the crew in place with the day of the plan, saves each changed line and tells it with a toast", async () => {
  const user = userEvent.setup();
  state.staffing.mockResolvedValue(ok(staffing([line(1, { employees: [member(ids.an), member(ids.binh, { checkedIn: true })] }), line(2)])));
  state.saveStaffing.mockResolvedValue(ok(line(1, { employees: [member(ids.an), member(ids.binh, { checkedIn: true }), member(ids.chi)] })));
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Chỉnh sửa" }));
  expect(state.picker).toHaveBeenCalledWith(expect.objectContaining({ raftId: ids.raft1, zoneId: ids.zone1, day: FUTURE, locked: [ids.binh] }));
  const save = screen.getByRole("button", { name: "Lưu" }) as HTMLButtonElement;
  expect(save.disabled).toBe(true);
  const picker = screen.getByRole("group", { name: "Nhân viên bè B01" });
  expect((within(picker).getByRole("checkbox", { name: "Bình" }) as HTMLInputElement).disabled).toBe(true);
  await user.click(within(picker).getByRole("checkbox", { name: "Chi" }));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.saveStaffing).toHaveBeenCalledTimes(1));
  expect(state.saveStaffing).toHaveBeenCalledWith(ids.plan, ids.line1, [ids.an, ids.binh, ids.chi], "v1");
  expect(await screen.findByText("Đã lưu nhân công của KHT000001.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Lưu" })).toBeNull();
  expect(within(screen.getByRole("region", { name: "Nhân công bè B01" })).getByRole("link", { name: "Chi" })).toBeTruthy();
});

it("discards what was chosen with Bỏ qua", async () => {
  const user = userEvent.setup();
  state.staffing.mockResolvedValue(ok(staffing([line(1, { employees: [member(ids.an)] })])));
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Chỉnh sửa" }));
  await user.click(within(screen.getByRole("group", { name: "Nhân viên bè B01" })).getByRole("checkbox", { name: "Chi" }));
  await user.click(screen.getByRole("button", { name: "Bỏ qua" }));
  expect(state.saveStaffing).not.toHaveBeenCalled();
  expect(screen.queryByRole("link", { name: "Chi" })).toBeNull();
  expect(screen.getByRole("button", { name: "Chỉnh sửa" })).toBeTruthy();
});

it("keeps the form open with the API's sentence in the form when a save is refused, and does not send the other lines again", async () => {
  const user = userEvent.setup();
  state.staffing.mockResolvedValue(ok(staffing([line(1, { employees: [member(ids.an)] }), line(2)])));
  state.saveStaffing.mockResolvedValueOnce(ok(line(1, { employees: [member(ids.an), member(ids.chi)] })))
    .mockResolvedValueOnce({ status: "error", httpStatus: 409, code: "MSG-GEN-09", uncertain: false, problem: { message: "Kế hoạch thu hoạch KHT000001 đang ở trạng thái Hoàn thành nên không thể chọn hay đổi nhân công." } })
    .mockResolvedValue(ok(line(2, { employees: [member(ids.an)] })));
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Chỉnh sửa" }));
  await user.click(within(screen.getByRole("group", { name: "Nhân viên bè B01" })).getByRole("checkbox", { name: "Chi" }));
  await user.click(within(screen.getByRole("group", { name: "Nhân viên bè B11" })).getByRole("checkbox", { name: "An" }));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Bè B11: Kế hoạch thu hoạch KHT000001 đang ở trạng thái Hoàn thành nên không thể chọn hay đổi nhân công.");
  expect(screen.getByRole("button", { name: "Bỏ qua" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.saveStaffing).toHaveBeenCalledTimes(3));
  // The first line was saved the first time, so the second try sends only the line that failed.
  expect(state.saveStaffing.mock.calls[2].slice(1, 3)).toEqual([ids.line2, [ids.an]]);
});

it("words the answer of an employee who checked in meanwhile in Vietnamese", async () => {
  const user = userEvent.setup();
  state.staffing.mockResolvedValue(ok(staffing([line(1, { employees: [member(ids.an)] })])));
  state.saveStaffing.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-LABOR-07", uncertain: false, problem: { message: "An is already checked in today." } });
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Chỉnh sửa" }));
  await user.click(within(screen.getByRole("group", { name: "Nhân viên bè B01" })).getByRole("checkbox", { name: "An" }));
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  expect((await screen.findByRole("alert")).textContent).toBe("Bè B01: Nhân viên đã điểm danh vào ca nên không thể bỏ khỏi bè này.");
});

it("offers no edit to an account without the work assignment right or on a line the API does not allow, and says why when the plan is over", async () => {
  state.staffing.mockResolvedValue(ok(staffing([line(1, { employees: [member(ids.an)] })])));
  renderTab(view(), { staff: false } as PlanAccess);
  await screen.findByRole("region", { name: "Nhân công bè B01" });
  expect(screen.queryByRole("button", { name: "Chỉnh sửa" })).toBeNull();
  cleanup();

  state.staffing.mockResolvedValue(ok(staffing([line(1, { canEdit: false }), line(2, { canEdit: true })])));
  const user = userEvent.setup();
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Chỉnh sửa" }));
  expect(screen.getAllByRole("group")).toHaveLength(1);
  expect(screen.getByRole("group", { name: "Nhân viên bè B11" })).toBeTruthy();
  cleanup();

  state.staffing.mockResolvedValue(ok(staffing([line(1, { canEdit: false })])));
  renderTab(view({ statusId: 4204 }));
  expect(await screen.findByText("Kế hoạch đã hoàn thành nên không đổi nhân công được.")).toBeTruthy();
  cleanup();

  state.staffing.mockResolvedValue(ok(staffing([line(1, { canEdit: false, plannedDate: PAST })])));
  renderTab();
  expect(await screen.findByText("Đã qua ngày thu hoạch nên không đổi nhân công được.")).toBeTruthy();
});

it("tells a plan with no line and retries a failed read", async () => {
  const user = userEvent.setup();
  state.staffing.mockResolvedValueOnce({ status: "error", httpStatus: 503, uncertain: false }).mockResolvedValue(ok(staffing([])));
  renderTab();
  await user.click(await screen.findByRole("button", { name: "Tải lại nhân công" }));
  expect(await screen.findByText("Kế hoạch chưa có dòng nào để chọn nhân công.")).toBeTruthy();
});

it("opens the Nhân công subtab of the plan row next to its information", async () => {
  const user = userEvent.setup();
  state.detail.mockResolvedValue(ok(view()));
  state.staffing.mockResolvedValue(ok(staffing([line(1, { employees: [member(ids.an)] })])));
  render(<ToastProvider><PlanDetailPanel id={ids.plan} access={owner} onChanged={vi.fn()} /></ToastProvider>);
  const tabs = await screen.findByRole("tablist", { name: "Nội dung kế hoạch thu hoạch" });
  expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Thông tin", "Nhân công"]);
  expect(state.staffing).not.toHaveBeenCalled();
  await user.click(within(tabs).getByRole("tab", { name: "Nhân công" }));
  expect(await screen.findByRole("region", { name: "Nhân công bè B01" })).toBeTruthy();
  await user.click(within(tabs).getByRole("tab", { name: "Thông tin" }));
  expect(screen.getByText("Thời gian dự kiến:")).toBeTruthy();
});
