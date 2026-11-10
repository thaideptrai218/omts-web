// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  payroll: { read: vi.fn(), write: vi.fn() }, workforce: { read: vi.fn(), write: vi.fn() }, subject: "CooperativeOwner",
}));
vi.mock("@/features/api-workspace/api-workspace-shell", () => ({ useApiWorkspace: () => ({ identity: { subjectType: state.subject }, permissions: { functionPermissions: [] } }) }));
vi.mock("@/features/operations/repository", () => ({ createOperationsRepository: (name: string) => name === "workforce" ? state.workforce : state.payroll }));
import { businessToday } from "@/features/operations/ui";
import { PayrollSettingsScreen } from "./payroll-settings-screen";

const periods = [{ start: "2026-12-26", end: "2027-01-25" }, { start: "2027-01-26", end: "2027-02-25" }];
const settings = { payPeriodStartDay: 26, automaticPayroll: false, nextPeriods: periods, rowVersion: "v1" };
const preview = { payPeriodStartDay: 26, automaticPayroll: false, nextPeriods: periods, message: "?", messageCode: "MSG-LABOR-36" };
const v1 = { effectiveFrom: "2026-01-01", breakStart: null, breakEnd: null, roundingUnit: "None" };
const v2 = { effectiveFrom: "2026-06-01", breakStart: "11:30:00", breakEnd: "12:30:00", roundingUnit: "Minutes15" };
const attendance = { current: v2, versions: [v1, v2], rowVersion: "a1" };
const today = businessToday();

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  state.subject = "CooperativeOwner";
  state.payroll.read.mockImplementation(async (action: string) => ({ status: "success", data: action === "settings" ? settings : preview }));
  state.payroll.write.mockResolvedValue({ status: "success", data: { settings: { ...settings, payPeriodStartDay: 10, rowVersion: "v2" }, message: "ok", messageCode: "MSG-LABOR-37" } });
  state.workforce.read.mockResolvedValue({ status: "success", data: attendance });
  const saved = { ...attendance, current: { ...v2, effectiveFrom: today, roundingUnit: "Minutes30" }, versions: [v1, v2, { ...v2, effectiveFrom: today, roundingUnit: "Minutes30" }], rowVersion: "a2" };
  state.workforce.write.mockResolvedValue({ status: "success", data: { settings: saved, message: "ok", messageCode: "MSG-LABOR-39" } });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const group = async (name: string) => within(await screen.findByRole("region", { name }));
const confirm = async () => { await userEvent.click(await screen.findByRole("button", { name: "Đồng ý" })); };
const saveOf = (region: ReturnType<typeof within>) => region.getByRole("button", { name: "Lưu" }) as HTMLButtonElement;

it("shows a compact title and both groups as rows with title, help and control", async () => {
  render(<PayrollSettingsScreen />);
  expect((await screen.findByRole("heading", { level: 1 })).textContent).toBe("Thiết lập kỳ lương");
  const period = await group("Kỳ lương");
  expect(period.getByText("Ngày tính lương")).toBeTruthy();
  expect(period.getByText("Kỳ lương bắt đầu từ ngày này mỗi tháng; kỳ gọi tên theo tháng kết thúc.")).toBeTruthy();
  expect((period.getByRole("combobox", { name: "Ngày tính lương" }) as HTMLSelectElement).value).toBe("26");
  expect(period.getByText("Hệ thống tự tạo bảng lương mới khi đến ngày bắt đầu kỳ.")).toBeTruthy();
  // AGENTS.md: no unfinished-feature copy on screen. That the job does not exist yet is recorded in SRS_CHANGE_LOG_HR (HR-B08).
  expect(period.queryByText(/Chưa có tác dụng/)).toBeNull();
  expect((period.getByRole("switch") as HTMLInputElement).checked).toBe(false);
  const work = await group("Cách tính giờ công");
  expect((work.getByLabelText("Nghỉ từ") as HTMLInputElement).value).toBe("11:30");
  expect((work.getByLabelText("Nghỉ đến") as HTMLInputElement).value).toBe("12:30");
  expect(work.getByText("Khoảng nghỉ trừ khỏi giờ công mỗi ngày.")).toBeTruthy();
  expect((work.getByRole("combobox", { name: "Làm tròn giờ công" }) as HTMLSelectElement).value).toBe("Minutes15");
  expect(work.getAllByRole("option").map((o) => o.textContent)).toContain("Không làm tròn");
  expect(work.getByRole("button", { name: /Áp dụng từ ngày:/ })).toBeTruthy();
  expect(screen.queryByText(/lương theo giờ làm việc/)).toBeNull();
});

