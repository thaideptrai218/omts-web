// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ roster: vi.fn(), setRequired: vi.fn(), confirmStaff: vi.fn(), removeStaff: vi.fn(), addExternal: vi.fn(), invite: vi.fn() }));
vi.mock("./repository", async (original) => ({ ...(await original<typeof import("./repository")>()), planRepository: state }));
vi.mock("./plan-roster-invite-dialog", () => ({
  PlanRosterInviteDialog: (props: { preselected?: string[]; onClose(): void }) => <div role="dialog" aria-label="Mời nhân viên">Chọn sẵn: {(props.preselected ?? []).join(",") || "không ai"}<button onClick={props.onClose}>Đóng</button></div>,
}));
import { ToastProvider } from "@/components/ui/toast-provider";
import type { PlanView } from "./contracts";
import type { PlanAccess } from "./plan-access";
import { PlanRosterSection } from "./plan-roster-section";

const id = (n: number) => `00000000-0000-4000-8000-0000000000${String(n).padStart(2, "0")}`;
const row = (n: number, name: string, status: string, patch: object = {}) => ({
  id: id(n), employeeId: id(n + 50), code: `NV${n}`, name, phoneNumber: `09000000${n}`, type: n % 2 ? "Staff" : "SeasonalWorker", hasAccount: true, state: status,
  invitedAt: "2026-11-26T08:00:00+07:00", respondedAt: status === "Invited" ? null : "2026-11-26T09:00:00+07:00", reason: null, confirmedBy: null, rowVersion: "r1", ...patch,
});
const roster = (people: object[], summary: Partial<{ requiredPeople: number | null; confirmed: number; invited: number; declined: number; external: number; missing: number; ready: boolean }> = {}, patch: object = {}) => ({
  planId: id(1), planCode: "KHT000001", rowVersion: "p1", rosterVersion: `v${Math.random()}`, requiredPeople: summary.requiredPeople ?? 5, canEdit: true, people,
  summary: { requiredPeople: 5, confirmed: 3, invited: 1, declined: 1, external: 0, missing: 2, ready: false, ...summary }, ...patch,
});
const ok = (data: unknown) => ({ status: "success", data });
const plan = (patch: object = {}) => ({ id: id(1), code: "KHT000001", statusId: 4202, plannedAt: "2099-01-01T06:00:00+07:00", rowVersion: "p1", ...patch }) as unknown as PlanView;
const owner = { owner: true, harvest: true } as PlanAccess;
const manager = { owner: false, harvest: true } as PlanAccess;
const renderSection = (access = owner, p = plan()) => render(<ToastProvider><PlanRosterSection plan={p} access={access} /></ToastProvider>);
const people = () => [row(1, "An Nguyễn", "Confirmed"), row(2, "Bình Thời Vụ", "Invited"), row(3, "Chi Lê", "Declined"), row(4, "Dũng Ngoài", "External", { hasAccount: true }), row(5, "Em Chủ Gọi", "ConfirmedManually", { reason: "Đã gọi điện", confirmedBy: "Chủ HTX" })];