it("previews the next periods and the history table lists earlier versions newest first", async () => {
  render(<PayrollSettingsScreen />);
  const next = await group("Kỳ lương kế tiếp");
  expect(await next.findByText("Kỳ kế tiếp")).toBeTruthy();
  expect(next.getByText("01/2027")).toBeTruthy();
  const history = await group("Lịch sử thiết lập chấm công");
  expect(history.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Hiệu lực", "Nghỉ từ", "Nghỉ đến", "Làm tròn"]);
  const rows = history.getAllByRole("row").slice(1).map((r) => r.textContent);
  expect(rows).toEqual(["01/06/202611:3012:3015 phút", "01/01/2026——Không làm tròn"]);
});

it("saves the pay period after the confirmation question, sending the row version", async () => {
  const user = userEvent.setup();
  render(<PayrollSettingsScreen />);
  const period = await group("Kỳ lương");
  await waitFor(() => expect(saveOf(period).disabled).toBe(true));
  await user.selectOptions(period.getByRole("combobox", { name: "Ngày tính lương" }), "10");
  await waitFor(() => expect(state.payroll.read).toHaveBeenCalledWith("preview", { startDay: "10", automaticPayroll: "false" }, expect.anything(), expect.anything()));
  await waitFor(() => expect(saveOf(period).disabled).toBe(false));
  await user.click(saveOf(period));
  await confirm();
  await waitFor(() => expect(state.payroll.write).toHaveBeenCalledWith("save", { payPeriodStartDay: 10, automaticPayroll: false, rowVersion: "v1" }, expect.anything()));
  expect(await screen.findByText("Đã lưu thiết lập kỳ lương.")).toBeTruthy();
  expect(state.workforce.write).not.toHaveBeenCalled();
});

it("discards the period draft with Bỏ qua", async () => {
  const user = userEvent.setup();
  render(<PayrollSettingsScreen />);
  const period = await group("Kỳ lương");
  await user.click(period.getByRole("switch"));
  await user.click(period.getByRole("button", { name: "Bỏ qua" }));
  expect((period.getByRole("switch") as HTMLInputElement).checked).toBe(false);
  expect(saveOf(period).disabled).toBe(true);
});

it("saves the attendance settings as a new version with the row version", async () => {
  const user = userEvent.setup();
  render(<PayrollSettingsScreen />);
  const work = await group("Cách tính giờ công");
  expect(saveOf(work).disabled).toBe(true);
  fireEvent.change(work.getByLabelText("Nghỉ từ"), { target: { value: "11:00" } });
  fireEvent.change(work.getByLabelText("Nghỉ đến"), { target: { value: "12:00" } });
  await user.selectOptions(work.getByRole("combobox", { name: "Làm tròn giờ công" }), "Minutes30");
  await user.click(saveOf(work));
  await confirm();
  await waitFor(() => expect(state.workforce.write).toHaveBeenCalledWith("settings",
    { breakStart: "11:00:00", breakEnd: "12:00:00", roundingUnit: "Minutes30", effectiveFrom: today, rowVersion: "a1" }, expect.anything()));
  expect(await screen.findByText("Đã lưu cách tính giờ công.")).toBeTruthy();
  const history = await group("Lịch sử thiết lập chấm công");
  expect(history.getAllByRole("row")).toHaveLength(4);
  expect(state.payroll.write).not.toHaveBeenCalled();
});

it("allows clearing both break times and sends nulls", async () => {
  const user = userEvent.setup();
  render(<PayrollSettingsScreen />);
  const work = await group("Cách tính giờ công");
  fireEvent.change(work.getByLabelText("Nghỉ từ"), { target: { value: "" } });
  fireEvent.change(work.getByLabelText("Nghỉ đến"), { target: { value: "" } });
  await user.click(saveOf(work));
  await confirm();
  await waitFor(() => expect(state.workforce.write).toHaveBeenCalledWith("settings", expect.objectContaining({ breakStart: null, breakEnd: null, roundingUnit: "Minutes15" }), expect.anything()));
});

it("blocks saving when only one break time is set or the end is not after the start", async () => {
  render(<PayrollSettingsScreen />);
  const work = await group("Cách tính giờ công");
  fireEvent.change(work.getByLabelText("Nghỉ đến"), { target: { value: "" } });
  expect(work.getByRole("alert").textContent).toContain("Nhập đủ giờ nghỉ từ và đến");
  expect(saveOf(work).disabled).toBe(true);
  fireEvent.change(work.getByLabelText("Nghỉ đến"), { target: { value: "11:00" } });
  expect(work.getByRole("alert").textContent).toContain("Giờ nghỉ đến phải sau giờ nghỉ từ");
  expect(saveOf(work).disabled).toBe(true);
  expect(state.workforce.write).not.toHaveBeenCalled();
});

it("keeps the period draft on a version conflict and offers to read the current settings", async () => {
  const user = userEvent.setup();
  state.payroll.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false });
  render(<PayrollSettingsScreen />);
  const period = await group("Kỳ lương");
  await user.click(period.getByRole("switch"));
  await waitFor(() => expect(saveOf(period).disabled).toBe(false));
  await user.click(saveOf(period));
  await confirm();
  expect((await period.findByText(/vừa được người khác thay đổi/)).closest("[role=alert]")).toBeTruthy();
  expect((period.getByRole("switch") as HTMLInputElement).checked).toBe(true);
  expect(period.getByRole("button", { name: "Đọc lại thiết lập hiện tại" })).toBeTruthy();
});