// jsdom has no modal <dialog>: open and close it by the attribute.
beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value(this: HTMLDialogElement) { this.setAttribute("open", ""); } });
  Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value(this: HTMLDialogElement) { this.removeAttribute("open"); } });
});
afterAll(() => { Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal"); Reflect.deleteProperty(HTMLDialogElement.prototype, "close"); });
beforeEach(() => Object.values(state).forEach((mock) => mock.mockReset()));
afterEach(cleanup);

it("shows the number needed, the progress and each person with a state chip and the manual reason", async () => {
  state.roster.mockResolvedValue(ok(roster(people())));
  renderSection();
  expect(await screen.findByText("Đã xác nhận 3 / cần 5")).toBeTruthy();
  expect(screen.getByText("Thiếu 2 người").className).toContain("text-warning");
  const table = screen.getByRole("table", { name: "Nhân công của kế hoạch" });
  for (const label of ["Đã xác nhận", "Chờ xác nhận", "Từ chối", "Ngoài hệ thống", "Chủ xác nhận thay"]) expect(within(table).getByText(label)).toBeTruthy();
  expect(within(table).getByText("bởi Chủ HTX: Đã gọi điện")).toBeTruthy();
  expect(within(table).getAllByText("Thời vụ").length).toBeGreaterThan(0);
});

it("says Đủ người when enough, and Chưa nhập số người cần instead of a green tick without a number", async () => {
  state.roster.mockResolvedValue(ok(roster([row(1, "An", "Confirmed")], { requiredPeople: 1, confirmed: 1, invited: 0, declined: 0, missing: 0, ready: true }, { requiredPeople: 1 })));
  const first = renderSection();
  expect(await screen.findByText("Đủ người")).toBeTruthy();
  first.unmount();
  state.roster.mockResolvedValue(ok(roster([row(1, "An", "Confirmed")], { requiredPeople: null, confirmed: 1, invited: 0, declined: 0, missing: 0, ready: true }, { requiredPeople: null })));
  renderSection();
  expect((await screen.findAllByText("Chưa nhập số người cần")).length).toBeGreaterThan(0);
  expect(screen.queryByText("Đủ người")).toBeNull();
});

it("saves the number needed and shows the roster the API answers", async () => {
  const user = userEvent.setup();
  state.roster.mockResolvedValue(ok(roster(people())));
  state.setRequired.mockResolvedValue(ok(roster(people(), { requiredPeople: 8, missing: 5 }, { requiredPeople: 8 })));
  renderSection();
  await user.click(await screen.findByRole("button", { name: "Sửa" }));
  const input = screen.getByRole("spinbutton");
  await user.clear(input); await user.type(input, "8");
  await user.click(screen.getByRole("button", { name: "Lưu" }));
  await waitFor(() => expect(state.setRequired).toHaveBeenCalledWith(id(1), 8, "p1"));
  expect(await screen.findByText("Thiếu 5 người")).toBeTruthy();
});

it("will not confirm for someone without a reason, then sends the reason", async () => {
  const user = userEvent.setup();
  state.roster.mockResolvedValue(ok(roster([row(2, "Bình Thời Vụ", "Invited")])));
  state.confirmStaff.mockResolvedValue(ok(roster([row(2, "Bình Thời Vụ", "ConfirmedManually", { reason: "Gọi điện" })])));
  renderSection();
  await user.click(await screen.findByRole("button", { name: "Xác nhận thay" }));
  const dialog = await screen.findByRole("dialog");
  const agree = within(dialog).getByRole("button", { name: "Đồng ý" });
  expect((agree as HTMLButtonElement).disabled).toBe(true);
  await user.type(within(dialog).getByLabelText("Lý do"), "Gọi điện");
  await user.click(agree);
  await waitFor(() => expect(state.confirmStaff).toHaveBeenCalledWith(id(1), id(2), "Gọi điện"));
});

it("takes a person off after a confirmation", async () => {
  const user = userEvent.setup();
  state.roster.mockResolvedValue(ok(roster([row(2, "Bình", "Invited")])));
  state.removeStaff.mockResolvedValue(ok(roster([], { confirmed: 0, invited: 0, declined: 0 })));
  renderSection();
  await user.click(await screen.findByRole("button", { name: "Gỡ Bình" }));
  await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Đồng ý" }));
  await waitFor(() => expect(state.removeStaff).toHaveBeenCalledWith(id(1), id(2)));
});

it("adds an outside person and says an account was made, without printing the password", async () => {
  const user = userEvent.setup();
  state.roster.mockResolvedValue(ok(roster([])));
  state.addExternal.mockResolvedValue(ok({ roster: roster([row(7, "QA Test", "External")]), person: row(7, "QA Test", "External"), username: "qatest", fixedPassword: true, accountNote: null }));
  renderSection();
  await user.click(await screen.findByRole("button", { name: "Bổ sung nhân công" }));
  await user.type(screen.getByLabelText("Họ tên *"), "QA Test");
  await user.type(screen.getByLabelText("Số điện thoại *"), "0900000007");
  await user.click(screen.getByRole("button", { name: "Bổ sung" }));
  await waitFor(() => expect(state.addExternal).toHaveBeenCalledWith(id(1), { fullName: "QA Test", phoneNumber: "0900000007" }));
  expect(await screen.findByText(/Đã tạo tài khoản thời vụ cho QA Test\. Mật khẩu mặc định của hợp tác xã, họ phải đổi ở lần đăng nhập đầu\./)).toBeTruthy();
});

it("needs a name and a phone before sending, and a zone manager must tick that the owner agreed", async () => {
  const user = userEvent.setup();
  state.roster.mockResolvedValue(ok(roster([])));
  state.addExternal.mockResolvedValue(ok({ roster: roster([]), person: row(7, "X", "External"), username: null, fixedPassword: false, accountNote: "x" }));
  renderSection(manager);
  await user.click(await screen.findByRole("button", { name: "Bổ sung nhân công" }));
  await user.click(screen.getByRole("button", { name: "Bổ sung" }));
  expect(screen.getByText("Nhập họ tên.")).toBeTruthy();
  await user.type(screen.getByLabelText("Họ tên *"), "X");
  await user.type(screen.getByLabelText("Số điện thoại *"), "0900000008");
  await user.click(screen.getByRole("button", { name: "Bổ sung" }));
  expect(screen.getByText("Cần chủ đồng ý trước khi bổ sung người này.")).toBeTruthy();
  await user.click(screen.getByLabelText("Chủ đã đồng ý bổ sung người này"));
  await user.click(screen.getByRole("button", { name: "Bổ sung" }));
  await waitFor(() => expect(state.addExternal).toHaveBeenCalledWith(id(1), { fullName: "X", phoneNumber: "0900000008", ownerApproved: true }));
  expect(await screen.findByText(/chưa tạo được tài khoản/)).toBeTruthy();
});

it("offers to invite the named employee when the phone belongs to a working one", async () => {
  const user = userEvent.setup();
  state.roster.mockResolvedValue(ok(roster([])));
  state.addExternal.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG-LABOR-03", uncertain: false, problem: { existingId: id(60), message: "Số điện thoại này đã thuộc về Lê Văn Nam." } });
  renderSection();
  await user.click(await screen.findByRole("button", { name: "Bổ sung nhân công" }));
  await user.type(screen.getByLabelText("Họ tên *"), "Nam");
  await user.type(screen.getByLabelText("Số điện thoại *"), "0900000009");
  await user.click(screen.getByRole("button", { name: "Bổ sung" }));
  expect(await screen.findByText("Số điện thoại này đã thuộc về Lê Văn Nam.")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Mời nhân viên này" }));
  expect(await screen.findByText(`Chọn sẵn: ${id(60)}`)).toBeTruthy();
});

it("is read only once the plan is completed and does not poll", async () => {
  state.roster.mockResolvedValue(ok(roster(people())));
  renderSection(owner, plan({ statusId: 4204 }));
  expect(await screen.findByText("Kế hoạch đã xong nên danh sách này chỉ để xem.")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Mời nhân viên" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Xác nhận thay" })).toBeNull();
});