it("keeps the attendance draft on MSG06 and swaps the Lưu node for a typed reload button", async () => {
  const user = userEvent.setup();
  state.workforce.write.mockResolvedValue({ status: "error", httpStatus: 409, code: "MSG06", uncertain: false });
  render(<PayrollSettingsScreen />);
  const work = await group("Cách tính giờ công");
  await user.selectOptions(work.getByRole("combobox", { name: "Làm tròn giờ công" }), "Hour1");
  const oldSave = saveOf(work);
  expect(oldSave.type).toBe("button");
  await user.click(oldSave);
  await confirm();
  expect((await work.findByText(/vừa được người khác thay đổi/)).closest("[role=alert]")).toBeTruthy();
  expect((work.getByRole("combobox", { name: "Làm tròn giờ công" }) as HTMLSelectElement).value).toBe("Hour1");
  // Distinct keys: the old Lưu node is removed, never reused as the reload button.
  expect(oldSave.isConnected).toBe(false);
  const reload = work.getByRole("button", { name: "Đọc lại thiết lập hiện tại" }) as HTMLButtonElement;
  expect(reload.type).toBe("button");
  expect(reload).not.toBe(oldSave);
  state.workforce.read.mockResolvedValue({ status: "success", data: { ...attendance, rowVersion: "a9" } });
  await user.click(reload);
  expect(await work.findByText(/Đã đọc thiết lập hiện tại/)).toBeTruthy();
  expect(saveOf(work).isConnected).toBe(true);
  expect(saveOf(work).type).toBe("button");
});

it("shows a retry when the attendance settings cannot be read, leaving the period group usable", async () => {
  const user = userEvent.setup();
  state.workforce.read.mockResolvedValueOnce({ status: "error", httpStatus: 500, uncertain: false });
  render(<PayrollSettingsScreen />);
  await group("Kỳ lương");
  await user.click(await screen.findByRole("button", { name: "Thử lại" }));
  expect(await screen.findByRole("region", { name: "Cách tính giờ công" })).toBeTruthy();
});

it("tells anyone but the owner that the page is closed to them and requests nothing", async () => {
  state.subject = "Staff";
  render(<PayrollSettingsScreen />);
  expect((await screen.findByRole("alert")).textContent).toContain("Chỉ Chủ hợp tác xã");
  expect(state.payroll.read).not.toHaveBeenCalled();
  expect(state.workforce.read).not.toHaveBeenCalled();
});
